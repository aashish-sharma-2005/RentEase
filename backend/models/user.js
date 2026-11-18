import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    // Admin is bootstrapped from backend environment variables. All other accounts are regular users.
    role: { type: String, enum: ['admin', 'user'], default: 'user', index: true },
    active: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
