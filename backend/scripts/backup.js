// Usage: npm run backup   -> writes backups/backup-YYYY-MM-DD.json (all collections, including password hashes)
import 'dotenv/config';
import fs from 'fs';
import mongoose from 'mongoose';
import connectDB from '../config/connectDB.js';
import '../models/user.js'; import '../models/customer.js'; import '../models/inventory.js'; import '../models/rental.js';
import '../models/rentalReturn.js'; import '../models/payment.js'; import '../models/settings.js'; import '../models/stockHistory.js';
import '../models/counter.js'; import '../models/auditLog.js';

await connectDB();
const out = { exportedAt: new Date().toISOString(), collections: {} };
for (const [name, model] of Object.entries(mongoose.models)) out.collections[name] = await model.find().lean();
fs.mkdirSync('backups', { recursive: true });
const file = `backups/backup-${new Date().toISOString().slice(0, 10)}.json`;
fs.writeFileSync(file, JSON.stringify(out));
console.log('Backup written to', file);
await mongoose.disconnect();
