import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler as h } from '../middleware/errorHandler.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as users from '../controllers/userController.js';
import { listActivity } from '../controllers/activityController.js';
import * as customers from '../controllers/customerController.js';
import * as inventory from '../controllers/inventoryController.js';
import * as rentals from '../controllers/rentalController.js';
import * as payments from '../controllers/paymentController.js';
import { dashboard } from '../controllers/dashboardController.js';
import { report } from '../controllers/reportController.js';
import * as settings from '../controllers/settingsController.js';

const r = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Try again in 15 minutes.' } });

r.get('/health', (req, res) => res.json({ ok: true }));
r.post('/auth/login', loginLimiter, h(auth.login));

r.use(requireAuth);
r.get('/auth/me', h(auth.me));
r.post('/auth/change-password', h(auth.changePassword));

// Both roles may manage customer records. A regular user has no other business permissions.
r.get('/customers', h(customers.listCustomers));
r.post('/customers', h(customers.createCustomer));
r.get('/customers/:id', h(customers.getCustomer));
r.put('/customers/:id', h(customers.updateCustomer));

// Every other business module is admin-only at the API layer, not merely hidden in the UI.
r.use(requireAdmin);
r.get('/users', h(users.listUsers));
r.post('/users', h(users.createUser));
r.put('/users/:id', h(users.updateUser));
r.get('/activity', h(listActivity));

r.get('/inventory', h(inventory.listInventory));
r.get('/inventory/history', h(inventory.stockHistory));
r.put('/inventory/:id', h(inventory.adjustInventory));
r.put('/inventory/:id/threshold', h(inventory.updateLowStockThreshold));

r.get('/rentals', h(rentals.listRentals));
r.post('/rentals', h(rentals.createRental));
r.get('/rentals/:id', h(rentals.getRental));
r.post('/rentals/:id/returns/preview', h(rentals.previewReturn));
r.post('/rentals/:id/returns', h(rentals.addReturn));
r.post('/rentals/:id/payments', h(payments.addPayment));
r.post('/rentals/:id/cancel', h(rentals.cancelRental));

r.get('/payments', h(payments.listPayments));
r.post('/payments/:id/void', h(payments.voidPayment));
r.get('/dashboard', h(dashboard));
r.get('/reports', h(report));
r.get('/settings', h(settings.getSettingsApi));
r.put('/settings', h(settings.updateSettings));
r.get('/settings/backup', h(settings.backup));

export default r;
