# Agile working agreement

## Roles and cadence

- Product owner: clinic representative/user; decides workflow, priorities, acceptance, and business rules.
- Developer: implementation, estimates, tests, migration review, and technical documentation.
- Clinic reviewer: receptionist/administrator designated by the owner; performs workflow acceptance tests.
- Security/release reviewer: named before production launch; independent review is preferable for private-data access controls.

Proposed cadence: one- or two-week timeboxes, selected at sprint planning. Sprint 0 is an enabling iteration, not a replacement for requirements/design/testing within later sprints.

At planning, agree one sprint goal and a realistic subset of Ready stories. Daily, record completed work, next action and blockers. At the end, demonstrate actual working behavior in staging, gather clinic feedback, and record one improvement for the next sprint. Do not declare a sprint complete based only on generated files or UI screenshots.

## Board and change flow

Backlog → Ready → In progress → Review → Testing → Done. Mark blocked items with reason, owner, and next unblock action. Suggested work-in-progress limit: one main implementation story per developer.

Use branches such as `feature/AUTH-01-staff-login` or `fix/BOOK-02-duplicate-request`. Keep changes small enough to review. Link pull requests to backlog IDs. A reviewable PR states user-visible behavior, acceptance evidence, and material security/data effects.

## Definition of Ready

- Actor, goal and acceptance criteria are explicit.
- Business decisions and permissions needed for the story are confirmed.
- Dependencies and test data are available.
- Sensitive data and abuse cases are identified.
- Scope fits the sprint; larger stories are split.

## Definition of Done

- Acceptance criteria implemented and verified with evidence.
- Build and lint pass; relevant unit/integration/browser tests pass.
- Database/RLS and endpoint denial tests accompany private-data changes.
- No secrets or real patient fixtures in code, logs, screenshots, or issues.
- Changed UI works with keyboard and relevant mobile/desktop sizes.
- Schema and environment changes are documented and reproducible.
- PR reviewed; clinic review completed where workflow changes.
- Staging demonstration succeeds; unresolved limitations are explicit.

An empty preview is not backend completion. A mocked test response verifies rendering, not production access controls. Do not count a local CI-equivalent command as an actual GitHub Actions run.

## Sprint 0 review agenda

1. Review confirmed D01–D03 and D04a: staff confirmation, later staff assignment, branch restrictions, and holds until staff acts.
2. Assign an owner/date for actual capacity, service durations, and scheduling exceptions.
3. Review admin/receptionist permissions and optional dentist-login scope.
4. Record local-only setup; defer GitHub ownership, repository visibility and hosted staging budget until requested.
5. Accept the MVP boundary and select Sprint 1 stories.
6. Record any still-blocked items; do not invent policy defaults.

## Lightweight progress measures

Track accepted stories, blocked days, escaped defects, and lead time from In progress to Done. Use the first sprints to learn team capacity rather than treating story points as hours or promising a fixed delivery date.
