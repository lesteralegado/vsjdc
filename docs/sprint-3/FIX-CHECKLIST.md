# Release fix checklist

Work in order. Each item needs implementation, verification and a brief review before completion. Production remains closed until release gates pass. Audit identifiers refer to PROJECT-AUDIT.md.

| Order | Task | Status | Acceptance check |
| --- | --- | --- | --- |
| 1 | Publish the complete project to a reviewed GitHub preview branch; fix Vercel variable rejection (A01/A08) | Locally committed; publishing waits for private repository | No secrets/test artifacts committed; release build passes; branch contains full app/migrations; preview verified. |
| 2 | Prevent premature check-in/completion (A03) | Done in development ? SQL and staff UI checked | Database rejects future-day check-in and completion before appointment start; valid transitions still pass. |
| 3 | Allow safe schedule changes while bookings exist (A02) | Done in development ? conflict/rollback tests passed | Unrelated changes work; conflicting edits roll back without losing reservations. |
| 4 | Give staff patient contact details (A04) | Done in development ? staff phone links checked | Authorized staff can call the patient; branch restrictions remain enforced. |
| 5 | Fix selected-branch loading and keep tracking available during booking closure (A09/A12) | Same-branch browser check passed; tracking flag separated | Back/select same branch does not stall; tracking works when new booking is disabled. |
| 6 | Recover uncertain booking submissions across reloads (A10) | Done in development ? storage tests, SQL and browser recovery passed | Lost-response retry does not create another request or persist unnecessary patient data. |
| 7 | Paginate and search appointments; simplify duplicate navigation (A11) | SQL RLS/pagination and isolated browser checks passed; hosted acceptance pending | Staff can reach all pending requests; no fake Calendar/export promise. |
| 8 | Add safe staff rescheduling/reassignment (A13) | Implemented in development; SQL and isolated browser checks passed | Failed move retains original reservation; successful move releases old slot atomically. |
| 9 | Strengthen public booking abuse controls and measure capacity limits (A06/A14) | Implemented locally; activation and representative load acceptance pending | Verify bot checks server-side; rate controls and expected clinic load tested. |
| 10 | Replace demo configuration and verify branch details (A05/A15) | Needs clinic inputs | Approved dentists/hours/durations/capacity/future shifts and exact map pins; no production dummy records. |
| 11 | Complete recovery/security/privacy setup (A07/A16) | Needs hosted setup and clinic decisions | Real authorized recovery roundtrip, supported password protection, privacy/retention procedure. |
| 12 | Fresh database replay, restore drill and deployment acceptance (A07) | Replay CI prepared; execution/restore/acceptance pending | Isolated rebuild/restore succeeds; protected preview tested; clinic approves production launch and rollback procedure. |

Keep optional reports, automated reminders, uploads, payments and cosmetic refinements outside this checklist. Do not merge the preview branch into production just because the frontend builds.

## September 19 verification

- The full project remains on local branch `release/clinic-preview`; remote publication is paused because GitHub still reports the repository public and the owner chose to make it private first.
- Appointment timing and safe schedule-edit migrations are applied in development. Timing tests, booking/configuration regression tests and staff UI checks passed.
- Staff phone links rendered; check-in was disabled for the past demo appointment. The temporary staff account and its sessions were removed.
- Recovery stores only request UUID and one-way fingerprint in tab session storage. Original patient details must be re-entered for an exact retry; a saved UUID plus matching mobile recovers the reference through the existing rate-limited gateway. Wrong-mobile and rate-limit tests passed.
- A simulated reload with a saved synthetic request key recovered the original pending reference in the browser; database query confirmed one request mapping. The synthetic appointment was removed afterward. Closing the tab or clearing session storage ends this recovery capability; it is not cross-device recovery.
- No emails were sent. Production rollout, Vercel preview verification and real clinic acceptance remain open.

- Item 7: 25-record pages with exact totals and stable time/ID ordering replace the 200-record cap. Full-reference search and status/date filters run in the database query, retaining branch filtering and existing RLS. Pending requests include every date. Duplicate Dashboard/Calendar entries and the unavailable export promise were removed; the dashboard URL remains unchanged. Query regression checks cover 226 synthetic responses, filters and Manila date boundaries. These checks mock HTTP responses; authenticated browser pagination remains an acceptance check.

## Staff rescheduling verification ? September 19

- Staff can change the time and/or dentist of pending or confirmed appointments within the same branch. Reference, service, patient details and status are preserved. Pending requests still require a separate staff confirmation.
- The form requires a reason and a review step; dates explicitly use Philippine time. Staff should agree on changes with the patient before saving. No notifications are sent automatically.
- The database uses the existing shared scheduling lock, current staff/session/branch checks and expected appointment version. Conflicts roll back the appointment, resource snapshot and audit changes together. Successful moves free the old slot and reserve the new slot. Rescheduling uses current duration/resources/lead time/window; same-time reassignment preserves the existing duration/resource snapshot.
- `supabase/tests/staff_rescheduling.sql` passed against development: resource conflict rollback, old/new capacity, eligible coverage for the full duration, reassignment snapshots, pending/confirmed status, stale updates, future-time/state validation, audit details, authenticated success, and branch/anonymous denial. All fixtures rolled back. The existing booking regression suite also passed.
- Local synthetic browser responses verified review/save, the Philippine-time RPC payload, refresh on success, preserved inputs and an error on conflict, and mobile (390px) and desktop (1440px) layouts. This is component verification, not a live authenticated browser-to-database test.
- Automatic approval review rejected persistent temporary administrator creation for browser testing. No account was created. A read-only cleanup check confirmed zero test accounts/appointments. A live authenticated browser acceptance check remains open.
- Build, lint and all eight release tests passed. Security advisors still report the previously documented disabled leaked-password protection and intentional deny-by-default private-table policies; this migration added no new advisory category.
- Migration: `20260919093154_staff_rescheduling.sql`, applied to development only. Cross-branch transfers and service changes are outside this change.

## Booking protection ? September 22

- Added a Turnstile widget and server-side verification of success, action and allowed hostname, without persisting tokens or changing booking fingerprints. Tracking remains independent. Missing configuration fails closed for new submissions.
- Build, lint and all 10 automated tests passed. The API test uses synthetic provider responses to cover missing configuration/tokens, expiration/replay rejection, wrong hostname/action, provider outage, successful forwarding without the token, and tracking without verification.
- Cloudflare's actual public test widget passed in the local browser at 320px and 1440px widths, including remount after simulated submission. The button was disabled while acquiring a replacement token. These test keys were process-local, not saved to `.env.local` or deployed.
- Development SQL measured 20/40/60-held-appointment schedules, the 61-job rejection, search-budget exhaustion, and mobile/global rate boundaries. Every fixture and counter change rolled back. See [booking protection setup and measurements](BOOKING-PROTECTION.md) for timings and limitations.
- The 60-active-appointment bound is shared across both branches per day, not per branch. Actual expected clinic demand and concurrent network-load acceptance are still outstanding.
- No Edge Function deployment or Vercel publication occurred. The owner must configure `VITE_TURNSTILE_SITE_KEY` and the server-only `TURNSTILE_SECRET_KEY` before coordinated preview deployment and a real protected booking acceptance test. Existing hosted endpoints still use their previous protection.

## Technical completion work ? September 22

- Added a disposable Supabase migration replay job and `npm run test:database`. Tests no longer depend on existing demo branch/service/equipment settings. The local runner accepts no hosted connection URL and checks an empty clinic database with booking closed before/after regression tests. Docker is absent here; fresh replay remains unverified.
- The new SQL pagination test passed with 226 records, checking final pages, stable ordering, exact reference lookup, status filtering, branch isolation and revoked-session denial. The browser fixture reached page 10 and record 226, searched record 210 and had no overflow at 320px.
- Tracking now clears the previous result when lookup details change and locks lookup fields during an in-flight request. Local browser tests passed for loading, found, not-found and network-error states with new booking disabled.
- Added a page-error recovery boundary; forced-render-failure browser check displayed reload, appointment and clinic-contact actions at mobile width instead of a blank page.
- Added a read-only production-readiness report. Development passes branch/admin/basic configuration and RPC access checks, but still contains demo data and has no future eligible dentist shifts. These are recorded as setup gaps, not silently replaced.
- Retired the old hosted-mutating booking smoke flow in favor of a non-booking bot-enforcement check. Hosted signup/CORS/key/tracking privacy/cache-header checks passed. Full dependency audit reported zero vulnerabilities.
- Owner tasks are consolidated in [OWNER-SETUP.md](OWNER-SETUP.md). GitHub still reported public; nothing was published and no production deployment occurred.

- Final verification for this batch: all seven SQL files passed against development with rollback; build, lint and 10 release tests passed. Browser fixtures are absent from the production `dist` output. Fresh-stack CI remains prepared but unexecuted.
