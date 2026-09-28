# Sprint 2 review and focused delivery plan

September 16, 2026. Engineering checks passed in the development Supabase project. Clinic acceptance and production release are still pending.

## Delivered

- Availability accounts for shifts, service eligibility, duration/buffer, chairs, equipment, closures, travel and existing holds.
- Requests are pending and unassigned. Staff assigns an eligible dentist when confirming. Pending holds have no automatic expiry.
- Atomic capacity checks prevent concurrent overbooking. Retrying the same request key returns the original appointment; changing its payload is rejected.
- Staff can reject/cancel requests, releasing capacity, and record check-in, completion and no-show. Receptionists remain branch-scoped.
- Tracking requires a random reference and matching mobile number. Responses exclude patient contact details and notes. Server validation, payload limits and rate limits are active.
- Development UI booking is enabled. Public configuration defaults to disabled in `.env.example`.

## Evidence

- `supabase/tests/sprint2_booking.sql`: rollback-based assertions passed for holds, overlapping service pools, equipment limits, assignment feasibility, cancellation/rejection, optimistic version checks, tracking and branch/role restrictions.
- `scripts/verify-booking-api.mjs`: four concurrent requests for one available time yielded one pending hold and three conflicts. Idempotency, changed-payload rejection, tracking, refreshed capacity, direct RPC denial, key/body/origin checks passed.
- Browser: Santa Rosa → Oral Prophylaxis → September 18 at 9 AM → fictional patient → pending reference → synthetic staff login → pending queue → assign Jamie Reyes/confirm → mobile tracking showed confirmed and assigned dentist. Database status/version independently checked.
- Mobile reference wrapping fixed; document width equals viewport at 390 px and desktop at 1440 px in checked tracking layouts. No uncaught browser errors in the completed flow.
- Build and lint passed. Temporary API/browser appointments and the privileged synthetic account were removed; clinic administrator and supplied demo records preserved.
- Screenshots in workspace `design-reference`: `sprint2-tracking-mobile-full.png`, `sprint2-tracking-desktop.png`.

## Try the essential workflow

1. Run `npm.cmd run dev -- --host 127.0.0.1 --port 5173` and open `/appointments`.
2. Book Santa Rosa / Oral Prophylaxis on a future date covered by demo shifts (currently September 16–22, 2026). Use fictional patient details and save the reference.
3. Sign in with your administrator account, select Santa Rosa, and open Pending requests. Assign a dentist and confirm, or reject/cancel.
4. Track using the saved reference and the same mobile number. Check that status and assignment reflect the staff action.

After September 22, add future shifts before expecting availability. Cabuyao's existing one-day booking horizon and 24-hour notice were preserved and may yield no times. Existing September 14 sample appointments predate the booking engine and have no tracking reference; create a new request to demonstrate tracking.

## Essential next sprint: acceptance and release readiness

The owner requested a focus on finishing the MVP. Work one acceptance criterion at a time; keep optional features out of the active sprint.

| Priority | Deliverable | Done when |
| --- | --- | --- |
| 1 | Clinic acceptance | Owner demonstrates book, confirm, track and cancel; actual staff/services/shifts/durations/chair limits replace demo values before launch. |
| 2 | Account and data protection | Staff recovery redirects and recovery roundtrip verified; registration settings reviewed; password protection configured where available; branch-denial tests remain passing. |
| 3 | Release preparation | Separate production configuration, allowed origins, secrets, HTTPS, backup/restore and rollback procedure checked; fresh database migration replay verified. |
| 4 | Deployment and smoke test | Owner-selected hosting/account connected, build deployed, patient/staff flow verified on deployed URL, demo fixtures excluded from production. |

Agile cycle: select this small sprint goal, move tasks through To do → In progress → Review → Done, demonstrate working behavior at review, and record one improvement in the retrospective. A sprint number is not evidence of production readiness.

Deferred: SMS/email reminders, analytics/reporting, photo uploads, recurring-shift convenience, patient accounts, additional visual polish and broad refactoring. Existing useful functionality is retained.

## Remaining practical limits

- Configuration edits currently fail while future active appointments exist across either branch, preventing silent invalidation. Review this with the clinic before launch; reservation-aware schedule edits may become essential based on that review.
- Assignment search fails closed beyond 60 active appointments in a day or its search budget. Confirm expected clinic volume before release.
- Development API restricts origins to localhost and uses a development project guard. Production setup must explicitly update these; do not deploy this configuration unchanged.
- Current rate limits are global/per-reference/per-mobile. Public launch needs an abuse-control review suitable for expected traffic.
- Idempotency survives retries within the current booking form, not a browser reload. No automatic email/SMS notification is sent.
- Hosted recovery acceptance and leaked-password protection remain open. Build success does not close these release tasks.
