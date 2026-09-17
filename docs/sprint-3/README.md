# Sprint 3 — release preparation

Goal: prepare the existing app for a controlled Vercel release, while preserving the working booking flow. No optional product features in this sprint.

## Delivery board

| Task | Status | Evidence / remaining action |
| --- | --- | --- |
| Vercel routing and security headers | Implemented | `vercel.json`; deep links rewrite to the app, CSP/frame/referrer/permissions headers configured. Verify actual headers on preview before release. |
| Environment release checks | Tested | Production rejects development Supabase, demo settings and non-publishable browser keys; four automated tests. |
| Recover-password error UX | Tested in browser | Expired/error callback shows a useful message and clears callback URL. Session check disables form until complete. Real email roundtrip still pending. |
| Hosted signup restriction | Verified | Public Auth settings report `disable_signup: true`. |
| Dependency/security review | Reviewed | Production npm audit: zero vulnerabilities. Supabase leaked-password protection still disabled; private RLS/no-policy notices are intentional. |
| Deployable appointment API settings | Development deployed | Version 2 accepts explicit public-key/origin configuration; localhost defaults exist only for development project. |
| Real clinic acceptance/configuration | Owner input required | Replace fictional profiles, shifts and capacity values; approve book/confirm/track/cancel workflow. |
| Fresh migration replay | Pending | Docker/psql unavailable locally. Do not reset hosted development. Run on an isolated local Supabase stack before release. |
| Vercel preview and email roundtrip | Pending account setup | Follow RELEASE.md. No production site or new paid resources created. |

## Verification commands

```powershell
npm.cmd run test:release
npm.cmd run lint
npm.cmd run build
npm.cmd audit --omit=dev --audit-level=high
node --env-file=.env.local scripts/verify-release-api.mjs
```

`npm run build` remains usable for local work. Vercel uses `npm run build:release`, which also checks environment settings. For a local preview configuration check, set `RELEASE_TARGET=preview`; production uses `RELEASE_TARGET=production`. On Vercel, `VERCEL_ENV` chooses the target automatically. Passing the configuration check is not clinical or security sign-off.

## Review and retrospective

Review the appointment flow with the clinic and collect only launch-blocking feedback. Move a task to Done only when its acceptance check passes. This sprint remains open for hosted setup, recovery delivery, migration replay and clinic acceptance; do not advance the sprint number to hide these tasks.

Deferred: reports, notifications, uploads, recurring-shift shortcuts and extra UI refinement. Keep the existing conservative schedule-edit restriction visible during acceptance: future active appointments block configuration edits across branches.
