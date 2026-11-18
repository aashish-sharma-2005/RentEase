# Rajai-Gadda Rental Management

Existing MERN application for managing Rajai/Gadda customers, stock, rentals, returns, payments and reports. This update keeps the existing React + Vite frontend and Express + MongoDB backend; it does not replace the project.

## Technology
- Frontend: React 18, Vite, React Router
- Backend: Node.js (ES modules), Express
- Database: MongoDB / MongoDB Atlas
- Authentication: JWT + bcrypt

## Roles and access

### Admin
The single Admin account is bootstrapped from `backend/.env` on first startup. Admin can manage all business modules, create/disable users, manage inventory, rentals, returns, payments, reports, settings, backup and activity history.

### User
Users cannot self-register. Admin creates a separate username and password for each family member. A regular User can only add, view, search and edit customer contact records. All rental, stock, payment, finance, report, settings and user-management APIs are Admin-only.

The backend enforces these permissions. Hiding frontend navigation is not the security boundary.

## Setup

1. Install Node.js 18 or newer and MongoDB Atlas/local MongoDB.
2. Copy `backend/.env.example` to `backend/.env`.
3. Set `MONGODB_URI`, a long random `JWT_SECRET`, `CLIENT_ORIGIN`, `ADMIN_USERNAME` and `ADMIN_PASSWORD` (minimum 10 characters).
4. Install dependencies:

   ```bash
   npm run install:all
   ```

5. Start the backend:

   ```bash
   npm --prefix backend run dev
   ```

6. Start the frontend in another terminal:

   ```bash
   npm --prefix frontend run dev
   ```

7. Open `http://localhost:5173` and log in with the Admin credentials from `backend/.env`.

There is no public registration or setup screen. Do not put admin credentials in the frontend `.env` or React source.

## Existing database migration

On server startup, `backend/scripts/bootstrapAdmin.js` migrates the old roles:
- `owner` becomes `admin`; the existing owner account is aligned once with `ADMIN_NAME`, `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `.env`.
- `family` becomes `user`.
- Existing customers, rentals, returns, payments, stock and settings are not deleted.

After migration, the Admin password can be changed from Settings. Environment credentials are not reapplied to an already established Admin on every restart. Keep a safe backup before deploying changes to a live database.

## Rental and billing rules already supported
- Each additional issue of items creates a separate rental record; it does not overwrite the previous rental.
- Partial returns are stored as separate return records against the original rental.
- Each rental keeps the rates captured when it was created.
- The configured day-count rule and saved return-batch charges are in `backend/utils/billing.js`.
- Customer detail for Admin combines rental history, payments and outstanding balance.
- Payments are limited to the current outstanding amount; advance/customer-credit payments need a dedicated credit-ledger feature before they should be enabled.

## Tests

```bash
npm test
```

The included billing tests cover the existing day-count and partial-return billing rules.

## Backup

Use the Admin Settings page to download the in-app JSON backup. Store it outside the project and keep multiple copies. Restore replaces database collections; only run the restore script after making a separate current backup and checking the backup file.

## Current implementation scope

This update implements the security/permissions foundation, Admin user management, activity history screen, separate user customer-only access, customer-ledger summary, issue-date validation, rental-level payment balance validation and low-stock thresholds. The remaining roadmap items (expense/cashbook accounting, PDF/XLSX exports, advance reservations, WhatsApp provider integration, scheduled notifications, automatic backup and deployment hardening) should be implemented and tested in subsequent steps rather than represented as already completed.
