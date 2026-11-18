import Customer from '../models/customer.js';
import Rental from '../models/rental.js';
import Payment from '../models/payment.js';
import { HttpError } from '../middleware/errorHandler.js';
import { escapeRegex, audit } from '../utils/helpers.js';
import { billsForRentals } from '../utils/rentalService.js';
import { todayIST } from '../utils/dates.js';

function clean(body) {
  const name = String(body.name || '').trim();
  if (!name) throw new HttpError(400, 'Customer name is required.');
  const mobile = String(body.mobile || '').replace(/[\s-]/g, '');
  if (mobile && !/^(\+91)?[6-9]\d{9}$/.test(mobile)) throw new HttpError(400, 'Enter a valid 10-digit mobile number.');
  return { name, mobile, village: String(body.village || '').trim(), address: String(body.address || '').trim(), notes: String(body.notes || '').trim() };
}

export async function listCustomers(req, res) {
  const q = String(req.query.q || '').trim();
  const filter = q
    ? { $or: ['name', 'mobile', 'village'].map((f) => ({ [f]: new RegExp(escapeRegex(q), 'i') })) }
    : {};
  const customers = await Customer.find(filter).sort({ name: 1 }).limit(300).lean();
  if (req.user.role !== 'admin') return res.json(customers);
  // Admin-only business summary fields. Regular users receive customer contact data only.
  const counts = await Rental.aggregate([{ $match: { customer: { $in: customers.map((c) => c._id) }, status: { $ne: 'cancelled' } } }, { $group: { _id: '$customer', n: { $sum: 1 } } }]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json(customers.map((c) => ({ ...c, rentalCount: map.get(String(c._id)) || 0 })));
}

export async function getCustomer(req, res) {
  const customer = await Customer.findById(req.params.id).lean();
  if (!customer) throw new HttpError(404, 'Customer not found.');
  if (req.user.role !== 'admin') return res.json({ customer });
  const rentals = await Rental.find({ customer: customer._id }).sort({ createdAt: -1 }).lean();
  const bills = await billsForRentals(rentals, todayIST());
  const rows = rentals.map((r) => ({ ...r, bill: bills.get(String(r._id)) }));
  const activeRows = rows.filter((r) => r.status !== 'cancelled');
  const outstanding = activeRows.reduce((s, r) => s + Math.max(r.bill.balance, 0), 0);
  const totalCharges = activeRows.reduce((s, r) => s + r.bill.totalBill, 0);
  const payments = await Payment.find({ customer: customer._id }).sort({ date: -1, createdAt: -1 }).populate('rental', 'refNo').lean();
  const totalPaid = payments.filter((p) => !p.voided).reduce((s, p) => s + p.amount, 0);
  res.json({ customer, rentals: rows, payments, ledger: { totalCharges, totalPaid, outstanding } });
}

export async function createCustomer(req, res) {
  const data = clean(req.body);
  if (data.mobile && !req.body.allowDuplicate) {
    const dup = await Customer.findOne({ mobile: data.mobile });
    if (dup) return res.status(409).json({ message: `A customer with this mobile already exists: ${dup.name}.`, existing: dup, duplicate: true });
  }
  const customer = await Customer.create({ ...data, createdBy: req.user._id });
  await audit('customer.create', req.user, 'Customer', customer._id, { name: customer.name });
  res.status(201).json(customer);
}

export async function updateCustomer(req, res) {
  const data = clean(req.body);
  const customer = await Customer.findByIdAndUpdate(req.params.id, { ...data, updatedBy: req.user._id }, { new: true, runValidators: true });
  if (!customer) throw new HttpError(404, 'Customer not found.');
  await audit('customer.update', req.user, 'Customer', customer._id, data);
  res.json(customer);
}
