import test from 'node:test';
import assert from 'node:assert/strict';
import { chargeableDays, chargeFor, buildBill, paymentStatus } from '../utils/billing.js';

test('date rule matches blueprint table', () => {
  assert.equal(chargeableDays('2026-11-18', '2026-11-18'), 1);
  assert.equal(chargeableDays('2026-11-18', '2026-11-19'), 1);
  assert.equal(chargeableDays('2026-11-18', '2026-11-20'), 3);
  assert.equal(chargeableDays('2026-11-18', '2026-11-21'), 4);
  assert.equal(chargeableDays('2026-11-18', '2026-11-22'), 5);
});

test('month and year boundaries', () => {
  assert.equal(chargeableDays('2026-11-30', '2026-12-02'), 3);
  assert.equal(chargeableDays('2026-12-31', '2027-01-01'), 1);
  assert.equal(chargeableDays('2028-02-28', '2028-03-01'), 3);
});

test('return before issue is rejected', () => {
  assert.throws(() => chargeableDays('2026-11-18', '2026-11-17'));
});

test('blueprint example: 5 Rajai + 5 Gadda, 18->20 Nov = 600', () => {
  const days = chargeableDays('2026-11-18', '2026-11-20');
  const c = chargeFor({ rajai: 5, gadda: 5 }, { rajai: 20, gadda: 20 }, days);
  assert.deepEqual(c, { rajaiAmount: 300, gaddaAmount: 300, total: 600 });
});

const rates = { rajai: 20, gadda: 20 };

test('partial returns on different dates are charged separately', () => {
  const rental = { issueDate: '2026-11-18', issued: { rajai: 10, gadda: 10 }, returned: { rajai: 5, gadda: 10 }, rates, status: 'active' };
  const returns = [{ amount: 300 }]; // 15 items, 1 day
  const bill = buildBill(rental, returns, [], '2026-11-22'); // 5 rajai out, 5 days
  assert.equal(bill.settledCharges, 300);
  assert.equal(bill.runningCharges, 500);
  assert.deepEqual(bill.remaining, { rajai: 5, gadda: 0 });
  assert.equal(bill.totalBill, 800);
});

test('multiple payments and status; voided payments ignored', () => {
  const rental = { issueDate: '2026-11-18', issued: { rajai: 5, gadda: 5 }, returned: { rajai: 5, gadda: 5 }, rates, status: 'completed' };
  const returns = [{ amount: 600 }];
  let b = buildBill(rental, returns, [{ amount: 400 }], '2026-11-25');
  assert.equal(b.balance, 200);
  assert.equal(b.paymentStatus, 'partial');
  b = buildBill(rental, returns, [{ amount: 400 }, { amount: 200 }, { amount: 50, voided: true }], '2026-11-25');
  assert.equal(b.balance, 0);
  assert.equal(b.paymentStatus, 'paid');
  assert.equal(paymentStatus(600, 0), 'unpaid');
});
