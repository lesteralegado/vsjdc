# Requirements and MVP

Status: Sprint 0 review baseline, September 14, 2026. Confirmed sections record user decisions. Proposed details require review before implementation.

## Confirmed product requirements

- Keep React, TypeScript, Vite, Tailwind and the established UI in `vsjdc`.
- Use both supplied clinic logo images without distortion, cropping, recoloring or redrawing.
- Appointment hub provides booking and tracking.
- Patients choose branch, service, date and time. **Patients never choose a dentist.**
- Dentist cards are informational: picture, name and About Me. Use actual supplied data or explicit placeholders.
- Tracking takes appointment reference and mobile number and supports loading, not-found, error and appointment detail states.
- Booking distinguishes available/unavailable times and provides valid alternative suggestions.
- Real services, profiles and appointment information come from the backend when connected, not Figma sample records.
- Clinic details use the supplied Cabuyao/Santa Rosa addresses, hours, phones, email and social links in `src/data/clinic.ts`.
- Responsive patient UI, secure deployment and iterative Agile delivery are required.

## Confirmed clinic decision log

All entries below were confirmed by the user on September 14, 2026.

| ID | Confirmed decision | Implementation consequence |
| --- | --- | --- |
| D01 | Staff confirmation is required. | Submission creates a pending request; it is not displayed as confirmed. |
| D02 | Staff assign dentists later using branch capacity limits. | No dentist ID in patient booking input; later staff assignment must validate service eligibility and conflicts. |
| D03 | Receptionists access only assigned branches; administrators access both. | Enforce active membership and branch permissions in the backend/RLS. |
| D04a | Pending requests hold capacity until staff acts. | No automatic expiry; show pending requests to staff; cancellation/rejection releases capacity safely. |
| D05a | Staff check the patient's requested time and whether slots remain that day; the system calculates availability from schedules and service durations. | Calculate compatible capacity, accounting for active pending holds. Do not use manually invented slots or a simple daily count. |
| D08a | Local only for now. | No GitHub remote, hosted project or deployment in Sprint 0. Prepare local files for future use. |

## MVP scope

| Actor | Capability |
| --- | --- |
| Patient/visitor | Read clinic information, submit booking, retrieve limited appointment status securely |
| Receptionist | Sign in; view permitted branch appointments; confirm, assign, reschedule, cancel and check in within policy |
| Administrator | Manage staff access, services, branches, dentist profiles/schedules; review audit history |
| Dentist | Public informational profile; separate dentist login is optional and not committed for the first release |

The proposed MVP excludes payments, insurance, full medical/dental records, diagnoses, prescriptions, patient accounts and SMS reminders. Operational monitoring is included; broad patient analytics are not. New requests become backlog items. Initial booking is for one service, matching the current UI; multi-service appointments require separate design.

## Remaining decisions and inputs

| ID | Needed input | Current position | Needed by |
| --- | --- | --- | --- |
| D04 | Lead time, booking horizon, rejection/cancellation/rescheduling rules and staff review responsibility | Holds until staff acts are confirmed; no numerical deadlines or automatic expiry approved. | Booking/status implementation |
| D05 | Actual dentist shifts, service eligibility/durations, breaks, buffers, absences, physical resources and cross-branch travel constraints | System-calculated availability confirmed. No actual scheduling data supplied. Use clinic-inputs.md and the service worksheet. | Availability implementation |
| D06 | Tracking verification and customer changes | Propose random reference + mobile for limited status; OTP or staff assistance for sensitive details/changes. Exact response policy not yet approved. | Tracking implementation |
| D07 | Data retention, privacy notice, minors and deletion-request handling | Collect appointment essentials only. No retention duration or responsible privacy contact supplied. | Real patient data |
| D08 | Future account ownership and hosting budget | Local only approved now. Later use clinic-owned accounts with individual collaborator access and MFA. | Hosted provisioning |
| D09 | Notifications and staff follow-up procedure | Display reference after committed write. Manual follow-up initially proposed; email/SMS needs channel/budget approval. | Pilot |
| D10 | Actual profiles, exact map pins, operations/recovery owner and pilot branch | Not yet verified/supplied. | Launch |

Business hours alone cannot generate valid appointments: shifts, eligibility, duration, breaks, buffers, capacity and existing reservations matter. Walk-in rules in the PDF were not approved as clinic policy.

## Proposed appointment lifecycle

`pending → confirmed → checked_in → completed`

Additional proposed paths: pending → cancelled (including staff rejection with a reason); confirmed → cancelled/no_show. Staff confirmation is approved. Detailed transition and cancellation permissions remain D04 review items. There is no automatic pending expiry.

Rescheduling is an audited time/resource change. Staff-only actions must be authorized server-side. Patients cannot directly change status, branch permissions or dentist assignment. Pending and confirmed reservations must both be accounted for when calculating availability.

## Nonfunctional acceptance baseline

- Public callers cannot read private appointment/contact tables.
- Staff branch restrictions hold for direct API requests and database policies, not only the UI.
- Active requests remain jointly schedulable: do not count one qualified dentist twice across overlapping services/branches. Later assignment must preserve feasibility for other held requests.
- Conflicting concurrent requests cannot over-reserve capacity; idempotent retries cannot duplicate appointments.
- Use Philippine time for display/clinic rules and timezone-aware timestamps for appointment instants.
- Mobile/keyboard form flows include accessible validation and recovery from network errors.
- No real patient data in staging, issue reports, screenshots, fixtures, logs or analytics.
- Expected traffic, latency targets and acceptable recovery/data-loss targets must be established before load tests and launch; no unsupported uptime promise.

## Review process

Record future decisions by ID, date and answer. Update dependent stories, schema design and tests together. The accepted UI is not evidence that backend security or unresolved clinic policies are already implemented.
