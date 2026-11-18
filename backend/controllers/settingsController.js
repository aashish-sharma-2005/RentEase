import mongoose from 'mongoose';
import { getSettings } from '../utils/rentalService.js';
import { HttpError } from '../middleware/errorHandler.js';
import { audit } from '../utils/helpers.js';

export async function getSettingsApi(req, res) {
  res.json(await getSettings());
}

export async function updateSettings(req, res) {
  const s = await getSettings();
  const { businessName, phone, address, rates, paymentMethods, receiptFooter } = req.body;
  if (businessName !== undefined) s.businessName = String(businessName).trim() || s.businessName;
  if (phone !== undefined) s.phone = phone;
  if (address !== undefined) s.address = address;
  if (receiptFooter !== undefined) s.receiptFooter = receiptFooter;
  if (rates) {
    for (const k of ['rajai', 'gadda']) {
      if (rates[k] === undefined) continue;
      const n = Number(rates[k]);
      if (!Number.isFinite(n) || n < 0 || n > 100000) throw new HttpError(400, `Invalid ${k} rate.`);
      s.rates[k] = n; // only affects NEW rentals; old rentals keep the rate captured at creation
    }
  }
  if (Array.isArray(paymentMethods)) s.paymentMethods = paymentMethods.map((m) => String(m).trim()).filter(Boolean);
  await s.save();
  await audit('settings.update', req.user, 'Settings', s._id, { rates: s.rates });
  res.json(s);
}

// Owner-only full export of every collection (password hashes excluded).
export async function backup(req, res) {
  const out = { exportedAt: new Date().toISOString(), collections: {} };
  for (const [name, model] of Object.entries(mongoose.models)) {
    const q = model.find().lean();
    if (name === 'User') q.select('-passwordHash');
    out.collections[name] = await q;
  }
  await audit('backup.export', req.user, 'System', '', {});
  res.setHeader('Content-Disposition', `attachment; filename="rajai-gadda-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(out);
}
