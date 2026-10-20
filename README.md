# HOTELI — Hotel Property Management System

HOTELI is a personal project inspired by my work in hotel front-desk operations and night auditing. I started building it to explore how reservations, room status, guest folios, and end-of-day reporting could fit together in one system.

The project uses React and Vite for the interface and an Express API for the backend. It is still in development, and some workflows need more testing.

> **Demo only.** All sample records are fictional and the app is not intended for real guest data, live payments, or production hotel operations.

## Live preview

**[Open HOTELI demo](https://hoteli-preview-2026.onrender.com)**

The public preview uses fictional sample records. It may take a little time to load after a period of inactivity. Please do not enter real guest information or payment details.

## Screenshots

Screenshots of the manager dashboard, night-auditor dashboard, and night-audit screen are being prepared for this section.

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

## Known limitations and next steps

- This is an evolving learning/portfolio project, not a finished commercial product.
- Dashboard metrics and room-status totals still need consistency checks.
- The night-audit screen demonstrates the workflow; further end-to-end validation is needed.
- The free-hosted preview uses temporary file-based sample data, so changes may not persist after a restart.
- Mobile layouts and accessibility can be improved as the project develops.

## Project scope

This is a **portfolio MVP**, not a commercial PMS. The demo brings together hospitality workflows, a web interface, an API, and some automated checks. A real deployment would require stronger data isolation, hardened authentication, persistent database infrastructure, backups, payment-provider integration, and operational security review.

**Source and progress:** development changes are reviewed on the experimental branch before any approved merge into `main`.
