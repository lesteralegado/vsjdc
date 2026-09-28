        # Sprint 1 — database and staff access

September 15, 2026. **Implemented and tested in hosted development; recovery/configuration acceptance remains open.** No production deployment or GitHub remote was created.

## Delivered

- User-supplied project `vsjdc-development` (`sqqwjiuskzgwxvxukmxi`, ap-northeast-1) inspected empty before changes.
- Applied versioned migration `20260915054452_sprint1_foundation.sql`; local filename matches hosted history. Local Docker reset remains untested because Docker is unavailable.
- Applied `20260915060022_validate_staff_branch_selection.sql` to explicitly qualify branch validation inside the staff-access function; valid and unknown branch assignments tested.
- Public read-only published services and dentist profiles; 15 clinic-supplied services and two branches. No fabricated dentists, appointments, capacities or durations.
- Private staff membership, receptionist branch assignments, administrator RPCs and access-change audit records. Authorization ignores user-editable metadata and checks active membership plus a non-revoked session.
- Protected staff sign-in/dashboard, logout, password recovery/update UI, permitted branch selector, read-only daily appointments and administrator management of existing staff memberships.
- First administrator registered in Auth and granted both branches. Password was chosen privately by the owner; no invitation email was sent by the assistant.
- Browser configuration in ignored `.env.local`; only URL and publishable key. `.env.example` has no credentials. Supabase client/CLI versions pinned; generated database types saved as source.
- Booking/tracking remain disabled independently of catalogue/auth connection. Patients never select a dentist.

## Hosted settings still required

These settings are **not applied to hosted Supabase by editing local config.toml**. Current `/auth/v1/settings` response reports `disable_signup: false`.

1. In Authentication → Sign In / Providers, disable **Allow new users to sign up**. Keep email/password sign-in enabled. Staff membership checks already prevent a public Auth account from accessing staff records.
2. In Authentication → URL Configuration, set development Site URL to `http://127.0.0.1:5173`. Add exact redirect URLs `http://127.0.0.1:5173/staff/password` and `http://localhost:5173/staff/password`.
3. Set the hosted minimum password length to at least 12. Configure suitable email delivery before launch; verify a real recovery email and password update with the owner using the same browser that requested the link. No recovery email has been sent/tested by the assistant.
4. Owner signs in and confirms both branches are available. Record acceptance and any feedback before closing AUTH-01.

References: [Auth configuration](https://supabase.com/docs/guides/auth/general-configuration), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [password-based Auth](https://supabase.com/docs/guides/auth/passwords).

## Verification evidence

Story: visitor/staff page → Supabase client → Auth/PostgREST → RLS/private membership → permitted UI.

| Boundary | Result |
| --- | --- |
| Migration on initially empty hosted development | Passed; history inspected |
| SQL role tests, `supabase/tests/sprint1_access.sql` | Passed; all synthetic fixtures rolled back |
| Anonymous access to appointments/staff RPC | Denied |
| Published vs unpublished service visibility | Passed |
| Receptionist cross-branch appointments and contacts | Hidden by RLS |
| Administrator both-branch context and member deactivation | Passed |
| Appointment writes, private table updates, self-promotion | Denied |
| Inactive accounts, forged metadata, revoked sessions | Denied |
| Real Auth password login through browser | Passed using disposable synthetic administrator |
| Real receptionist login/API checks | Passed via scripts/verify-staff-auth.mjs |
| Global logout and replay of old signed access token | Staff context denied with HTTP 403 |
| Desktop homepage and dashboard | Rendered; no uncaught browser errors in checked flow |
| Mobile 390×844 dashboard and booking | No horizontal overflow; services and preview state rendered |
| Recovery form | Rendered; email delivery/callback/update still pending owner setup |
| npm run build / npm run lint | Passed |
| Fixture cleanup | No test Auth users or appointments remain; one real administrator |

Screenshots are in the workspace's design-reference folder (outside the app repository): sprint1-home.png, sprint1-admin.png, sprint1-staff-mobile.png, sprint1-password-mobile.png.

The final security advisor reports a warning that leaked-password protection is disabled. Enable it if supported by the selected plan; no paid upgrade was requested or made. [Password protection settings](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). It also reports informational “RLS enabled no policy” entries on the three private tables: intentional deny-by-default tables accessed exclusively through guarded functions. Do not add client policies merely to silence these notices. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Performance advisor reports unused indexes on the newly empty database; retain the branch/time and FK indexes until real workload can be measured. [Index notice](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Repeat tests

Run supabase/tests/sprint1_access.sql using the development SQL editor; it wraps fixtures in BEGIN/ROLLBACK and raises an exception on failure. Never run fixture tests in production.

The Auth script requires a disposable, auto-confirmed Auth user whose email ends in @example.invalid, a private active receptionist membership, and Cabuyao assignment. Provide TEST_STAFF_EMAIL and TEST_STAFF_PASSWORD through process environment; run `node --env-file=.env.local scripts/verify-staff-auth.mjs`. It signs out globally. Delete the synthetic Auth user afterward (memberships/sessions cascade). Do not use the owner's real credentials for this script or commit test credentials.

## Provision additional staff

Create the Auth user privately in the Supabase dashboard. Then use the trusted SQL editor to insert the user's UUID, actual display name and receptionist role into private.staff_accounts, and its approved branch UUID into private.staff_branches. Never authorize from raw_user_meta_data. The app's Staff Access screen can then change that member's role/branches/active flag; it cannot change the acting administrator's own access. Account creation and email invitations are not available from the app in this sprint.

## Next sprint

Sprint 2 implements actual dentist shifts, service durations and eligibility, availability calculation, concurrency-safe pending capacity holds, staff confirmation and dentist assignment. Obtain real clinic configuration first. Pending requests hold capacity until staff acts; do not invent an expiry or a dentist-choice field. Patient tracking and abuse prevention must be ready before public booking launch.
