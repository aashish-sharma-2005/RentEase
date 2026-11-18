import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },
    entity: String,
    entityId: String,
    detail: mongoose.Schema.Types.Mixed,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('AuditLog', auditSchema);
