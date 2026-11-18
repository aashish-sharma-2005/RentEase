import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    rental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    method: { type: String, default: 'Cash' },
    reference: String,
    notes: String,
    // Payments are never deleted; a mistaken one is voided (kept for audit)
    voided: { type: Boolean, default: false },
    voidReason: String,
    voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    idempotencyKey: { type: String, unique: true, sparse: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
