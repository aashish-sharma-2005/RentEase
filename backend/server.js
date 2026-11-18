import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './config/connectDB.js';
import routes from './routes/index.js';
import Inventory from './models/inventory.js';
import { getSettings } from './utils/rentalService.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { bootstrapAdmin } from './scripts/bootstrapAdmin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1); // behind Render/Vercel proxy (needed for rate limiting)
app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean) || true }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', routes);
app.use('/api', notFound);

// Optional: serve the built React app from this same server (single-service deploy)
const dist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use(errorHandler);

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 5) throw new Error('Set a long JWT_SECRET (5+ characters) in .env');
  await connectDB();
  await bootstrapAdmin();
  for (const itemType of ['rajai', 'gadda']) await Inventory.updateOne({ itemType }, { $setOnInsert: { itemType } }, { upsert: true });
  await getSettings();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Rajai-Gadda API running on port ${port}`));
}

start().catch((e) => {
  console.error('Failed to start:', e.message);
  process.exit(1);
});
