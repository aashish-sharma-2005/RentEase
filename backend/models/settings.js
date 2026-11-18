import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    businessName: { type: String, default: 'Rajai-Gadda Rental' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    rates: { rajai: { type: Number, default: 20 }, gadda: { type: Number, default: 20 } },
    paymentMethods: { type: [String], default: ['Cash', 'UPI', 'Bank transfer'] },
    receiptFooter: { type: String, default: 'Thank you!' },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
