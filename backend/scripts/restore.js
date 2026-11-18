// Usage: npm run restore -- backups/backup-2026-11-18.json
// WARNING: replaces ALL data in the database with the contents of the backup file.
import 'dotenv/config';
import fs from 'fs';
import readline from 'readline';
import mongoose from 'mongoose';
import connectDB from '../config/connectDB.js';
import '../models/user.js'; import '../models/customer.js'; import '../models/inventory.js'; import '../models/rental.js';
import '../models/rentalReturn.js'; import '../models/payment.js'; import '../models/settings.js'; import '../models/stockHistory.js';
import '../models/counter.js'; import '../models/auditLog.js';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error('Give the backup file path: npm run restore -- backups/backup-DATE.json'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (data.collections.User?.some((u) => !u.passwordHash)) { console.error('This file came from the in-app export (no passwords). Use a file made by "npm run backup" to restore.'); process.exit(1); }

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('This will ERASE current data and restore the backup. Type RESTORE to continue: ', async (ans) => {
  rl.close();
  if (ans !== 'RESTORE') { console.log('Cancelled.'); process.exit(0); }
  await connectDB();
  for (const [name, docs] of Object.entries(data.collections)) {
    const model = mongoose.models[name];
    if (!model) continue;
    await model.deleteMany({});
    if (docs.length) await model.collection.insertMany(docs.map(revive));
    console.log(`Restored ${name}: ${docs.length}`);
  }
  await mongoose.disconnect();
});

// JSON turns ObjectIds/Dates into strings; convert known reference fields and timestamps back.
function revive(d) {
  if (typeof d._id === 'string' && /^[0-9a-f]{24}$/.test(d._id)) d._id = new mongoose.Types.ObjectId(d._id);
  const refs = ['customer', 'rental', 'createdBy', 'updatedBy', 'user', 'voidedBy'];
  for (const k of refs) if (typeof d[k] === 'string' && /^[0-9a-f]{24}$/.test(d[k])) d[k] = new mongoose.Types.ObjectId(d[k]);
  for (const k of ['createdAt', 'updatedAt']) if (typeof d[k] === 'string') d[k] = new Date(d[k]);
  return d;
}
