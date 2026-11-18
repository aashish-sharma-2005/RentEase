import Rental from '../models/rental.js';
import RentalReturn from '../models/rentalReturn.js';
import Payment from '../models/payment.js';
import Inventory from '../models/inventory.js';
import Customer from '../models/customer.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireDate } from '../utils/helpers.js';
import { todayIST } from '../utils/dates.js';
import { billsForRentals, nonCancelledRentals } from '../utils/rentalService.js';

const LEN = { day: 10, month: 7, year: 4 };

// "Charges earned" (by return date) and "payments received" (by payment date) are different numbers and are never combined.
export async function report(req, res) {
  const today = todayIST();
  const group = LEN[req.query.group] ? req.query.group : 'day';
  const from = req.query.from ? requireDate(req.query.from, 'From date') : `${today.slice(0, 7)}-01`;
  const to = req.query.to ? requireDate(req.query.to, 'To date') : today;
  if (from > to) throw new HttpError(400, 'From date must be before To date.');
  const len = LEN[group];
  const bucket = (field) => ({ $substrBytes: [field, 0, len] });

  const [earned, received, rentalsMade, topCust, items, rentals, inventory] = await Promise.all([
    RentalReturn.aggregate([
      { $match: { returnDate: { $gte: from, $lte: to } } },
      { $group: { _id: bucket('$returnDate'), amount: { $sum: '$amount' }, returns: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { date: { $gte: from, $lte: to }, voided: false } },
      { $group: { _id: bucket('$date'), amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Rental.aggregate([
      { $match: { issueDate: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } } },
      { $group: { _id: bucket('$issueDate'), count: { $sum: 1 }, rajai: { $sum: '$issued.rajai' }, gadda: { $sum: '$issued.gadda' } } },
    ]),
    Rental.aggregate([
      { $match: { issueDate: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$customer', rentals: { $sum: 1 }, items: { $sum: { $add: ['$issued.rajai', '$issued.gadda'] } } } },
      { $sort: { rentals: -1, items: -1 } },
      { $limit: 10 },
    ]),
    Rental.aggregate([
      { $match: { issueDate: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, rajai: { $sum: '$issued.rajai' }, gadda: { $sum: '$issued.gadda' } } },
    ]),
    nonCancelledRentals(),
    Inventory.find(),
  ]);

  const periods = new Map();
  const touch = (k) => { if (!periods.has(k)) periods.set(k, { period: k, rentals: 0, chargesEarned: 0, paymentsReceived: 0 }); return periods.get(k); };
  earned.forEach((e) => { touch(e._id).chargesEarned = e.amount; });
  received.forEach((e) => { touch(e._id).paymentsReceived = e.amount; });
  rentalsMade.forEach((e) => { touch(e._id).rentals = e.count; });

  const names = await Customer.find({ _id: { $in: topCust.map((c) => c._id) } }).select('name village').lean();
  const nmap = new Map(names.map((n) => [String(n._id), n]));

  const bills = await billsForRentals(rentals, today);
  let outstanding = 0;
  const owing = [];
  const counts = { active: 0, completed: 0, overdue: 0 };
  for (const r of rentals) {
    const b = bills.get(String(r._id));
    counts[r.status] += 1;
    if (r.status === 'active' && r.expectedReturnDate && r.expectedReturnDate < today) counts.overdue += 1;
    if (b.balance > 0) { outstanding += b.balance; owing.push({ rentalId: r._id, refNo: r.refNo, customer: r.customer, balance: b.balance }); }
  }
  owing.sort((a, b) => b.balance - a.balance);
  const top = owing.slice(0, 15);
  const on = await Customer.find({ _id: { $in: top.map((o) => o.customer) } }).select('name village mobile').lean();
  const omap = new Map(on.map((n) => [String(n._id), n]));

  const rows = [...periods.values()].sort((a, b) => (a.period < b.period ? 1 : -1));
  res.json({
    from, to, group,
    rows,
    totals: {
      chargesEarned: rows.reduce((s, r) => s + r.chargesEarned, 0),
      paymentsReceived: rows.reduce((s, r) => s + r.paymentsReceived, 0),
      rentals: rows.reduce((s, r) => s + r.rentals, 0),
    },
    topCustomers: topCust.map((c) => ({ customer: nmap.get(String(c._id)), rentals: c.rentals, items: c.items })),
    itemsIssued: { rajai: items[0]?.rajai || 0, gadda: items[0]?.gadda || 0 },
    outstanding,
    owing: top.map((o) => ({ ...o, customer: omap.get(String(o.customer)) })),
    rentalCounts: counts,
    stock: inventory.map((i) => ({ itemType: i.itemType, total: i.total, rented: i.rented, damaged: i.damaged, missing: i.missing, available: i.available })),
  });
}
