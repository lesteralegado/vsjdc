# Development demo walkthrough (earlier configuration increment)

**September 16 update:** Booking, tracking, staff confirmation and capacity holds are now implemented and tested in development. The configuration-only status below is historical. Use [current verification and delivery plan](BOOKING-VERIFICATION.md) for sprint status and the working demo.
Loaded September 15, 2026 at the owner's request. This is fictional software demonstration data, not approved clinical scheduling guidance. It lives in `vsjdc-development`; patient booking remains closed.

## What was added

- Three clearly labeled DEMO dentist profiles, published so their cards appear on the homepage. No stock photo is presented as a real dentist; cards use the existing photo placeholder.
- Thirty-five dated work periods across September 16–22, 2026. Main demo dentists work morning/afternoon periods separated by a noon break; the additional Santa Rosa dentist works afternoons and is eligible only for whitening, orthodontics and retainers.
- Missing branch settings and service configurations, plus one demo equipment item per branch. Example durations are 30/60/90 minutes plus 15 minutes cleanup. These values are entirely hypothetical.
- A DEMO branch meeting on September 16 from 10:00–10:30 AM.
- Six DEMO patients/appointments on September 14, three per branch: pending (no assigned dentist), confirmed, and completed. Invalid all-zero test phone numbers and example.invalid email addresses avoid using real patient contacts. No notifications are sent.

Existing records were preserved, including the owner's dentist profile, Cabuyao configuration and Dental Chair resource. Cabuyao currently has a one-day horizon and a 24-hour minimum notice. These existing rules may produce no offered starts; they were not silently overwritten. Both real branch addresses, contact details, logos and service catalogue names remain unchanged.

## Try it

1. Open http://127.0.0.1:5173. The pink development banner distinguishes this demo. Scroll to Dentists to see fictional profiles and About Me cards.
2. Sign in using your own administrator account. Click **View demo appointments** to select September 14, 2026. Switch branches and filter pending/confirmed/completed. The pending example displays “Awaiting staff assignment.” These records illustrate rendering only; there are no confirm/cancel controls yet.
3. Open **Dentist Schedules**, choose **Santa Rosa**, then **Preview**. Select **Oral Prophylaxis** and **September 16, 2026**.
4. Compare 9:00 AM (fits) with 9:30/10:00 AM (overlap the meeting), 11:30 AM (cleanup extends into lunch), and 1:00 PM (fits). Green times are alternative starts, not independent slots or reservations.
5. Try **Teeth Whitening**. Its longer hypothetical duration and cleanup require a longer uninterrupted period. Compare the eligible dentist list under Dentists with the dated Shifts.
6. Add/remove a blocked period for a demo dentist and check the preview again. The database applies the change; this is not a mocked response. Choose a future date still covered by demo shifts.

The dated preview examples are valid while those dates are in the future. After September 22, enter new future shifts or deliberately reload a reviewed new demo dataset. The script does not silently move dates or overwrite edits.

## Files and cleanup

`supabase/demo/load_demo.sql` is a manual development data script, not a migration and not included by `supabase/seed.sql`. It refuses to run if demo profiles already exist and preserves existing shared settings. Never run it against production.

`supabase/demo/remove_demo_records.sql` removes only the fixed-ID fictional profiles, their shifts/eligibility, named demo blocks, equipment and sample appointments. It deliberately leaves shared branch/service settings for review because those may have been edited. Keep the demo banner enabled until hypothetical settings have been replaced with approved values. Review references before cleanup; it will fail rather than delete an unrelated appointment using a demo dentist.

`.env.local` enables `VITE_DEMO_DATA=true` and sets `VITE_DEMO_APPOINTMENT_DATE=2026-09-14`; this file remains Git-ignored. The flag only labels the UI and never bypasses authentication, RLS or scheduling checks.

## Sprint decision

Verification: real database assertions passed for the six sample appointments and the documented Santa Rosa meeting/lunch cases. Public browser rendering confirmed all three DEMO profiles and the development banner, with no uncaught browser errors. Build and lint passed; checked mobile width had no horizontal overflow. The already-running local server was reused.

The scheduling configuration increment is ready for demonstration, but Sprint 2 is not complete. Joint capacity feasibility, atomic/idempotent booking, concurrent-request tests, staff confirmation/assignment, and public tracking/abuse controls are still outstanding. Adding sample rows does not prove these workflows work. Finish those stories and clinic acceptance before marking Sprint 2 done or moving its unfinished scope to a new sprint without review.
