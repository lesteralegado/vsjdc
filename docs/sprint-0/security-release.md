# Security, testing and release plan

Status: proposed controls and release gates. This document is not a security certification or proof that the current UI has these controls.

## Threats tied to this clinic

| Threat | Control to implement | Evidence required |
| --- | --- | --- |
| Public patient-data exposure | Private schema/table grants, RLS, explicit field projections, narrowly scoped functions | Anonymous direct API/table access denied |
| Cross-branch access or role escalation | Server-enforced active memberships and roles; user-editable metadata never grants access | Role/branch negative tests |
| Appointment/reference guessing | Unpredictable references, hashed lookup, rate limiting, limited output; OTP policy D06 | Repeated failed lookup blocked; no credential-match disclosure |
| Double booking or retry duplicates | Atomic capacity transactions, interval/resource rules, idempotency | Concurrent submission and retry tests |
| Abusive booking spam | Request validation, size limits, rate limits and risk-based challenge; phone verification decision | Abuse tests and monitored rejection metrics |
| Credential theft / stale staff sessions | Individual accounts, MFA for admins, controlled invitations, safe recovery and revocation | Old/deactivated sessions denied; recovery tested |
| Secret leakage | Server-only privileged keys, ignored env files, least-privilege CI and secret scanning | Built asset/repository inspection |
| Sensitive logs and test data | Redaction, fictional fixtures, minimal analytics | Log and staging fixture review |
| XSS / malicious uploads | Avoid unsafe HTML, validate uploaded images and permissions, appropriate CSP/security headers | Input/upload and browser checks |
| Outage or destructive migration | Reviewed migrations, backups, restore drill, monitoring and separate app/database recovery procedures | Staging restore and rollback evidence |

Supabase publishable keys may be shipped in a browser with correctly restricted access; privileged secret/service-role keys bypass RLS and must never be exposed. `VITE_*` values are bundled into client code. An ignored `.env` file alone does not make a client variable secret. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys) and [Vite environment variables](https://vite.dev/guide/env-and-mode).

## Environments and ownership

- Local: developer tools and fictional data.
- Staging: separate backend and staff test accounts; protected preview URL; no production patient data or production secrets.
- Production: clinic-owned accounts/domain, named operations owner and recovery contact; only approved releases.
- Pull-request previews must never default to the production database. Confirm hosting/Supabase plan costs and backups before provisioning paid resources.
- User chose local only for now (D08a). GitHub owner/repository, Supabase organization, hosting account, domain and SMTP/OTP providers are deferred D08/D09 decisions. No external resources are provisioned by Sprint 0.

## CI baseline

The included GitHub workflow installs from package-lock.json with `npm ci`, runs lint, and builds with Node 24. It has read-only repository permissions, no deployment secrets and no deployment action. Pull requests run unprivileged checks; do not switch to `pull_request_target` to expose secrets to untrusted code. Action versions are pinned to commit SHAs; review dependency-update pull requests.

Before GitHub use, establish the repository root as `vsjdc`. Required branch checks: `UI checks`; require pull-request review and disallow force-push to main where the selected GitHub plan supports these rules. The workflow exists locally until pushed and run on GitHub; remote green status must be observed, not assumed.

Add database/RLS tests and integration tests with the corresponding backend stories. Do not add an always-green placeholder test command. Add secret scanning and dependency/security review to the repository configuration; findings require triage, not blind automatic breaking upgrades.

## Test strategy

- Unit: mobile/date validation, time interval logic, permitted status transitions.
- Database integration: grants/RLS, membership revocation, reference lookup, transaction rollback, capacity conflicts and idempotency.
- API: authentication, branch authorization, rate limits, payload validation, response field allowlists, failure paths.
- Browser: complete booking → pending → staff confirmation/assignment → tracking; reschedule/cancel; keyboard/mobile; unavailable network.
- Concurrency: simultaneous last-capacity booking, staff reassignment at another branch, cancellation racing confirmation, duplicate notification delivery if enabled.
- Clinic UAT: both branches use fictional data and sign off their daily workflows.

## Production go/no-go

Do not connect real patient data until staff-route protection and backend access tests pass. Then require: core clinic decisions resolved; critical defects fixed; tested migrations; verified domain/HTTPS and redirect URLs; appropriate security headers; exact Maps destinations confirmed; privacy notice and retention owner; real service durations/capacity; monitoring alerts delivered; backup restoration rehearsed; support and incident contacts; approved pilot branch.

Database recovery targets (acceptable data loss and recovery time) are clinic decisions. Verify coverage of both database and storage assets; a frontend rollback does not reverse a schema migration. Prefer backward-compatible migrations and document recovery for each breaking change. Run a limited staff-supervised pilot before wider launch.

Reference checklists: [Supabase production readiness](https://supabase.com/docs/guides/deployment/going-into-prod), [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/), [GitHub Node CI](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs).
