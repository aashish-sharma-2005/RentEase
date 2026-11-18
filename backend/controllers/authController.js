import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import { HttpError } from '../middleware/errorHandler.js';
import { audit } from '../utils/helpers.js';

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
export const publicUser = (u) => ({ id: u._id, name: u.name, username: u.username, role: u.role });

export function validatePassword(p) {
  if (typeof p !== 'string' || p.length < 10) throw new HttpError(400, 'Password must be at least 10 characters.');
}

// There is deliberately no public registration/setup endpoint. The first admin is created by server bootstrap.
export async function login(req, res) {
  const { username, password } = req.body;
  const user = await User.findOne({ username: String(username || '').toLowerCase().trim() }).select('+passwordHash');
  const ok = user && user.active && (await bcrypt.compare(String(password || ''), user.passwordHash));
  if (!ok) throw new HttpError(401, 'Wrong username or password.');
  user.lastLoginAt = new Date();
  await user.save();
  await audit('auth.login', user, 'User', user._id, { username: user.username });
  res.json({ token: sign(user), user: publicUser(user) });
}

export async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(String(currentPassword || ''), user.passwordHash))) throw new HttpError(400, 'Current password is wrong.');
  validatePassword(newPassword);
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  await user.save();
  await audit('auth.password_change', user, 'User', user._id, {});
  res.json({ message: 'Password changed.' });
}
