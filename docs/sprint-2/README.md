# Sprint 2 — scheduling configuration (earlier configuration increment)

**September 16 update:** Booking, tracking, staff confirmation and capacity holds are now implemented and tested in development. The configuration-only status below is historical. Use [current verification and delivery plan](BOOKING-VERIFICATION.md) for sprint status and the working demo.
September 15, 2026. **Configuration increment implemented and tested; clinic review and real inputs pending.**

Update: the owner subsequently requested dummy data. Clearly labeled fictional records are now loaded in development, with existing user-entered records preserved. See [demo walkthrough](DEMO-WALKTHROUGH.md) for the exact dates, examples, and cleanup instructions. Earlier zero-record verification below describes the state before this requested demo load.

The owner confirmed that actual dentist identities, shifts, durations, equipment limits and booking windows are not ready, and selected “build configuration screens” with patient availability left closed. This increment delivers that scope. It does not complete the public booking/confirmation workflow.

## Open and use

Start the existing app with `npm.cmd run dev -- --host 127.0.0.1 --port 5173`. Sign in at http://127.0.0.1:5173/staff/login and open **Dentist Schedules**.

Select the branch in the sidebar. Enter actual clinic-approved information in this order:

1. **Branch:** opening days/times, treatment chairs, minimum notice, booking window and spacing between offered start times. No operational numbers or weekdays are prefilled.
2. **Dentists:** name, optional HTTPS photo URL, About Me, minimum cross-branch travel time, active status and eligible services. Profiles are unpublished by default. These shared settings apply across both branches; patients cannot select dentists.
3. **Equipment:** named shared equipment and available units. Chair count belongs under Branch.
4. **Services:** actual procedure duration, cleanup buffer, whether offered at this branch, and equipment units required. Zero equipment units means that equipment is not required. Disabled/unconfigured services generate no preview times.
5. **Shifts:** dated work periods in Philippine time. Record separate periods before/after a break. No recurring schedule generator is included yet.
6. **Blocked periods:** branch closures or dentist leave for this branch. For leave affecting both branches, record it for both.
7. **Preview:** choose a service/date and inspect starts that fit one prospective appointment. Green/gray states are alternatives; they are not independent capacity units or reservations.

Publishing an actual dentist profile makes its name/photo/bio visible on the existing public dentist cards. The photo field accepts an existing HTTPS image URL; file upload/storage management is not part of this increment.

## Permissions and integrity

| Operation | Administrator | Receptionist |
| --- | --- | --- |
| Branch settings, services, equipment, shared dentist profiles/eligibility | Both branches | Denied |
| Shifts and blocked periods | Both branches | Assigned branch only |
| Staff preview and branch configuration reads | Both branches | Assigned branch only |
| Public scheduling reads/writes | No patient endpoint enabled | No patient endpoint enabled |

Database functions enforce permissions, not just visible controls. Private tables have RLS enabled and no direct client grants. Public RPC wrappers use SECURITY INVOKER and delegate to scoped private functions that check active staff/session access. Mutations share a transaction advisory lock across branches to serialize dentist/travel changes. Concurrent public booking is not implemented or claimed as tested.

The database rejects shifts outside branch hours, overlapping dentist shifts at either branch, insufficient travel gaps, invalid resource requirements, and branch-hour changes that would invalidate future shifts. Start-inclusive/end-exclusive comparisons allow adjacent shifts at the same branch; travel time is additionally required across branches.

**Conservative reservation guard:** while any future pending/confirmed/checked-in appointment exists, configuration writes are rejected across both branches. Preview refuses dates containing existing holds at either branch. This avoids invalidating appointments or pretending a simple dentist count proves joint feasibility. Reservation-aware edits and allocation across overlapping service pools are outstanding booking-engine work.

## Delivery board

| Item | Status | Evidence / next action |
| --- | --- | --- |
| SCH-01a: staff configuration forms and migration | Review | Applied migration 20260915063238_sprint2_scheduling; typed RPC adapter and seven scheduling panels |
| SCH-01b: shift, eligibility, travel and resource validation | Testing passed | SQL integration assertions; clinic acceptance remains pending |
| SCH-01c: single-appointment staff preview | Testing passed | Shift coverage, full cleanup duration, break and closure checks; fails closed for existing holds |
| Clinic scheduling inputs | Waiting on owner | Owner explicitly said not ready; no real configuration or fabricated dentists saved |
| BOOK-01/BOOK-02: public availability and atomic pending holds | Not implemented | Requires joint feasibility, idempotency, concurrency tests and approved clinic inputs |
| STAFF-01: confirm requests and assign dentist later | Not implemented | Depends on pending-hold engine; no patient dentist selector |
| Public tracking/abuse controls | Not implemented | Remains prerequisite to public booking launch |
| Sprint 1 hosted Auth settings/recovery acceptance | Open | See ../sprint-1/README.md; not silently marked complete |

## Verification

- `npm.cmd run build` and `npm.cmd run lint` passed. Scheduling code loads on demand, keeping it out of the initial bundle.
- `supabase/tests/sprint2_configuration.sql` passed on hosted development: settings, eligibility, equipment limits, valid shifts, overlap/travel rejection, invalidating branch-hour rejection, breaks/buffers, closure preview, role/branch restrictions, denied private-table/anonymous access, and future-reservation guard. All SQL fixtures run inside BEGIN/ROLLBACK.
- Browser → real Supabase Auth → configuration RPC → private resource table → refreshed form passed using a disposable synthetic staff account and named equipment fixture.
- Browser receptionist view showed only Cabuyao and the Shifts/Blocked periods/Preview controls after changing the synthetic account's role.
- Desktop scheduling page and mobile 390×844 forms inspected; no horizontal overflow in the checked mobile layout. No uncaught browser errors in the checked flow.
- In-progress form retained its value after a focus-triggered session refresh. Actual identity/permission changes reset child state; failed checks hide the staff app.
- All temporary browser fixtures, their audit events and the synthetic Auth account were removed. Final query confirmed zero branch settings, shifts, dentist profiles, appointments and test users. Real admin account preserved.
- Screenshots: ../design-reference/sprint2-branch-desktop.png, sprint2-dentists-mobile.png, sprint2-receptionist-mobile.png (workspace artifacts outside the app repo). The receptionist screenshot preceded a small fix: a form disabled for missing settings now says “Save configuration,” not “Saving…”.

Security advisor: informational no-policy notices on private deny-by-default tables; do not add public policies merely to silence them. [Explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Existing hosted leaked-password protection warning remains; [enable it where supported](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No new paid resources or production deployment were created.

## Sprint review and next increment

Clinic reviewer should enter approved configuration for each branch, demonstrate saving and previewing a real shift, review public dentist profiles before publishing, and record feedback. Test fixtures are never approved clinic data.

After configuration review, implement joint scheduling feasibility across all held requests, atomic/idempotent pending requests, later staff assignment and confirmation, safe rescheduling/cancellation, and public endpoint abuse controls. Pending requests must continue holding capacity until staff acts; there is no automatic expiry.

Retrospective improvement: split scheduling setup from booking allocation so missing clinical inputs do not force fabricated defaults, and preserve unfinished forms during routine session validation.
