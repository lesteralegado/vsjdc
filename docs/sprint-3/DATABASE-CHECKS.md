# Isolated database regression checks

The CI workflow starts a disposable local Supabase stack, replays all migrations without seed data, runs every file in `supabase/tests`, and checks that no appointments, dentists, staff or branch scheduling settings remain afterward. Booking must still be closed. No hosted credentials are required or accepted by the runner.

`npm run test:database` executes SQL through `docker --context default exec ...` against the named local container `supabase_db_vsjdc`. It refuses a populated clinic/demo database before running tests. Each SQL file wraps its own synthetic rows and configuration in a rolled-back transaction.

For a **disposable local stack only**, after reviewing CLI help:

```sh
npx supabase start
npx supabase db reset --local --no-seed
npm run test:database
```

`db reset --local` destroys local database contents. Do not run it against a local stack containing work you need; use a disposable checkout/stack for release verification. Never substitute `--linked` or a hosted database URL.

The booking, rescheduling and capacity tests create their own scheduling/equipment fixtures, rather than relying on the optional demo loader. Other suites cover branch access, session revocation, configuration, appointment timing, and pagination past 200 records.

The read-only `supabase/checks/production_readiness.sql` report is separate from the tests. Run it in the trusted SQL editor to inspect deployment configuration; it does not grant permissions, change schedules or remove demo data. A passing report does not verify mail delivery, backup restoration, actual staff workflows or clinic approval.

September 22 status: updated rollback tests passed on development Supabase. Fresh local replay/CI execution and actual backup restoration are still unverified; this workstation has no Docker installation.
