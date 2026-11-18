import mongoose from 'mongoose';

const stockHistorySchema = new mongoose.Schema(
  {
    itemType: { type: String, enum: ['rajai', 'gadda'], required: true, index: true },
    kind: { type: String, enum: ['opening', 'add', 'remove', 'damaged', 'missing', 'repaired', 'found', 'rental', 'return'], required: true },
    quantity: { type: Number, required: true }, // positive number of items affected
    reason: String,
    rental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental' },
    snapshot: { total: Number, rented: Number, damaged: Number, missing: Number, available: Number },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('StockHistory', stockHistorySchema);
