import Inventory from '../models/inventory.js';
import Rental from '../models/rental.js';
import Payment from '../models/payment.js';
import Customer from '../models/customer.js';
import { todayIST } from '../utils/dates.js';
import { billsForRentals, nonCancelledRentals } from '../utils/rentalService.js';

export async function dashboard(req, res) {
  const today = todayIST();
  const [inventory, activeRentals, todayRentals, todayPay, rentals, recentRentals, recentCustomers] = await Promise.all([
    Inventory.find().sort({ itemType: 1 }),
    Rental.countDocuments({ status: 'active' }),
    Rental.countDocuments({ issueDate: today, status: { $ne: 'cancelled' } }),
    Payment.aggregate([{ $match: { date: today, voided: false } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    nonCancelledRentals(),
    Rental.find().sort({ createdAt: -1 }).limit(6).populate('customer', 'name village').lean(),
    Customer.find().sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  const bills = await billsForRentals(rentals, today);
  let outstanding = 0;
  let outstandingCount = 0;
  const overdue = [];
  for (const r of rentals) {
    const b = bills.get(String(r._id));
    if (b.balance > 0) { outstanding += b.balance; outstandingCount += 1; }
    if (r.status === 'active' && r.expectedReturnDate && r.expectedReturnDate < today) overdue.push({ ...r, bill: b });
  }
  const custIds = overdue.map((r) => r.customer);
  const custs = await Customer.find({ _id: { $in: custIds } }).select('name mobile village').lean();
  const cmap = new Map(custs.map((c) => [String(c._id), c]));
  res.json({
    today,
    inventory: inventory.map((i) => ({ itemType: i.itemType, total: i.total, rented: i.rented, damaged: i.damaged, missing: i.missing, available: i.available })),
    activeRentals,
    todayRentals,
    todayCollected: todayPay[0]?.amount || 0,
    todayPayments: todayPay[0]?.count || 0,
    outstanding,
    outstandingCount,
    overdue: overdue.slice(0, 10).map((r) => ({ _id: r._id, refNo: r.refNo, expectedReturnDate: r.expectedReturnDate, customer: cmap.get(String(r.customer)), remaining: r.bill.remaining })),
    recentRentals: recentRentals.map((r) => ({ _id: r._id, refNo: r.refNo, issueDate: r.issueDate, status: r.status, issued: r.issued, customer: r.customer })),
    recentCustomers,
  });
}
