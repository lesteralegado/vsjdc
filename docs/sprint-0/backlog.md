# Product backlog

Priority: P0 = foundation/release blocker, P1 = MVP feature, P2 = later. Status is local planning status, not a GitHub issue. Estimates are relative sizing for discussion, not delivery promises.

## Sprint 0 board

| ID | Task | Status | Evidence / remaining work |
| --- | --- | --- | --- |
| S0-01 | Inspect UI and integration baseline | Done | Disconnected adapter and unprotected empty dashboard documented |
| S0-02 | Draft requirements and scope | Review | requirements.md; clinic has answered D01–D03 |
| S0-03 | Draft role/branch permissions | Review | permissions.md; branch scoping confirmed |
| S0-04 | Draft data and capacity model | Review | data-design.md; calculation/hold rules confirmed; actual scheduling inputs pending |
| S0-05 | Prepare backlog and working agreement | Review | This file and working-agreement.md |
| S0-06 | Prepare repository and CI baseline | Done | Local Git, workflow, templates, ignore rules; see setup-report.md |
| S0-07 | Establish GitHub ownership and branch protection | Deferred | User chose local only; revisit before hosted deployment |
| S0-08 | Approve Sprint 1 scope and capacity inputs | Review | Clinic decision log and sprint review |

## Sprint 1 candidate commitment

Goal: staff can securely sign in and read only the permitted branch's data; the public service catalogue comes from the database. On September 15 the user supplied a dedicated hosted development Supabase project, reopening the backend environment decision. GitHub and production deployment remain deferred. See ../sprint-1/README.md for actual delivery and verification status.

| ID | User story / task | Priority / size | Dependencies | Acceptance criteria |
| --- | --- | --- | --- | --- |
| FND-01 | As a developer, I can reproduce the schema from versioned migrations. | P0 / M | Local Supabase/Docker prerequisites | Fresh test DB rebuild succeeds; keys/relationships/grants/RLS defined; test fixtures contain no real patient information. |
| AUTH-01 | As an invited staff member, I can sign in, recover access, and sign out. | P0 / M | FND-01 | No self-registration as staff; valid credentials create a session; invalid/disabled accounts denied; recovery configuration verified; logout removes access; dashboard preview cannot expose live records. |
| AUTH-02 | As an administrator, I control staff branch access. | P0 / L | AUTH-01, approved D03 | Admin sees both branches; receptionist sees assigned branches only; direct API/RLS denial tests pass; role self-promotion and cross-branch ID substitution denied; membership changes take effect safely. |
| CAT-01 | As a visitor, I see published services and dentist information. | P1 / S | FND-01 | Public fields only; unpublished/private information inaccessible; actual catalogue returned; no dentist selection added; no fabricated biographies. |
| OPS-01 | As a developer, I can review a change in staging before release. | P0 / S | GitHub/D08 | Clean install, lint and build run in CI; branch rules configured; staging credentials isolated; no production deployment from pull requests. Hosted portion deferred until D08 is reopened. |

Do not commit to every candidate if team capacity is insufficient. Start FND-01 → AUTH-01 → AUTH-02, with CAT-01 and OPS-01 included only within capacity. Live booking is Sprint 2, not a hidden addition to Sprint 1.

## Subsequent MVP backlog

Sprint 2 configuration increment is implemented for review: [delivery board and tests](../sprint-2/README.md). The owner requested configuration screens while actual clinical inputs are unavailable. Update September 16: public availability, atomic pending holds, staff confirmation and tracking are implemented and verified in development. Clinic acceptance and production setup remain open. The owner prioritized completing the essential MVP; see [current delivery plan](../sprint-2/BOOKING-VERIFICATION.md).

| ID | User story / task | Priority / size | Dependencies | Acceptance criteria |
| --- | --- | --- | --- | --- |
| SCH-01 | As staff, I configure dentist shifts, service duration, eligibility and working exceptions. | P0 / L | D05 scheduling inputs, AUTH-02 | System derives capacity from clinic-approved schedules/durations/resources; reject invalid ranges; no slots outside working windows; edits cannot silently invalidate existing reservations. |
| BOOK-01 | As a patient, I see valid branch/service appointment times. | P1 / L | SCH-01 | No dentist selector; available/unavailable states and actual-date alternatives; service duration fits full capacity interval; stale availability handled. |
| BOOK-02 | As a patient, I submit one pending appointment request. | P0 / L | BOOK-01, hold policy, D07 | Staff confirmation required; pending holds remain until staff acts; server validation; transaction-safe capacity reservation per approved rule; concurrent requests respect capacity; repeated submission returns one appointment; changed payload reuse rejected. |
| STAFF-01 | As branch staff, I confirm requests and assign eligible dentists later. | P1 / L | BOOK-02, AUTH-02 | Explicit authorized confirmation; dentist fits service/shift/branch; cross-branch time conflict denied; assignment fails safely without losing original reservation; audit entry created. |
| TRACK-01 | As a patient, I securely check my request status. | P0 / M | BOOK-02, D06 | Random reference; no public appointment-table reads; limited result; rate limiting; failures do not reveal which credential matched; loading/not-found/error/success tests; OTP requirement resolved. |
| STAFF-02 | As staff, I reschedule/cancel/check in/complete appointments. | P1 / L | STAFF-01, D04 | Only allowed transitions; no capacity leak or overlapping assignment; reschedule atomic; events record actor and change; duplicate/stale actions handled. |
| SEC-01 | As clinic owner, I can demonstrate access and privacy controls. | P0 / M | Every data feature | Role matrix tests, endpoint abuse tests, secret/dependency checks, log redaction, session revocation and storage permission tests pass. |
| UAT-01 | As clinic staff, I can complete daily workflows in staging. | P0 / M | MVP stories | Both branches test approved scenarios with fictional data; mobile and keyboard workflows pass; feedback triaged; clinic records acceptance. |
| REL-01 | As clinic owner, I can safely launch and recover the service. | P0 / M | UAT-01, SEC-01, D08/D10 | Domain/HTTPS; production isolation; real map pins; support ownership; monitoring alerts; backup restore drill; rollback plan; limited pilot accepted. |
| NOTIFY-01 | As a patient, I receive appointment messages. | P2 / M | D09, approved provider/budget | Delivery retries and deduplication; no sensitive message contents; failure does not undo a committed booking. |

## Concrete booking acceptance scenarios

- Given a branch has one remaining compatible capacity unit, when two simultaneous valid requests arrive, at most one reserves that unit; the other gets a conflict and refreshed alternatives.
- Given a committed request, retrying with the same idempotency key returns the original reference without duplicating the appointment.
- Given a pending request, the UI does not label it confirmed before an authorized staff action.
- Given no assigned dentist, tracking displays an unassigned state rather than inventing a name.
- Given an assigned dentist with a conflicting booking at the other branch, staff assignment is rejected even if branch-level capacity remains.
- Given a Cabuyao-only receptionist, attempts to read or modify a Santa Rosa appointment are denied through the API, not merely hidden in the interface.

New clinic requirements become backlog items with priority, acceptance criteria, and a dependency assessment. Avoid silently adding payments, medical records, or patient accounts to this release.
