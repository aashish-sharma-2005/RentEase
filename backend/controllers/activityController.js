import AuditLog from '../models/auditLog.js';

export async function listActivity(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
  const rows = await AuditLog.find().sort({ createdAt: -1 }).limit(limit)
    .populate('user', 'name username role').lean();
  res.json(rows);
}
