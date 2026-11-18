import { dayDifference } from './dates.js';

// Business rule: difference <= 1 -> 1 day; otherwise difference + 1.
export function chargeableDays(issueDate, returnDate) {
  const diff = dayDifference(issueDate, returnDate);
  if (diff < 0) throw new Error('Return date cannot be before issue date');
  return diff <= 1 ? 1 : diff + 1;
}

export function chargeFor({ rajai = 0, gadda = 0 }, rates, days) {
  const rajaiAmount = rajai * rates.rajai * days;
  const gaddaAmount = gadda * rates.gadda * days;
  return { rajaiAmount, gaddaAmount, total: rajaiAmount + gaddaAmount };
}

export function paymentStatus(total, paid) {
  if (total === 0) return paid > 0 ? 'paid' : 'unpaid';
  if (paid <= 0) return 'unpaid';
  return paid >= total ? 'paid' : 'partial';
}

// Full bill for a rental. `returns` are saved return records (each already priced when saved).
// Items still with the customer are shown as a running (provisional) charge up to `asOf`.
export function buildBill(rental, returns, payments, asOf) {
  const settled = returns.reduce((s, r) => s + r.amount, 0);
  const remaining = {
    rajai: rental.issued.rajai - rental.returned.rajai,
    gadda: rental.issued.gadda - rental.returned.gadda,
  };
  let running = 0;
  let runningDays = 0;
  if ((remaining.rajai > 0 || remaining.gadda > 0) && rental.status !== 'cancelled') {
    const asOfEff = asOf < rental.issueDate ? rental.issueDate : asOf;
    runningDays = chargeableDays(rental.issueDate, asOfEff);
    running = chargeFor(remaining, rental.rates, runningDays).total;
  }
  const totalBill = settled + running;
  const paid = payments.filter((p) => !p.voided).reduce((s, p) => s + p.amount, 0);
  return {
    settledCharges: settled,
    runningCharges: running,
    runningDays,
    remaining,
    totalBill,
    totalPaid: paid,
    balance: totalBill - paid,
    paymentStatus: paymentStatus(totalBill, paid),
  };
}
