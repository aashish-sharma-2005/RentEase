import bcrypt from 'bcryptjs';
import User from '../models/user.js';

export async function bootstrapAdmin() {
  const username = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  const name = String(process.env.ADMIN_NAME || 'Administrator').trim();
  if (!username || !password) throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD in backend/.env before starting the server.');
  if (password.length < 10) throw new Error('ADMIN_PASSWORD must contain at least 10 characters.');

  // One-time migration from the previous owner/family role names.
  const legacyOwner = await User.findOne({ role: 'owner' }).select('+passwordHash');
  await User.updateMany({ role: 'family' }, { $set: { role: 'user' } });
  if (legacyOwner) {
    const collision = await User.findOne({ username, _id: { $ne: legacyOwner._id } });
    if (collision) throw new Error(`ADMIN_USERNAME "${username}" is already used by another account. Resolve the duplicate before startup.`);
    legacyOwner.name = name;
    legacyOwner.username = username;
    legacyOwner.passwordHash = await bcrypt.hash(password, 12);
    legacyOwner.passwordChangedAt = new Date();
    legacyOwner.role = 'admin';
    await legacyOwner.save();
    console.log(`Existing owner account migrated to Admin using ADMIN_USERNAME: ${username}`);
    return legacyOwner;
  }

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    // Do not silently reset an established admin password on every restart.
    if (existing.username !== username) console.warn(`Admin account already exists as "${existing.username}". Environment credentials are only used for first-time bootstrap.`);
    return existing;
  }

  const collision = await User.findOne({ username });
  if (collision) throw new Error(`ADMIN_USERNAME "${username}" is already used by a normal user. Change ADMIN_USERNAME or resolve the account before startup.`);
  const admin = await User.create({ name, username, passwordHash: await bcrypt.hash(password, 12), role: 'admin' });
  console.log(`Initial admin account created: ${username}`);
  return admin;
}
