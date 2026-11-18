import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    itemType: { type: String, enum: ['rajai', 'gadda'], required: true, unique: true },
    total: { type: Number, default: 0, min: 0 },
    rented: { type: Number, default: 0, min: 0 },
    damaged: { type: Number, default: 0, min: 0 },
    missing: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Available = Total - Rented - Damaged - Missing
inventorySchema.virtual('available').get(function () {
  return this.total - this.rented - this.damaged - this.missing;
});
inventorySchema.virtual('lowStock').get(function () {
  return this.available <= this.lowStockThreshold;
});

export default mongoose.model('Inventory', inventorySchema);
