# Sprint 0 — project foundation

Started: September 14, 2026. Status: **Ready for review — core workflow decisions recorded; implementation inputs tracked.**

## Goal

Prepare the established clinic UI for a secure, testable backend implementation without guessing clinic policies. Sprint 0 does not enable live booking, create staff accounts, deploy production, or collect patient data.

## Read in this order

1. [Requirements and MVP](requirements.md) — confirmed scope, actors, rules, and open decisions.
2. [Permissions matrix](permissions.md) — proposed access boundaries and denial tests.
3. [Data and architecture design](data-design.md) — conceptual entities, booking integrity, and API boundaries.
4. [Prioritized backlog](backlog.md) — user stories, acceptance criteria, dependencies, and Sprint 1 candidates.
5. [Security and release plan](security-release.md) — threats, environments, CI, testing, and launch gates.
6. [Agile working agreement](working-agreement.md) — workflow, roles, Definition of Ready/Done, and review agenda.
7. [Clinic input worksheet](clinic-inputs.md) — schedules and durations to collect before live availability.
8. [Setup report](setup-report.md) — local repository and verification evidence.

## Current evidence

- React + TypeScript + Vite + Tailwind UI exists in this repository.
- Both original clinic logos are local image assets.
- Booking offers branch, service, date, and time; patients do not select dentists.
- Dentist cards are informational; no real dentist identities have been supplied.
- `src/lib/clinicApi.ts` is a disconnected adapter. Booking, tracking, and authentication are not live.
- `/staff/dashboard` is a publicly reachable, empty UI preview. It must not receive real data until authorization is implemented.
- No Git repository was present when Sprint 0 started. Local repository setup and a CI workflow are part of this sprint.

## Deliverables and gates

| Deliverable | Status |
| --- | --- |
| Requirements and MVP baseline | Prepared for clinic review |
| Role/branch permission matrix | Branch access confirmed; detailed actions for review |
| Conceptual database model | Draft; approval/assignment/hold rules recorded; capacity details pending |
| Prioritized backlog and acceptance criteria | Prepared |
| Security, testing, and deployment plan | Prepared |
| Local Git initialization and CI files | Verify in setup report |
| GitHub repository, remote CI run, branch rules | Deferred by user: local only |
| Clinic booking/assignment decisions | D01–D03/D04a/D05a confirmed; actual schedules/durations pending |
| Staging resource ownership and budget | Pending D08 |

Sprint 0 planning is complete only when the core decisions are recorded, local setup is verified, and Sprint 1 scope is reviewed. GitHub/hosted provisioning is explicitly deferred by the user, not a Sprint 0 blocker. Actual schedules, service durations and resource settings are required before live scheduling in Sprint 2. Unresolved decisions remain explicit; a suggested answer is not approval.

## Decision review

- **D01 confirmed:** Staff confirmation required.
- **D02 confirmed:** Staff assign dentists later, using branch capacity.
- **D03 confirmed:** Receptionists are branch-restricted; administrators access both.
- **D04a confirmed:** Pending requests hold capacity until staff acts.
- **D05a confirmed:** System calculates availability from schedules and service durations.
- **D08a confirmed:** Local only for now.

The remaining decisions are listed in [requirements.md](requirements.md). Foundation work can proceed without these answers; the remaining capacity-dependent database constraints cannot be finalized.

## Proposed next sprint

Sprint 1: establish a local test database, versioned migrations, invite-only staff authentication, branch authorization, and a database-backed service catalogue. Demonstrate an allowed request and a denied cross-branch request. Check local backend prerequisites first; hosted staging remains deferred. Build live booking in Sprint 2 after actual scheduling inputs are supplied.
