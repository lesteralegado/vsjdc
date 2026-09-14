# Proposed permissions matrix

D03 confirmed September 14, 2026: receptionists are branch-restricted; administrators can access both branches. Detailed action permissions below remain a proposed implementation baseline, not existing application behavior. Deny access by default.

| Action | Visitor/patient | Receptionist | Administrator | Optional dentist role |
| --- | --- | --- | --- | --- |
| Read published clinic/services/profile information | Yes, public fields only | Yes | Yes | Yes |
| Request available times | Limited public endpoint | Assigned branches | Both branches | If role approved |
| Submit booking | Validated endpoint only | Assigned branches | Both branches | No by default |
| Track appointment | Exact verified lookup, limited response | Assigned branches | Both branches | Own assigned appointments only if approved |
| List patient appointments/contact details | No | Assigned branches, necessary fields only | Both branches | Only necessary assigned records if approved |
| Confirm, assign, check in, reschedule, cancel | No direct write; request staff assistance initially | Assigned branches, permitted transitions | Both branches, permitted transitions | No by default |
| Edit dentist schedules/service configuration | No | Read only | Yes | No by default |
| Publish dentist profiles/photos | No | No | Yes | No by default |
| Invite/deactivate staff, change roles/memberships | No | No | Yes | No |
| Read audit history | No | No initially | Yes | No |
| Alter/delete audit events | No | No | No through application | No |
| Bulk export/delete patient data | No | No | Separate reviewed operation; not default CRUD | No |

## Enforcement design

- Invite-only staff registration. No public sign-up path may grant staff privileges.
- Authentication identifies a user; role and branch membership determine permissions.
- Store staff authorization in administrator-controlled membership records. Never trust user-editable profile metadata, a client-supplied role, local storage, or hidden navigation.
- Check account active status, branch membership, and allowed state transition on sensitive actions. Design revocation so deactivated staff lose access despite an unexpired client token.
- RLS on exposed tables with explicit policies; private tables are not public just because a frontend needs an endpoint.
- Protect storage separately: public, approved dentist photos may be readable; uploading/deleting requires administrator permissions. No patient documents in public buckets.
- Public booking/tracking endpoints validate requests and return an allowlisted response; they do not provide anonymous appointment-table access.
- Staff dashboard stays a data-free preview until route/session checks AND backend authorization are implemented.

## Required negative tests

1. Anonymous caller cannot list appointments, patient contacts, staff memberships, or audit events.
2. Cabuyao-only receptionist cannot read/update Santa Rosa records by guessing IDs or changing request parameters.
3. Receptionist cannot promote their own role or add branch membership.
4. A valid staff session without membership is denied.
5. Deactivated staff cannot continue sensitive operations with an old session.
6. Changing appointment.branch_id or a payload's dentist_id does not bypass authorization.
7. Unknown role is denied; optional dentist access remains denied until implemented and tested.
8. Direct API and database policy tests reproduce the same allow/deny rules as the UI.

Reference: [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security). Policies must match actual business access, not simply allow every authenticated user.
