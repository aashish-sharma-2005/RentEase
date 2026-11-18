# Implementation status – 18 November 2026

This package is the first safe implementation increment on top of the uploaded source. It is not a claim that all seven roadmap phases are finished.

## Implemented in this increment

### Phase 1 – Security and permissions
- Public self-registration and first-run setup screen removed.
- Initial Admin is bootstrapped from backend environment variables.
- Existing `owner` account is migrated to `admin` once; existing `family` accounts migrate to `user`.
- Each user gets an independent username/password created by Admin.
- Regular users can access customer list/create/edit/detail only; customer detail for a regular user does not expose rental/payment/financial data.
- All other business API routes are protected by `requireAdmin` on the backend.
- Admin user management supports creating, disabling/enabling and password-resetting user accounts.
- Activity History page reads audit events. Existing rental/return/payment/inventory/customer/settings audit calls remain in place; login and password changes are also logged.

### Phase 2 – Rental system / customer ledger foundation
- Existing code already creates a new Rental document for every additional issue; it does not overwrite the old rental.
- Existing code already stores partial returns as separate RentalReturn documents linked to their original rental.
- Customer detail now returns total charges, total paid and combined outstanding amount across non-cancelled rentals.
- Future-dated issue dates are rejected until advance reservations are implemented.
- Payments cannot exceed the currently calculated outstanding balance. Advance/customer-credit payments are deliberately not enabled until a separate credit ledger exists.

### Phase 3 – Inventory foundation
- Existing inventory already tracks total, rented, damaged and missing quantities, with stock history and transactional stock changes.
- Added configurable low-stock thresholds and low-stock indicators.

## Not yet implemented

- Expenses and full cashbook / profit-and-loss accounting.
- PDF and Excel report exports.
- Advance booking/reservation model and future stock allocation.
- WhatsApp provider integration and scheduled reminders/notifications.
- Automatic scheduled backups and a full restore-validation workflow.
- Final live MongoDB integration, deployment and end-to-end mobile/browser testing.

## Validation performed
- All backend JavaScript files pass `node --check`.
- Existing backend billing tests: 6 passed, 0 failed.
- Updated frontend JSX files passed TypeScript's JSX parser check (`tsc --noEmit`); a full Vite production build was not run because dependency installation timed out in this environment.
- No live MongoDB connection or end-to-end browser session was available, so migration and authorization still need to be verified against a backed-up staging database before production use.

## Critical deployment note
Before deploying to an existing Atlas database, make a fresh backup. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `MONGODB_URI`, and `JWT_SECRET` in `backend/.env`. The legacy owner account is aligned with the environment credentials during the one-time role migration. An established admin password is not overwritten on later server restarts.
