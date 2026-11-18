import mongoose from 'mongoose';

const qty = { rajai: { type: Number, default: 0, min: 0 }, gadda: { type: Number, default: 0, min: 0 } };

const rentalSchema = new mongoose.Schema(
  {
    refNo: { type: String, unique: true, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    issueDate: { type: String, required: true, index: true }, // YYYY-MM-DD
    expectedReturnDate: { type: String }, // optional, used for overdue alerts
    issued: qty,
    returned: qty,
    rates: { rajai: { type: Number, required: true }, gadda: { type: Number, required: true } }, // captured at creation
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active', index: true },
    notes: String,
    cancelReason: String,
    idempotencyKey: { type: String, unique: true, sparse: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Rental', rentalSchema);
