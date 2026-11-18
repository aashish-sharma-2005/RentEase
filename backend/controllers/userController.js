import bcrypt from 'bcryptjs';
import User from '../models/user.js';
import { HttpError } from '../middleware/errorHandler.js';
import { validatePassword, publicUser } from './authController.js';
import { audit } from '../utils/helpers.js';

export async function listUsers(req, res) {
  const users = await User.find().sort({ createdAt: 1 }).lean();
  res.json(users.map((u) => ({ id: u._id, name: u.name, username: u.username, role: u.role, active: u.active, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt })));
}

export async function createUser(req, res) {
  const { name, username, password } = req.body;
  if (!name?.trim() || !username?.trim()) throw new HttpError(400, 'Name and username are required.');
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username.trim())) throw new HttpError(400, 'Username must be 3–30 characters and use letters, numbers, dot, underscore or hyphen.');
  validatePassword(password);
  const user = await User.create({ name: name.trim(), username: username.trim().toLowerCase(), passwordHash: await bcrypt.hash(password, 12), role: 'user' });
  await audit('user.create', req.user, 'User', user._id, { username: user.username, role: user.role });
  res.status(201).json(publicUser(user));
}

export async function updateUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found.');
  if (user.role === 'admin') throw new HttpError(403, 'The environment-managed admin account cannot be edited here.');
  const { name, active, password } = req.body;
  if (name !== undefined) user.name = String(name).trim();
  if (active !== undefined) user.active = !!active;
  if (password) {
    validatePassword(password);
    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordChangedAt = new Date();
  }
  await user.save();
  await audit('user.update', req.user, 'User', user._id, { active: user.active, passwordReset: !!password });
  res.json({ ...publicUser(user), active: user.active });
}
