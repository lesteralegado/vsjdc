# Final owner and clinic setup

Keep this list for the final setup session. The technical checks that do not need these decisions are being completed separately. No passwords or server secrets need to be pasted into chat.

| Order | What you need to provide or configure | What happens afterward |
| --- | --- | --- |
| 1 | Make `hklsll/vsjdc` private. GitHub still reported it public on September 22. | Publish the prepared preview branch, open a review, and run CI. Do not merge into production yet. |
| 2 | Create a Managed Cloudflare Turnstile widget for the approved website hostnames. Put its public key in Vercel as `VITE_TURNSTILE_SITE_KEY`; put its secret in Supabase as `TURNSTILE_SECRET_KEY`. | Deploy the coordinated frontend/Edge Function update and verify protected booking. [Detailed instructions](BOOKING-PROTECTION.md). |
| 3 | Confirm the stable Vercel site URL and provide/select the separate production Supabase project. Configure the matching public URL/key, exact allowed origins and Auth password-recovery redirect. | Replay migrations into the isolated target, check production configuration and verify every direct route. Production booking stays closed during setup. |
| 4 | Supply approved dentist names/bios/photos, shifts/breaks, service eligibility and durations/buffers, chairs/equipment, booking notice/window, and expected daily volume. Confirm branch contact details and exact map pins. | Enter real configuration, remove demo data from the production path and test realistic capacity. The current 60-active-appointment/day bound covers both branches combined. |
| 5 | Configure the clinic's SMTP provider and supported password protection. Confirm real staff accounts and branch assignments. Sign in yourself for final staff acceptance; do not share passwords. Authorize a recovery email test when ready. | Verify actual sign-in, password recovery, role/branch restrictions, confirmation, rescheduling and logout in the browser. |
| 6 | Approve the clinic privacy notice, retention/deletion policy, backup recovery targets and the person responsible for daily support. Confirm the backup/restore facilities on the selected hosting plan. | Complete the restore rehearsal and operating procedure. Technical tests cannot choose the clinic's retention policy or approve clinical scheduling rules. |
| 7 | Clinic staff approve the complete patient/staff workflow and launch timing. | Perform final release checks, enable production booking, monitor the first requests and retain a verified rollback path. |

## Current limits that must stay visible

- Bot protection is implemented locally but is **not active on the hosted endpoint** until the coordinated deployment.
- The development database still intentionally contains demo profiles/patients. Its demo dentist shifts have expired; the September 22 readiness check found no future eligible shifts in either branch. This is not production scheduling data.
- Fresh migration replay is prepared as an isolated CI job but has not run here because Docker is unavailable. A real restore rehearsal remains outstanding.
- Browser fixture checks and database authorization tests pass separately. Final authenticated browser-to-hosted-database acceptance remains required.
- A build passing is not permission to open production booking. Work through [FIX-CHECKLIST.md](FIX-CHECKLIST.md) and [RELEASE.md](RELEASE.md).
