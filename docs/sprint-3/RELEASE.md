# Vercel release runbook

## Prepare a preview

1. Connect the owner's Vercel account and create/select the clinic project. Framework: Vite. Root directory: `vsjdc` if importing the parent folder, otherwise repository root. Node: 24. Use the committed `vercel.json` build settings.
2. The owner uses GitHub-to-Vercel deployment. Confirm `hklsll/vsjdc` is private before publishing the complete preview branch; open a PR and require UI/database CI checks before merging. Do not overwrite `.env.local` with production credentials. Keep `.vercel` and environment files ignored.
3. In Vercel **Preview** environment set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_DEMO_DATA=true`, `VITE_DEMO_APPOINTMENT_DATE=2026-09-14`, and explicit `VITE_BOOKING_ENABLED=false` until the coordinated Turnstile rollout is configured. Add `VITE_TURNSTILE_SITE_KEY` before enabling booking for the existing development project. Protect preview access. Do not put any service-role, database password or management token in Vercel browser variables.
4. Follow [BOOKING-PROTECTION.md](BOOKING-PROTECTION.md) to configure server-only `TURNSTILE_SECRET_KEY` and deploy both Edge Function source files together. Set Supabase Edge secrets `APPOINTMENT_PUBLIC_KEY` to that project's publishable key and `APPOINTMENT_ALLOWED_ORIGINS` to a comma-separated list of exact approved origins, including the chosen preview URL and local origins if still needed. Never allow `*.vercel.app` or arbitrary reflected origins. Preview URLs change; update the explicit list for the chosen deployment.
5. Configure Supabase Auth Site URL and exact `/staff/password` redirect for the chosen site. Keep public signup disabled; set minimum password length 12. Enable leaked-password protection where supported. Configure reliable SMTP before production. A real recovery test sends email and needs the owner's authorization; use the same browser to request and open the PKCE link.
6. Test direct loading and refreshing `/appointments/book`, `/appointments/track`, `/staff/login`, `/staff/password` and `/staff/dashboard`. Check CSP headers on the deployed response, load fonts/images, and inspect the console. Verify anonymous staff access is denied. Run `verify-release-api.mjs` with `TEST_SITE_ORIGIN` equal to the approved preview origin.

## Production prerequisites

- Use a separate production Supabase project. Replay only versioned migrations; do not run `supabase/demo/load_demo.sql`. Booking defaults closed at the database level until configuration is accepted. Configure actual staff membership, clinic schedules and services through the existing approved paths.
- Production Vercel variables: production URL/publishable key, `VITE_DEMO_DATA=false`, no demo appointment date, and explicit `VITE_BOOKING_ENABLED=false` until launch approval. Deploy the appointment Edge Function separately with its production secrets and exact HTTPS site origin. Its built-in Supabase service-role key stays server-side.
- Validate fresh migration replay on an isolated Supabase stack (`supabase start`, then local `supabase db reset` after reviewing CLI help). Execute the SQL test files against that disposable database, never production. Record results; this has not yet run on this workstation.
- Review expected daily volume and the 60-active-appointment/day fail-closed search limit. Safe same-branch rescheduling and dentist reassignment are implemented; cross-branch transfers and service changes are not supported. Review public endpoint abuse limits for expected traffic.
- Clinic signs off book → pending → staff assignment/confirmation → track → cancellation/released capacity, receptionist branch restrictions, hours and actual durations.

## Backup and rollback

Before launch, record the project/region, backup retention available on the chosen plan, last successful backup, responsible owner, and acceptable recovery time/data loss. Prove restoration into an isolated target with no public traffic. Include Auth/private scheduling data in the recovery plan; never store backups in the repository. No backup or restore was performed by this sprint.

For a frontend incident, restore the previous verified Vercel deployment. A frontend rollback does not reverse database changes. Disable new booking through `private.booking_settings.enabled` in the trusted Supabase SQL editor if capacity integrity is in doubt; continue staff handling and tracking as appropriate. Prefer a reviewed forward migration for database fixes; do not reset or drop the production database. Re-run the essential flow after recovery.

Official references: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json), [Supabase password recovery](https://supabase.com/docs/guides/auth/passwords), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

See [OWNER-SETUP.md](OWNER-SETUP.md) for the consolidated owner tasks and [DATABASE-CHECKS.md](DATABASE-CHECKS.md) for the prepared isolated replay job. The non-booking `verify-booking-api.mjs` smoke check validates bot enforcement after activation; it no longer creates hosted test appointments.
