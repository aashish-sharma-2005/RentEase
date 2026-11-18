import Payment from '../models/payment.js';
import Rental from '../models/rental.js';
import RentalReturn from '../models/rentalReturn.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireDate, audit, escapeRegex } from '../utils/helpers.js';
import { todayIST } from '../utils/dates.js';
import { buildBill } from '../utils/billing.js';
import Customer from '../models/customer.js';

export async function addPayment(req, res) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) throw new HttpError(404, 'Rental not found.');
  if (rental.status === 'cancelled') throw new HttpError(400, 'This rental was cancelled.');
  const { idempotencyKey } = req.body;
  if (idempotencyKey) {
    const dup = await Payment.findOne({ idempotencyKey });
    if (dup) return res.status(200).json(dup);
  }
  let amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) throw new HttpError(400, 'Enter a payment amount greater than 0.');
  amount = Math.round(amount * 100) / 100;
  const date = requireDate(req.body.date || todayIST(), 'Payment date');
  if (date > todayIST()) throw new HttpError(400, 'Payment date cannot be in the future.');

  // Keep rental-level payments within the currently calculated balance. Advance payments
  // will be handled explicitly by a customer-credit ledger rather than creating negative dues.
  const [returns, payments] = await Promise.all([
    RentalReturn.find({ rental: rental._id }).lean(),
    Payment.find({ rental: rental._id }).lean(),
  ]);
  const bill = buildBill(rental, returns, payments, todayIST());
  if (bill.balance <= 0) throw new HttpError(400, 'This rental has no outstanding balance.');
  if (amount > bill.balance) throw new HttpError(400, `Amount is more than the balance due (₹${bill.balance.toFixed(2)}).`);
  try {
    const payment = await Payment.create({
      rental: rental._id, customer: rental.customer, amount, date,
      method: req.body.method || 'Cash', reference: req.body.reference, notes: req.body.notes,
      idempotencyKey: idempotencyKey || undefined, createdBy: req.user._id,
    });
    await audit('payment.create', req.user, 'Payment', payment._id, { rental: rental.refNo, amount });
    res.status(201).json(payment);
  } catch (e) {
    if (e.code === 11000 && idempotencyKey) return res.status(200).json(await Payment.findOne({ idempotencyKey }));
    throw e;
  }
}

export async function listPayments(req, res) {
  const { from, to, customer, q } = req.query;
  const filter = {};
  if (from || to) filter.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  if (customer) filter.customer = customer;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    const cust = await Customer.find({ name: rx }).select('_id').limit(100);
    const rentals = await Rental.find({ refNo: rx }).select('_id').limit(100);
    filter.$or = [{ customer: { $in: cust.map((c) => c._id) } }, { rental: { $in: rentals.map((r) => r._id) } }];
  }
  const payments = await Payment.find(filter).sort({ date: -1, createdAt: -1 }).limit(300)
    .populate('rental', 'refNo').populate('customer', 'name village').populate('createdBy', 'name').lean();
  res.json(payments);
}

// Owner only: payments are never deleted, only voided with a reason.
export async function voidPayment(req, res) {
  const reason = String(req.body.reason || '').trim();
  if (!reason) throw new HttpError(400, 'Please give a reason for voiding this payment.');
  const p = await Payment.findOneAndUpdate({ _id: req.params.id, voided: false }, { voided: true, voidReason: reason, voidedBy: req.user._id }, { new: true });
  if (!p) throw new HttpError(404, 'Payment not found or already voided.');
  await audit('payment.void', req.user, 'Payment', p._id, { reason, amount: p.amount });
  res.json(p);
}
