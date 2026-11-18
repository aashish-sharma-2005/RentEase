import mongoose from 'mongoose';
import { HttpError } from '../middleware/errorHandler.js';
import { isValidDateStr } from './dates.js';
import AuditLog from '../models/auditLog.js';

export function toInt(v, name, { min = 0, max = 100000 } = {}) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${name} must be a whole number between ${min} and ${max}.`);
  return n;
}

export function requireDate(v, name) {
  if (!isValidDateStr(v)) throw new HttpError(400, `${name} must be a valid date (YYYY-MM-DD).`);
  return v;
}

export function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function audit(action, user, entity, entityId, detail, session) {
  return AuditLog.create([{ action, user: user?._id, entity, entityId: String(entityId || ''), detail }], { session });
}

// Run fn inside a MongoDB transaction (Atlas supports this). The whole operation succeeds or none of it does.
export async function withTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    session.endSession();
  }
}
