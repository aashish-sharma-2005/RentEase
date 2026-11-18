import Rental from '../models/rental.js';
import RentalReturn from '../models/rentalReturn.js';
import Payment from '../models/payment.js';
import Settings from '../models/settings.js';
import { buildBill } from './billing.js';

export async function getSettings(session) {
  let s = await Settings.findOne({ key: 'main' }).session(session || null);
  if (!s) [s] = await Settings.create([{ key: 'main' }], { session });
  return s;
}

// Compute bills for many rentals with two grouped queries.
// Returns Map<rentalId string, bill>
export async function billsForRentals(rentals, asOf) {
  const ids = rentals.map((r) => r._id);
  const [retSums, paySums] = await Promise.all([
    RentalReturn.aggregate([{ $match: { rental: { $in: ids } } }, { $group: { _id: '$rental', amount: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { rental: { $in: ids }, voided: false } }, { $group: { _id: '$rental', amount: { $sum: '$amount' } } }]),
  ]);
  const retMap = new Map(retSums.map((x) => [String(x._id), x.amount]));
  const payMap = new Map(paySums.map((x) => [String(x._id), x.amount]));
  const out = new Map();
  for (const r of rentals) {
    const o = r.toObject ? r.toObject() : r;
    const id = String(o._id);
    out.set(id, buildBill(o, [{ amount: retMap.get(id) || 0 }], [{ amount: payMap.get(id) || 0 }], asOf));
  }
  return out;
}

export async function nonCancelledRentals() {
  return Rental.find({ status: { $ne: 'cancelled' } }).lean();
}
