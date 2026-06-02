# HOTELI Production-Ready Foundation v1.3

HOTELI is a cloud hotel PMS foundation with React/Vite frontend and Express API backend.

## Run locally

```cmd
npm run install:all
npm run seed
npm run dev
```

Frontend: http://localhost:5173 or the Vite-assigned port shown in CMD.
Backend: http://localhost:4100/api/health

## Demo Login

```text
admin@hoteli.com
demo123
```

## v1.3 Patch Notes

- Fixed dashboard refresh button.
- Made language changes global across all modules/tabs.
- Rebuilt reservation form with native date pickers.
- Added availability and rates preview before saving reservations.
- Made reservation save functional.
- Added room assignment and unassignment workflows.
- Added folio list and folio detail view.
- Added room charge, TPS/GST, TVQ/QST, taxe d’hébergement, parking, TPS on parking, and TVQ on parking to new folios.
- Added folio payment posting.
- Made night audit run and lock the audit date.
- Added revenue report.
- Added in-house guest report.
- Added downtime report with arrivals, departures, in-house, and high-balance reservations.

## Notes

This is a serious MVP foundation, not a complete commercial PMS yet. Before paid hotel production use, add PostgreSQL/Prisma, full permission matrix, payment gateway integration, backups, automated end-to-end testing, deployment pipeline, and legal/accounting review.


## v1.3 Operational Patch
- Added safer backend validation so bad form input returns HTTP 400 instead of crashing the API.
- Improved reservation save validation and reset behavior.
- Expanded folio detail view with room charge, TPS, TVQ, taxe d’hébergement, parking, and payments summary.
- Improved night audit locking summary and downtime report categories.

