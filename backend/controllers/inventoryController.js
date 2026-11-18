import mongoose from 'mongoose';
import Inventory from '../models/inventory.js';
import StockHistory from '../models/stockHistory.js';
import { HttpError } from '../middleware/errorHandler.js';
import { toInt, withTransaction, audit } from '../utils/helpers.js';

const AVAILABLE = { $subtract: ['$total', { $add: ['$rented', '$damaged', '$missing'] }] };

const ACTIONS = {
  add: (q) => ({ filter: {}, inc: { total: q } }),
  remove: (q) => ({ filter: { $expr: { $gte: [AVAILABLE, q] } }, inc: { total: -q } }),
  damaged: (q) => ({ filter: { $expr: { $gte: [AVAILABLE, q] } }, inc: { damaged: q } }),
  missing: (q) => ({ filter: { $expr: { $gte: [AVAILABLE, q] } }, inc: { missing: q } }),
  repaired: (q) => ({ filter: { damaged: { $gte: q } }, inc: { damaged: -q } }),
  found: (q) => ({ filter: { missing: { $gte: q } }, inc: { missing: -q } }),
};

export const snapshot = (inv) => ({ total: inv.total, rented: inv.rented, damaged: inv.damaged, missing: inv.missing, available: inv.available });

export async function listInventory(req, res) {
  res.json(await Inventory.find().sort({ itemType: 1 }));
}

export async function adjustInventory(req, res) {
  const key = req.params.id;
  const item = mongoose.isValidObjectId(key) ? await Inventory.findById(key) : await Inventory.findOne({ itemType: key });
  if (!item) throw new HttpError(404, 'Item not found.');
  const { action, reason } = req.body;
  if (!ACTIONS[action]) throw new HttpError(400, 'Unknown stock action.');
  const quantity = toInt(req.body.quantity, 'Quantity', { min: 1 });
  if (!String(reason || '').trim()) throw new HttpError(400, 'Please give a reason for this stock change.');
  const { filter, inc } = ACTIONS[action](quantity);

  const updated = await withTransaction(async (session) => {
    const inv = await Inventory.findOneAndUpdate({ _id: item._id, ...filter }, { $inc: inc }, { new: true, session });
    if (!inv) throw new HttpError(400, 'Not enough stock for this change (check available / damaged / missing counts).');
    await StockHistory.create([{ itemType: inv.itemType, kind: action, quantity, reason: reason.trim(), snapshot: snapshot(inv), createdBy: req.user._id }], { session });
    await audit('inventory.adjust', req.user, 'Inventory', inv._id, { action, quantity, reason }, session);
    return inv;
  });
  res.json(updated);
}


export async function updateLowStockThreshold(req, res) {
  const key = req.params.id;
  const item = mongoose.isValidObjectId(key) ? await Inventory.findById(key) : await Inventory.findOne({ itemType: key });
  if (!item) throw new HttpError(404, 'Item not found.');
  const threshold = toInt(req.body.lowStockThreshold, 'Low-stock threshold', { min: 0, max: 100000 });
  item.lowStockThreshold = threshold;
  await item.save();
  await audit('inventory.threshold.update', req.user, 'Inventory', item._id, { lowStockThreshold: threshold });
  res.json(item);
}

export async function stockHistory(req, res) {
  const filter = req.query.itemType ? { itemType: req.query.itemType } : {};
  res.json(await StockHistory.find(filter).sort({ createdAt: -1 }).limit(200).populate('createdBy', 'name').populate('rental', 'refNo'));
}
