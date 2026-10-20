# HOTELI engineering audit — 2026-10-19

## Scope
Static inspection of README.md, root/package.json, server/package.json, client/package.json and .gitignore. No code execution or full security audit performed.

## Confirmed findings
1. **README setup mismatch:** README instructs `npm run seed` at the repository root, but root `package.json` has only `dev` and `install:all`. The available seed command is `npm run seed --prefix server`.
2. **Development workflow:** root `npm run dev` launches the server and client concurrently. Server `npm run test --prefix server` exists; tests have not been run during this audit.
3. **Client build:** `npm run build --prefix client` exists. No root build/test script is defined.
4. **Data handling:** `.gitignore` excludes `server/src/data/db.json` and `.env`, which is a useful baseline, not proof that secrets are absent from history.
5. **Production caveat:** README itself says PostgreSQL/Prisma, permissions, payment gateway, backups, end-to-end testing, deployment pipeline, and accounting/legal review remain outstanding.
6. **Demo credentials:** README contains public demo credentials. Verify these are demo-only and never work against production or real customer data.

## Suggested local verification
```bash
npm run install:all
npm run seed --prefix server
npm run test --prefix server
npm run build --prefix client
npm run dev
```

## Next implementation priorities
- Correct README quick start on the main branch after review.
- Add root-level `seed`, `test`, and `build` scripts for consistency.
- Run tests/build in CI; add automated regression coverage for reservation, folio and night-audit workflows.
- Verify authentication, authorization, audit trail, input validation and secrets handling before any public deployment.

This is a static documentation audit, not a claim that HOTELI has passed tests or is production-ready.
