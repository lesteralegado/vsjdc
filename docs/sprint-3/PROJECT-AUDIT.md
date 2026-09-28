# Project readiness audit — September 17, 2026

Update: see FIX-CHECKLIST.md for fixes implemented after this dated audit. Findings below record the audit baseline.

Verdict: suitable for development demonstration; not ready for real-patient production launch. This review adds findings, not functional changes. No clinic data or features were deleted.

Scope: local React application, API adapter, staff authorization, scheduling/booking migrations, Edge gateway, deployment configuration, CI, GitHub branch state, live development configuration and security advisors. Hosted Vercel settings/logs and the protected deployment remain inaccessible through the connected account. This is not a penetration test or a claim that every execution path is covered.

## Launch blockers and high-priority defects

| ID | Finding and impact | Evidence | Required fix / acceptance |
| --- | --- | --- | --- |
| A01 | Deployed source is behind local work. GitHub main is still initial commit `f27803c`; routing fix `9d106b7` exists only on its branch. Current booking/auth/migrations are not in main. | `git ls-remote`; local status and committed tree | Review and publish a complete, secret-free release branch. Test its Vercel preview before merging. Do not blindly push every untracked file. |
| A02 | Any future active appointment locks ALL configuration edits, across both branches. Staff cannot add next week's shifts or record unrelated leave while bookings exist. | `supabase/migrations/20260915063238_sprint2_scheduling.sql:107` | Replace the global freeze with transaction-safe validation of affected reservations. Permit non-conflicting changes; reject or explicitly resolve conflicting changes. Keep the shared lock and capacity integrity checks. |
| A03 | Staff can check in and complete a future appointment immediately, freeing its reserved capacity. | `supabase/migrations/20260915121836_sprint2_booking_engine.sql:207`; reproduced on a synthetic appointment two days ahead in BEGIN/ROLLBACK | Enforce clinic-approved time rules in the database, not just buttons. Test premature actions and valid actual-day completion. |
| A04 | Staff cannot see a patient's mobile number in the appointment card, although it is fetched. No automatic notification exists, so staff lacks the basic contact tool for confirmation or schedule changes. | `src/lib/staffApi.ts:46`; `src/components/StaffAppointmentCard.tsx:27` | Show mobile/call action only to authorized staff. Make the manual contact workflow explicit. SMS automation is optional. |
| A05 | Demo inputs are still operational: 3 DEMO dentists; last shift September 22, 2026. Cabuyao public hours end 18:00 but scheduler ends 17:00, with 24-hour notice and a one-day horizon. | Read-only hosted query; `src/data/clinic.ts:5` | Obtain approved hours, service durations, dentists and shifts. Explain any difference between office and treatment hours. Use actual production data and ensure future shifts remain available. |
| A06 | Public booking can be abused to hold capacity indefinitely. Phones are format-checked, not ownership-verified; changing phone numbers bypasses per-mobile limits. Global rate ceilings can also deny service to other users. CORS/public API keys are not bot authentication. | `supabase/functions/appointment-api/index.ts`; `20260915122944_fix_tracking_lookup.sql` | Add verified anti-bot/abuse controls at the public Edge endpoint and an operational spam-review process. Preserve the approved rule that pending requests do not expire automatically. Load-test legitimate and abusive traffic without touching production. |
| A07 | Real recovery email/callback/password update, isolated migration replay, backup restoration and production smoke tests are still unverified. Leaked-password protection remains disabled. | Sprint 3 runbook, current security advisor | Complete and record these checks, including revoked old-session access after recovery. Configure supported password protection and reliable recovery delivery. |

## Functional and deployment defects to address

| ID | Finding | Proposed resolution |
| --- | --- | --- |
| A08 | Release allowlist rejects `VITE_VERCEL_ENV`. Reproduced with otherwise valid preview settings. Other injected `VITE_VERCEL_*` variables could also block builds. | Explicitly allow reviewed nonsecret platform variables and test the actual Vercel environment. Keep rejection of secrets. See `scripts/release-config.mjs:3` and [Vercel system variables](https://vercel.com/docs/frameworks/frontend/vite#environment-variables). |
| A09 | Selecting the already-selected branch after returning to the first booking step clears slots and sets loading, but does not change an effect dependency. The UI can remain loading until service/date changes. | Disable the selected branch action or increment refresh when clearing slots. Reproduce with service/date selected → Back → click same branch → Continue. `BookAppointmentsPage.tsx:34,40,77`. |
| A10 | Booking request key survives only the mounted component. A successful server booking followed by lost response and page reload can produce a second request if capacity still exists. | Recover an outstanding submission across reloads without storing unnecessary patient data; test lost-response retries. `BookAppointmentsPage.tsx:22,54`. |
| A11 | Appointment lists stop at 200, with no pagination, search or implemented export despite suggesting an administrator export. Older pending records can hide newer requests. | Add pagination and useful lookup by reference/mobile. Remove the unsupported export promise. `staffApi.ts:50`, `StaffDashboardPage.tsx:61`. |
| A12 | Tracking availability flag is tied to booking, although the tracking page still calls the API. Closing booking can produce an incorrect 'tracking unavailable' error message. | Separate tracking from booking closure; existing patients must remain able to check appointments. `clinicApi.ts:41`, `TrackAppointmentPage.tsx:34`. |
| A13 | No safe reschedule/reassignment workflow. A dentist absence requires manual cancellation and rebooking, with risk of losing the original slot. | Prioritize a staff-only atomic move/reassignment if required for clinic operation; keep the old reservation until the replacement passes validation. Do not add patient dentist selection. |
| A14 | Search fails closed beyond 60 active appointments across both branches per day or after 5,000 search steps. Availability computes feasibility repeatedly for each offered start. | Confirm actual daily volume and measure worst-case latency/timeout behavior. Keep fail-closed safety; optimize only from measured workload. `20260915121836_sprint2_booking_engine.sql:66,85`. |
| A15 | Santa Rosa Maps action uses a text search rather than a verified exact clinic pin. | Obtain the clinic's exact Google Maps share link/place ID. `src/data/clinic.ts:14`. |
| A16 | Free-text notes and contacts are collected, but there is no patient-facing privacy notice or implemented retention/deletion procedure. | Define collection purpose, access, retention and contact process with the clinic; discourage unnecessary medical detail in booking notes. This audit does not certify legal compliance. |

## Simplify instead of expanding

- Merge Dashboard and Appointments for now: they render the same list. Keep Pending requests separate because it has a different operational purpose.
- Hide Calendar until it provides a calendar view; currently it duplicates the appointment list.
- For production booking closure, show a concise closure/contact screen instead of taking patients through a five-step non-submitting preview. Keep the preview in development only.
- Remove demo banners, fictional profiles and demo shortcuts from the production environment after approved replacements exist. Keep isolated demo/test scripts for development.
- Defer reports, automated reminders, photo uploads, recurring-shift shortcuts, patient accounts, payments and more styling work. These are not implemented deliverables to delete; avoid adding them before the core workflow is accepted.
- Keep staff permissions, scheduling constraints, reference tracking, pending holds, input validation, audit history and concurrency controls. They are essential rather than unnecessary complexity.

## Verification performed during this review

- `npm run build`: passed TypeScript and Vite build.
- `npm run lint`: passed.
- `npm run test:release`: 4 tests passed; separate probe exposed A08, showing current tests are incomplete.
- Full `npm audit --json`: zero reported vulnerabilities, including development dependencies at this check.
- Hosted `sprint1_access.sql`: passed branch isolation, unpublished catalogue protection, admin access, deactivation, metadata spoofing, revoked sessions and forbidden-write checks.
- Hosted `sprint2_booking.sql`: passed holds, request idempotency, equipment, mixed eligibility, assignment rollback, stale version, rejection/cancellation release, tracking and rate checks.
- Added an ephemeral rollback probe to the booking test: future check-in and completion accepted, confirming A03. All fixtures rolled back.
- Read-only release API test passed: signup disabled, exact allowed origin, invalid-key denial, not-found response and no-store.
- Security advisors: one warning (leaked-password protection disabled), 16 intentional informational notices for private deny-by-default tables. [Supabase password protection guidance](https://supabase.com/docs/guides/auth/password-security).
- CI currently runs UI/release checks but does not replay database migrations or execute SQL/browser integration tests. Add isolated database regression checks before treating a green CI build as release readiness.

No new full browser/mobile matrix, production load test, restore drill, or authenticated Vercel inspection was completed during this audit. Earlier browser test results remain historical evidence, not proof of today's deployed source.

## Focused Agile order

1. Finish release-source reconciliation and verify the complete app in a protected preview (A01, A08).
2. Fix operational correctness: schedule edits, time transitions, staff contact, stuck availability, retries and visible pending queue (A02–A04, A09–A11).
3. Close production gates: real inputs, abuse controls, recovery, privacy/retention decisions, fresh migration replay and restore drill (A05–A07, A16).
4. Demonstrate two-branch book → pending → assign/confirm → track → cancel/rebook with clinic staff. Resolve rescheduling requirements and volume limits. Then approve launch.

Do not start another feature sprint to avoid these open items. Keep the active work focused on acceptance and release readiness.
