# HOTELI — Hotel Property Management System (Portfolio Demo)

HOTELI is a full-stack **portfolio project** inspired by real hotel front-desk and night-audit workflows. It demonstrates a React/Vite frontend, an Express API, role-based access, reservations, room management, folios, and operational reporting.

> **Demo only.** All sample records are fictional and the app is not intended for real guest data, live payments, or production hotel operations.

## Try the demo locally

Requires Node.js 20+ and npm.

```bash
npm run install:all
npm run seed --prefix server
npm run dev
```

Open the frontend at **http://localhost:5173** (or the address Vite prints). The API health check is **http://localhost:4100/api/health**.

### Demo sign-in

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@hoteli.com` | `demo123` |
| Front desk | `frontdesk@hoteli.com` | `demo123` |
| Night auditor | `auditor@hoteli.com` | `demo123` |
| Manager | `manager@hoteli.com` | `demo123` |

These accounts are **only for a local, fictional-data demonstration**. Never reuse these credentials for a public deployment with real data.

## Five-minute portfolio walkthrough

1. **Dashboard:** review the hotel overview and operational metrics.
2. **Rooms and availability:** compare ready, dirty, occupied, and maintenance rooms; search dates.
3. **Reservations:** create a fictional reservation, assign a room, and change its status.
4. **Folios:** inspect room charges and taxes; post a fictional payment.
5. **Night audit and reports:** review night-audit summaries, revenue, in-house guests, and downtime reports.

The seeded reservation dates are from **May 2026**. For a fresh walkthrough, create a reservation with your chosen dates; the old seed entries are illustrative, not live arrivals.

## Reset fictional demo data

To restore the original local sample records:

```bash
npm run seed --prefix server
```

This **overwrites local demo changes**. Do not run it against any data you want to keep.

## Quality checks

```bash
npm ci
npm ci --prefix server
npm ci --prefix client
npm test
npm run build
npm audit --audit-level=moderate
npm audit --prefix server --audit-level=moderate
npm audit --prefix client --audit-level=moderate
```

## Project scope

This is a **portfolio MVP**, not a commercial PMS. The demo illustrates practical hospitality workflows, UI engineering, API development, validation, and automated checks. A real deployment would require stronger data isolation, hardened authentication, persistent database infrastructure, backups, payment-provider integration, and operational security review.

**Source and progress:** development changes are reviewed on the experimental branch before any approved merge into `main`.
