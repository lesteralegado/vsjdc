# Sprint 0 setup report

Date: September 14, 2026. Scope: local planning and development foundation.

## Prepared

- Local Git repository initialized on `main` inside `vsjdc`; no remote added.
- `.nvmrc` selects Node 24; the installed runtime is Node 24.18.0.
- `.github/workflows/ci.yml` prepares clean dependency install, lint, and production build checks. Repository permissions are read-only, action references are pinned, and no deploy step is included.
- Pull-request and user-story templates added for acceptance criteria and security review.
- Environment files, private key files, dependency/build output, and common local data/test artifacts are ignored.
- Requirements, confirmed decision record, permissions, conceptual ER diagram, backlog, working agreement, security/release plan, and clinic-input worksheet are available locally.

## Verification performed

- `npm.cmd run lint` passed.
- `npm.cmd run build` passed (TypeScript + Vite).
- Git ignore checks matched `.env`, `.env.production`, `node_modules`, and `dist`.
- Remote configuration is empty; nothing was uploaded or deployed.
- Workflow action references were checked against their official upstream commit pages. Actual GitHub Actions execution is deferred because the repository is local only.

## Windows Git note

The sandbox-created `.git` directory and the user's project directory have different Windows owners. Changing owner was denied by Windows. An exact-path `safe.directory` entry for `C:/V. San Juan Dental Clinic/vsjdc` was added to the user's Git configuration so the newly initialized, trusted local repository can be used. No wildcard/global trust bypass was added.

## Limits and handoff

- No backend, database migrations, accounts, or live booking behavior were implemented in Sprint 0.
- No GitHub repository or hosted infrastructure was created, per the local-only decision.
- The generated CI workflow has not run on a GitHub runner; local lint/build success does not claim Linux clean-install verification.
- Existing UI behavior remains unchanged. No new browser tests were needed for these documentation/repository changes.
- Real shifts, service durations, eligibility, buffers, and physical resource inputs are needed before live scheduling. See clinic-inputs.md.
- Sprint 1 candidate scope is local database foundations and secure staff access. Confirm capacity at sprint planning and review local backend prerequisites before installing tools.
