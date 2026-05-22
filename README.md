# Forklift DMS

A self-hosted **Dealer Management System** for forklift dealerships. Tracks new
and used inventory, current and historical sales, customers, and supports
**OCR ingestion of hand-written data cards** via Google Cloud Vision.

Built with Next.js 15 + TypeScript + PostgreSQL. Designed to be deployed in the
office on a single machine or on a single DigitalOcean droplet.

---

## Highlights

- **Inventory management** for new/used/sold/in-service forklifts with full
  spec capture (class, fuel, capacity, mast, hours, tires, etc.)
- **Sales** — both current sales (which flip a forklift to `SOLD` atomically)
  and historical sales for back-filling decades of paper records
- **Customers** — companies and individuals, with full sales history per customer
- **Handwritten data cards → text** via Google Vision DOCUMENT_TEXT_DETECTION,
  with a one-click "Enter Sale from this card" flow
- **Photos & attachments** — every forklift can carry photos, invoices,
  documents. Camera capture supported on mobile.
- **Role-based access control** — Admin, Manager, Sales, Service, Read-Only
- **Audit log** — every mutation is recorded with user, IP, before/after diff
- **Global search** with ⌘K shortcut across inventory, customers, and sales
- **Mobile-friendly** — responsive layout, hamburger nav, 44px touch targets,
  in-yard camera upload
- **Nightly backups** of database + uploaded files, with configurable retention
- **Dockerised** for one-command deployment with Postgres + cron sidecar

---

## Stack

| Layer        | Technology                                               |
| ------------ | -------------------------------------------------------- |
| Runtime      | Node.js 22                                               |
| Framework    | Next.js 15 (App Router, Server Actions, RSC)             |
| Language     | TypeScript (strict)                                      |
| Database     | PostgreSQL 16 via Prisma 6                               |
| Auth         | NextAuth v5 (Credentials, JWT sessions, bcrypt)          |
| UI           | Tailwind CSS + Radix UI primitives (shadcn-style)        |
| OCR          | Google Cloud Vision (`@google-cloud/vision`)             |
| Validation   | Zod                                                      |
| Logging      | Pino (with secret redaction)                             |
| Testing      | Vitest (unit + integration) + Playwright (E2E ready)     |
| CI           | GitHub Actions                                            |
| Container    | Multi-stage Dockerfile + docker-compose                  |

---

## Local development

### Prerequisites

- Node.js 22+
- pnpm 10+ (`corepack enable && corepack prepare pnpm@10.9.7 --activate`)
- Docker (for Postgres) **or** a local Postgres 16 instance

### Setup

```bash
# 1. Install
pnpm install

# 2. Start Postgres
docker compose up -d postgres

# 3. Configure environment
cp .env.example .env
# edit .env — at minimum, set AUTH_SECRET (openssl rand -base64 48)

# 4. Apply database schema
pnpm prisma migrate dev

# 5. Seed initial admin + demo data
pnpm db:seed

# 6. Run
pnpm dev          # http://localhost:3000
```

Default admin: `admin@example.com` / `ChangeMeImmediately!1` — change both via
the seed script before first deployment.

### Common commands

```bash
pnpm dev               # development server with hot reload
pnpm build             # production build
pnpm start             # serve the production build
pnpm lint              # ESLint
pnpm typecheck         # tsc --noEmit
pnpm test              # vitest (unit + integration)
pnpm prisma:studio     # Prisma Studio (visual DB browser)
pnpm prisma:migrate    # create+apply a new migration
pnpm db:seed           # re-run the seed
pnpm backup            # one-off backup
```

---

## Deployment

### Option A: Office machine / DigitalOcean droplet via Docker

```bash
# Required environment (use a real .env, not the example):
cat > .env <<'EOF'
POSTGRES_PASSWORD=use-a-long-random-password
AUTH_SECRET=$(openssl rand -base64 48)
NEXTAUTH_URL=https://dms.your-dealership.example
APP_PORT=3000
# Optional: GOOGLE_CREDS_HOST_PATH=/opt/secrets/vision.json
# Optional: GOOGLE_APPLICATION_CREDENTIALS=/run/google-creds.json
EOF

# Build and start
docker compose up -d --build

# Apply migrations on first run
docker compose exec app pnpm prisma migrate deploy
docker compose exec app pnpm db:seed
```

Front the `app` service with a reverse proxy that terminates TLS
(Caddy, Nginx, or DigitalOcean Load Balancer). Restrict access to your
office IP range if you don't want it publicly reachable.

The `cron` service runs the backup nightly at 02:15 into the `backups`
named volume; copy that volume off-site (e.g. with `restic`, `rclone`, or
DigitalOcean Spaces) for disaster recovery.

### Option B: Bare metal / systemd

`pnpm build && node .next/standalone/server.js` is the production entrypoint.
Use a systemd unit, point it at a managed Postgres, and add a cron entry for
`pnpm backup`.

---

## Security & compliance

| Concern                  | Mitigation                                                            |
| ------------------------ | --------------------------------------------------------------------- |
| Authentication           | bcrypt(cost=12), per-account lockout, per-IP rate limiting            |
| Session                  | JWT, 8-hour expiry, role re-checked every 60s against DB              |
| Authorisation            | RBAC checked in every server action (not just middleware)             |
| Audit trail              | `audit_log` table records every mutation: who, what, when, before/after, IP, UA |
| Transport                | HSTS header, strict CSP, X-Frame-Options DENY, no `X-Powered-By`       |
| File upload              | Magic-byte validation, size limit, content-addressed storage, no original filenames on disk |
| SQL injection            | Parameterised queries everywhere (Prisma)                             |
| XSS                      | React escaping + restrictive CSP                                       |
| CSRF                     | NextAuth same-site cookies + server-action origin checks              |
| Secret handling          | Pino redaction in logs, env vars validated at boot, no secrets in repo |
| Dependency hygiene       | `pnpm audit` in CI, weekly Dependabot upgrades                        |
| Soft-delete              | Inventory and customers are archived (`deletedAt`) not hard-deleted    |
| Backups                  | Nightly `pg_dump` + storage tarball, 30-day default retention         |
| Change management        | All schema changes via Prisma migrations under version control        |

### Compliance posture

This system is suitable for a single-dealer office. It does **not** by itself
satisfy SOC 2 / PCI / HIPAA / GDPR — those require organisational controls
on top of the software (incident response, vendor management, employee
training, etc.). The audit log and RBAC give you the technical evidence
required during attestation; tie them to a written policy.

If you handle payment information, route card numbers to a PCI-scope-reducing
provider (Stripe, Square) — do **not** store PANs in this database.

---

## Backups & disaster recovery

`scripts/backup.ts` produces two files per run in `BACKUP_DIR`:

- `db-YYYY-MM-DDTHH-MM-SS.sql.gz` — compressed `pg_dump` of the entire DB
- `files-YYYY-MM-DDTHH-MM-SS.tar.gz` — tarball of `STORAGE_ROOT`

Snapshots older than `BACKUP_RETENTION_DAYS` (default 30) are pruned.

### Restore drill

```bash
# Stop the app to prevent writes during restore
docker compose stop app cron

# Drop and recreate the DB
docker compose exec postgres dropdb -U dms dms
docker compose exec postgres createdb -U dms dms

# Restore the SQL dump
gunzip < /path/to/db-XXXX.sql.gz | docker compose exec -T postgres psql -U dms -d dms

# Restore files
tar -xzf /path/to/files-XXXX.tar.gz -C /var/lib/docker/volumes/dms_storage/_data --strip-components=1

docker compose start app cron
```

**Test the restore quarterly.** A backup you've never restored is a hope, not a backup.

---

## Project layout

```
src/
├── app/
│   ├── (app)/              # protected routes (require auth)
│   │   ├── page.tsx               dashboard
│   │   ├── inventory/             list / new / [id] / [id]/edit
│   │   ├── customers/             list / new / [id] / [id]/edit
│   │   ├── sales/                 list / new / [id]
│   │   ├── data-cards/            OCR upload + history
│   │   ├── admin/users/           user management
│   │   ├── admin/audit/           audit log viewer
│   │   └── settings/              profile + change password
│   ├── api/
│   │   ├── auth/[...nextauth]/    NextAuth handler
│   │   ├── attachments/[id]/      file streaming
│   │   └── search/                global cross-entity search
│   └── login/                     unauthenticated entry
├── components/             # UI components + form components
├── lib/
│   ├── actions/            # server actions (create/update/delete)
│   ├── auth/               # NextAuth config, RBAC, session helpers
│   ├── audit.ts            # audit logger
│   ├── db.ts               # PrismaClient singleton
│   ├── env.ts              # zod-validated process.env
│   ├── ocr.ts              # Google Vision integration
│   ├── rate-limit.ts       # login rate limiter
│   ├── storage.ts          # content-addressed file storage
│   └── validation.ts       # zod schemas (shared by forms + actions)
└── middleware.ts           # auth gate

prisma/
├── schema.prisma           # data model
└── seed.ts                 # initial admin + demo data

scripts/
└── backup.ts               # pg_dump + storage tarball + prune

tests/
├── unit/                   # rbac, validation, storage, rate-limit
└── integration/            # server actions against a live DB
```

---

## Adding a new field

1. Edit `prisma/schema.prisma`
2. `pnpm prisma migrate dev --name your_description`
3. Add the field to `forkliftSchema` (or whichever schema) in `src/lib/validation.ts`
4. Add a `<Field>` to the matching form component
5. Display it on the detail page

Type-check + tests catch the rest.

---

## Mobile

The UI is desktop-first (which is how dealership office staff use it most of
the day) but fully functional on phones:

- Hamburger nav drawer on screens < 1024px
- Touch targets are minimum 44px (Apple HIG)
- Tables scroll horizontally rather than truncate
- Camera capture (`<input capture="environment">`) for in-yard photo uploads
  and data-card scanning straight from the phone

Install to home screen via the PWA manifest for a native-feeling launcher icon.

---

## Roadmap

- Service tickets (warranty, maintenance) per forklift
- Vendor / parts inventory
- PDF invoice generation
- Two-factor auth (TOTP) for ADMIN
- S3 / DigitalOcean Spaces storage adapter behind the existing interface
- Demand forecasting from sales history
