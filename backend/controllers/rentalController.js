import mongoose from 'mongoose';
import Rental from '../models/rental.js';
import Customer from '../models/customer.js';
import Inventory from '../models/inventory.js';
import StockHistory from '../models/stockHistory.js';
import RentalReturn from '../models/rentalReturn.js';
import Payment from '../models/payment.js';
import { nextSeq } from '../models/counter.js';
import { HttpError } from '../middleware/errorHandler.js';
import { toInt, requireDate, escapeRegex, withTransaction, audit } from '../utils/helpers.js';
import { todayIST } from '../utils/dates.js';
import { chargeableDays, chargeFor, buildBill } from '../utils/billing.js';
import { getSettings, billsForRentals } from '../utils/rentalService.js';
import { snapshot } from './inventoryController.js';

const AVAILABLE = { $subtract: ['$total', { $add: ['$rented', '$damaged', '$missing'] }] };
const LABEL = { rajai: 'Rajai', gadda: 'Gadda' };

export async function listRentals(req, res) {
  const { status, customer, q, owing } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (customer) filter.customer = customer;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    const cust = await Customer.find({ $or: [{ name: rx }, { mobile: rx }, { village: rx }] }).select('_id').limit(100);
    filter.$or = [{ refNo: rx }, { customer: { $in: cust.map((c) => c._id) } }];
  }
  if (owing) filter.status = { $ne: 'cancelled' };
  // Active and owing lists are never cut off: money owed / items out must always stay visible.
  const limit = status === 'active' || owing ? 0 : 300;
  let rentals = await Rental.find(filter).sort({ createdAt: -1 }).limit(limit).populate('customer', 'name mobile village').lean();
  const today = todayIST();
  const bills = await billsForRentals(rentals, today);
  if (owing) rentals = rentals.filter((r) => bills.get(String(r._id)).balance > 0);
  res.json(rentals.map((r) => ({ ...r, bill: bills.get(String(r._id)), overdue: r.status === 'active' && !!r.expectedReturnDate && r.expectedReturnDate < today })));
}

export async function createRental(req, res) {
  const { customerId, issueDate, expectedReturnDate, notes, idempotencyKey } = req.body;
  const qty = { rajai: toInt(req.body.rajai ?? 0, 'Rajai quantity'), gadda: toInt(req.body.gadda ?? 0, 'Gadda quantity') };
  if (qty.rajai + qty.gadda === 0) throw new HttpError(400, 'Enter at least one Rajai or Gadda.');
  requireDate(issueDate, 'Issue date');
  if (issueDate > todayIST()) throw new HttpError(400, 'Issue date cannot be in the future. Use Advance Booking when that feature is enabled.');
  if (expectedReturnDate) {
    requireDate(expectedReturnDate, 'Expected return date');
    if (expectedReturnDate < issueDate) throw new HttpError(400, 'Expected return date cannot be before the issue date.');
  }
  if (!(await Customer.exists({ _id: customerId }))) throw new HttpError(404, 'Customer not found.');

  const existing = idempotencyKey && (await Rental.findOne({ idempotencyKey }));
  if (existing) return res.status(200).json(existing);

  try {
    const rental = await withTransaction(async (session) => {
      const settings = await getSettings(session);
      const year = issueDate.slice(0, 4);
      const seq = await nextSeq(`rental-${year}`, session);
      const refNo = `RG-${year}-${String(seq).padStart(4, '0')}`;
      const rentalId = new mongoose.Types.ObjectId();
      for (const type of ['rajai', 'gadda']) {
        const q = qty[type];
        if (!q) continue;
        const inv = await Inventory.findOneAndUpdate({ itemType: type, $expr: { $gte: [AVAILABLE, q] } }, { $inc: { rented: q } }, { new: true, session });
        if (!inv) {
          const cur = await Inventory.findOne({ itemType: type }).session(session);
          throw new HttpError(400, `Not enough ${LABEL[type]} available. Only ${cur ? cur.available : 0} in stock.`);
        }
        await StockHistory.create([{ itemType: type, kind: 'rental', quantity: q, reason: `Issued on rental ${refNo}`, rental: rentalId, snapshot: snapshot(inv), createdBy: req.user._id }], { session });
      }
      const [doc] = await Rental.create(
        [{
          _id: rentalId,
          refNo,
          customer: customerId,
          issueDate,
          expectedReturnDate: expectedReturnDate || undefined,
          issued: qty,
          returned: { rajai: 0, gadda: 0 },
          rates: { rajai: settings.rates.rajai, gadda: settings.rates.gadda },
          notes,
          idempotencyKey: idempotencyKey || undefined,
          createdBy: req.user._id,
        }],
        { session }
      );
      await audit('rental.create', req.user, 'Rental', doc._id, { refNo: doc.refNo, qty }, session);
      return doc;
    });
    res.status(201).json(rental);
  } catch (e) {
    if (e.code === 11000 && idempotencyKey) {
      const dup = await Rental.findOne({ idempotencyKey });
      if (dup) return res.status(200).json(dup);
    }
    throw e;
  }
}

export async function getRental(req, res) {
  const rental = await Rental.findById(req.params.id).populate('customer').populate('createdBy', 'name').lean();
  if (!rental) throw new HttpError(404, 'Rental not found.');
  const [returns, payments, settings] = await Promise.all([
    RentalReturn.find({ rental: rental._id }).sort({ returnDate: 1, createdAt: 1 }).populate('createdBy', 'name').lean(),
    Payment.find({ rental: rental._id }).sort({ date: 1, createdAt: 1 }).populate('createdBy', 'name').lean(),
    getSettings(),
  ]);
  const today = todayIST();
  const bill = buildBill(rental, returns, payments, today);
  res.json({ rental, returns, payments, bill, business: { name: settings.businessName, phone: settings.phone, address: settings.address, footer: settings.receiptFooter }, today });
}

function parseReturn(req, rental) {
  const rajai = toInt(req.body.rajai ?? 0, 'Rajai returned');
  const gadda = toInt(req.body.gadda ?? 0, 'Gadda returned');
  const damagedRajai = toInt(req.body.damagedRajai ?? 0, 'Damaged Rajai');
  const damagedGadda = toInt(req.body.damagedGadda ?? 0, 'Damaged Gadda');
  if (rajai + gadda === 0) throw new HttpError(400, 'Enter how many items were returned.');
  if (damagedRajai > rajai || damagedGadda > gadda) throw new HttpError(400, 'Damaged count cannot be more than the returned count.');
  const returnDate = requireDate(req.body.returnDate, 'Return date');
  if (returnDate < rental.issueDate) throw new HttpError(400, 'Return date cannot be before the issue date.');
  if (returnDate > todayIST()) throw new HttpError(400, 'Return date cannot be in the future.');
  const days = chargeableDays(rental.issueDate, returnDate);
  const charge = chargeFor({ rajai, gadda }, rental.rates, days);
  return { rajai, gadda, damagedRajai, damagedGadda, returnDate, days, charge };
}

export async function previewReturn(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) throw new HttpError(404, 'Rental not found.');
  const p = parseReturn(req, rental);
  res.json({ chargeableDays: p.days, ...p.charge });
}

export async function addReturn(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) throw new HttpError(404, 'Rental not found.');
  if (rental.status !== 'active') throw new HttpError(400, 'This rental is already closed or cancelled.');
  const idempotencyKey = req.body.idempotencyKey;
  if (idempotencyKey) {
    const dup = await RentalReturn.findOne({ idempotencyKey });
    if (dup) return res.status(200).json(dup);
  }
  const p = parseReturn(req, rental);

  try {
    const saved = await withTransaction(async (session) => {
      const upd = await Rental.findOneAndUpdate(
        {
          _id: rental._id,
          status: 'active',
          $expr: { $and: [{ $lte: [{ $add: ['$returned.rajai', p.rajai] }, '$issued.rajai'] }, { $lte: [{ $add: ['$returned.gadda', p.gadda] }, '$issued.gadda'] }] },
        },
        { $inc: { 'returned.rajai': p.rajai, 'returned.gadda': p.gadda } },
        { new: true, session }
      );
      if (!upd) throw new HttpError(400, 'You entered more than the customer still has. Check the remaining quantities.');

      const [ret] = await RentalReturn.create(
        [{
          rental: rental._id, returnDate: p.returnDate, rajai: p.rajai, gadda: p.gadda,
          damagedRajai: p.damagedRajai, damagedGadda: p.damagedGadda,
          chargeableDays: p.days, amount: p.charge.total, note: req.body.note, idempotencyKey: idempotencyKey || undefined, createdBy: req.user._id,
        }],
        { session }
      );

      for (const [type, q, d] of [['rajai', p.rajai, p.damagedRajai], ['gadda', p.gadda, p.damagedGadda]]) {
        if (!q) continue;
        const inv = await Inventory.findOneAndUpdate({ itemType: type, rented: { $gte: q } }, { $inc: { rented: -q, damaged: d } }, { new: true, session });
        if (!inv) throw new HttpError(500, 'Stock records are out of sync. Please contact the owner.');
        await StockHistory.create([{ itemType: type, kind: 'return', quantity: q, reason: `Returned from ${rental.refNo}${d ? ` (${d} damaged)` : ''}`, rental: rental._id, snapshot: snapshot(inv), createdBy: req.user._id }], { session });
      }

      if (upd.returned.rajai === upd.issued.rajai && upd.returned.gadda === upd.issued.gadda) {
        await Rental.updateOne({ _id: rental._id }, { status: 'completed' }, { session });
      }
      await audit('rental.return', req.user, 'Rental', rental._id, { rajai: p.rajai, gadda: p.gadda, damaged: [p.damagedRajai, p.damagedGadda], amount: p.charge.total }, session);
      return ret;
    });
    res.status(201).json(saved);
  } catch (e) {
    if (e.code === 11000 && idempotencyKey) {
      const dup = await RentalReturn.findOne({ idempotencyKey });
      if (dup) return res.status(200).json(dup);
    }
    throw e;
  }
}

// Owner only. A rental can be cancelled only if nothing was returned and no payment is recorded.
export async function cancelRental(req, res) {
  const reason = String(req.body.reason || '').trim();
  if (!reason) throw new HttpError(400, 'Please give a reason for cancelling.');
  const rental = await Rental.findById(req.params.id);
  if (!rental) throw new HttpError(404, 'Rental not found.');
  if (rental.status !== 'active') throw new HttpError(400, 'Only an active rental can be cancelled.');
  if (rental.returned.rajai + rental.returned.gadda > 0) throw new HttpError(400, 'Items were already returned on this rental, so it cannot be cancelled.');
  if (await Payment.exists({ rental: rental._id, voided: false })) throw new HttpError(400, 'Void the payments on this rental first.');
  await withTransaction(async (session) => {
    for (const type of ['rajai', 'gadda']) {
      const q = rental.issued[type];
      if (!q) continue;
      const inv = await Inventory.findOneAndUpdate({ itemType: type, rented: { $gte: q } }, { $inc: { rented: -q } }, { new: true, session });
      if (!inv) throw new HttpError(500, 'Stock records are out of sync.');
      await StockHistory.create([{ itemType: type, kind: 'return', quantity: q, reason: `Cancelled ${rental.refNo}: ${reason}`, rental: rental._id, snapshot: snapshot(inv), createdBy: req.user._id }], { session });
    }
    await Rental.updateOne({ _id: rental._id, status: 'active' }, { status: 'cancelled', cancelReason: reason }, { session });
    await audit('rental.cancel', req.user, 'Rental', rental._id, { reason }, session);
  });
  res.json({ message: 'Rental cancelled.' });
}
