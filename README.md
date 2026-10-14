# WalangBrownout Inventory OS

Real-time inventory management for WalangBrownout Appliances. *Walang Kulang, Walang Sobra.*

Built with **Laravel + Inertia.js + React (TypeScript) + MySQL**, running in **Docker Compose**.

> **Course:** _[course code / name]_  
> **Instructor:** _[professor]_  
> **Team:** _[member names]_

## Repository layout

```
WalangBrownout/
├── wb-inventory-backend/   # The application (Laravel + Inertia + React)
└── legacy-prototype/       # Original front-end-only prototype (reference only)
```

`legacy-prototype/` is the earlier localStorage-based prototype that this backend was ported from. It is kept for reference and is not part of the running system.

## Features

- **Role-based access** for three roles: Administrator, Inventory Staff, Warehouse Staff
- **FIFO batch tracking** with expiry countdowns and stock adjustments (damage / loss / correction)
- **Live alerts** computed from current data: low stock, seasonal reorder, near expiry, overdue POs, count variances
- **Purchase order workflow:** draft (Inventory Staff), approve or reject with reason (Admin), receive into batches (Warehouse Staff)
- **Warehouse floor tools:** FIFO pick queue, FIFO exception reporting, ad-hoc returns / transfers / write-offs, barcode-style scan input, printable batch labels
- **Cycle counts** with variance adjustment and recount requests
- **Sales orders** derived from the pick queue
- **Reports:** shrinkage, sales velocity, valuation by ABC class, turnover, dead stock, supplier reliability, purchase history
- **Admin tools:** product catalog, suppliers and locations, user management, audit trail, permission matrix
- **UX:** notifications, command palette (Ctrl/Cmd + K), light/dark theme

## Requirements

- Docker Desktop (with Docker Compose)
- Node.js 18+ (Vite runs on the host, not in a container)
- Git

PHP and Composer are **not** needed locally once the containers are built.

## Setup

From `wb-inventory-backend/`:

```bash
# 1. Environment file
cp .env.example .env
# Confirm these values in .env:
#   DB_CONNECTION=mysql
#   DB_HOST=mysql
#   DB_PORT=3306
#   DB_DATABASE=wb_inventory
#   DB_USERNAME=laravel
#   DB_PASSWORD=secret

# 2. Build and start the containers (app, nginx, mysql)
docker compose build
docker compose up -d

# 3. Install PHP dependencies and generate the app key
# (vendor/ lives in a Docker named volume for speed, so this step is
#  required after a fresh clone and after `docker compose down -v`)
docker compose exec app composer install
docker compose exec app php artisan key:generate

# 4. Create the schema and load seed data
docker compose exec app php artisan migrate --seed

# 5. Install and start the front-end dev server (keep this running)
npm install
npm run dev
```

Then open **http://localhost:8000**.

| Service | Address |
| --- | --- |
| Application (nginx) | http://localhost:8000 |
| MySQL (from the host, e.g. a GUI client) | `127.0.0.1:3307` (container port 3306) |
| Vite dev server | http://localhost:5173 (assets only, not the app) |

### Faster demo mode

The Vite dev server loads many unbundled files and is the slowest way to view the app. For a demo, build the assets once, stop `npm run dev`, and use the built version:

```bash
npm run build
```

Then open http://localhost:8000. Rebuild after any front-end change.

To reset the database to its seeded state:

```bash
docker compose exec app php artisan migrate:fresh --seed
```

To stop everything: `docker compose down` (add `-v` to also delete the database volume).

## Demo accounts

All seeded accounts share the demo password **`walangbrownout`**.

| Name | Email | Role |
| --- | --- | --- |
| Kim Maturan | kim@walangbrownout.ph | Administrator |
| Nick Merilles | nick@walangbrownout.ph | Administrator |
| Lizle Ocariza | lizle@walangbrownout.ph | Inventory Staff |
| Nhimfa Pacao | nhimfa@walangbrownout.ph | Warehouse Staff |

Public registration only offers the Inventory Staff and Warehouse Staff roles. Administrator accounts can only be created by an existing administrator under **Admin > Users**.

## What each role can access

| Area | Admin | Inventory Staff | Warehouse Staff |
| --- | :---: | :---: | :---: |
| Overview | ✓ | | |
| My Day | | ✓ | ✓ |
| Inventory | ✓ | ✓ | |
| Batches | ✓ (can adjust) | read-only | ✓ (can adjust) |
| Alerts | ✓ | ✓ | ✓ |
| Sales Orders | ✓ | ✓ | |
| Transaction Log | | ✓ | |
| Reorder Review / Draft PO | | ✓ | |
| Stock Counts | | review | entry |
| Pick Tasks | | | ✓ |
| Receiving | | | ✓ |
| PO Approvals | ✓ | | |
| Reports | ✓ | | |
| Product Catalog, Suppliers & Locations, Users, Audit Log, Permission Matrix | ✓ | | |

The authoritative version of this table is the in-app **Permission Matrix** page. Access is enforced server-side by middleware, not just by hiding navigation links.

## Running the tests

```bash
docker compose exec app php artisan test
```

The suite can also run against the MySQL container, which matches the production database engine more closely than SQLite:

```bash
docker compose exec app ./vendor/bin/pest --configuration=phpunit.mysql.xml
```

(Artisan's `test` command does not pass the `--configuration` option through correctly, so run Pest directly for the MySQL suite.)

## Maintenance commands

```bash
# Check that batch quantities reconcile with the transaction log
docker compose exec app php artisan inventory:verify-consistency

# One-time backfill: create receiving lines for POs approved before the
# approval-to-receiving link existed
docker compose exec app php artisan po:backfill-receiving-lines
```

## Data model overview

`categories`, `suppliers`, `warehouse_locations`, `products` (SKU is the primary key), `inventory_batches`, `transaction_logs`, `pending_purchase_orders`, `purchase_orders`, `receiving_lines`, `pick_tasks`, `cycle_counts`, `seasonal_windows`, `notifications`, `audit_logs`, `alert_acknowledgements`, and `users` (with `role` and `status`).

Alerts are **not** stored. They are computed from live data on each request, and only acknowledgements are persisted.

## Design decisions

- **Inertia instead of a separate API.** The React pages live inside the Laravel project and receive data as props, so there is one codebase, one auth system and no CORS.
- **Natural keys.** Products use SKU as the primary key, and batches, transactions and orders keep human-readable IDs (`B-1101`, `T-9001`, `PO-3320`), matching how the warehouse refers to them.
- **FIFO everywhere.** Pick assignment, FIFO exceptions and cycle-count reductions all consume the oldest batch first.
- **Stock changes are transactional.** Each stock-changing action writes the batch update, the transaction log row and the audit entry inside one database transaction, with row locks taken before checking and updating.
- **No silent clamping.** A reduction larger than the remaining stock is rejected rather than clamped to zero, so the transaction log always matches real stock movement.

## Known limitations

- **Concurrency is mitigated, not load-tested.** Stock-changing actions use database transactions with `lockForUpdate()`, but this has not been tested under simultaneous real-world load.
- **Seeded batches use an opening balance.** The seed data starts some batches below their received quantity with no transactions explaining the difference. The consistency check treats the seeded quantity as a baseline and only flags drift from activity after seeding.
- **Shared demo password.** All seeded accounts use the same password. Change or remove them before any real deployment.
- **Local Docker setup only.** No hosting or production deployment configuration is included. Before deploying, set `APP_ENV=production` and `APP_DEBUG=false`, and replace the database credentials.
- **Audit write failures at login/logout are reported, not blocking.** If writing the audit entry for a sign-in or sign-out fails, the failure is logged but the user is not blocked from signing in or out.
- **Pagination.** Batches and the Transaction Log are paginated at 50 rows, and the Audit Log shows its most recent 500 entries.
- **Request time on Windows.** Most of the remaining request time is PHP bootstrap and the Windows-mounted source files. Running the project inside the WSL2 Linux filesystem would reduce it further.
- **Vite runs on the host,** not in a container, to avoid slow file watching over Docker volumes.
- **Dependency pins.** `package.json` pins Vite 7 and `laravel-vite-plugin` 2.x to stay compatible with `@vitejs/plugin-react`. Do not bump these casually.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `port is already allocated` on MySQL | Another MySQL is using the port. The compose file already maps the host side to `3307`. |
| `composer install` reports a PHP version mismatch | The container image must be PHP 8.4 (`docker/php/Dockerfile`). Rebuild with `docker compose build app`. |
| White page or Vite manifest error | Make sure `npm run dev` is running. |
| Database connection refused | `DB_HOST` must be `mysql` (the service name), not `localhost`. |
| Changes to `.env` not applied | `docker compose exec app php artisan config:clear` |
| `vendor/autoload.php` not found, or a blank 500 after a fresh clone | `vendor/` lives in a Docker volume, so run `docker compose exec app composer install`. |
| `Unknown column` or other schema errors on an old database | The database was migrated before a migration changed. Run `docker compose exec app php artisan migrate:fresh --seed` (this wipes all data). |
| App feels slow | Run `npm run build` and stop `npm run dev`, then use http://localhost:8000. |
