import mongoose from 'mongoose';

const rentalReturnSchema = new mongoose.Schema(
  {
    rental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true, index: true },
    returnDate: { type: String, required: true, index: true }, // YYYY-MM-DD
    rajai: { type: Number, default: 0, min: 0 },
    gadda: { type: Number, default: 0, min: 0 },
    // Damage / loss found at return (these are removed from available stock)
    damagedRajai: { type: Number, default: 0, min: 0 },
    damagedGadda: { type: Number, default: 0, min: 0 },
    chargeableDays: { type: Number, required: true },
    amount: { type: Number, required: true }, // charge for this batch, fixed when saved
    note: String,
    idempotencyKey: { type: String, unique: true, sparse: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('RentalReturn', rentalReturnSchema);
