# Release fix checklist

Work in order. Each item needs implementation, verification and a brief review before completion. Production remains closed until release gates pass. Audit identifiers refer to PROJECT-AUDIT.md.

| Order | Task | Status | Acceptance check |
| --- | --- | --- | --- |
| 1 | Publish the complete project to a reviewed GitHub preview branch; fix Vercel variable rejection (A01/A08) | In progress | No secrets/test artifacts committed; release build passes; branch contains full app/migrations; preview verified. |
| 2 | Prevent premature check-in/completion (A03) | To do | Database rejects future-day check-in and completion before appointment start; valid transitions still pass. |
| 3 | Allow safe schedule changes while bookings exist (A02) | To do | Unrelated changes work; conflicting edits roll back without losing reservations. |
| 4 | Give staff patient contact details (A04) | To do | Authorized staff can call the patient; branch restrictions remain enforced. |
| 5 | Fix selected-branch loading and keep tracking available during booking closure (A09/A12) | To do | Back/select same branch does not stall; tracking works when new booking is disabled. |
| 6 | Recover uncertain booking submissions across reloads (A10) | To do | Lost-response retry does not create another request or persist unnecessary patient data. |
| 7 | Paginate and search appointments; simplify duplicate navigation (A11) | To do | Staff can reach all pending requests; no fake Calendar/export promise. |
| 8 | Add safe staff rescheduling/reassignment (A13) | To do | Failed move retains original reservation; successful move releases old slot atomically. |
| 9 | Strengthen public booking abuse controls and measure capacity limits (A06/A14) | To do | Verify bot checks server-side; rate controls and expected clinic load tested. |
| 10 | Replace demo configuration and verify branch details (A05/A15) | Needs clinic inputs | Approved dentists/hours/durations/capacity/future shifts and exact map pins; no production dummy records. |
| 11 | Complete recovery/security/privacy setup (A07/A16) | Needs hosted setup and clinic decisions | Real authorized recovery roundtrip, supported password protection, privacy/retention procedure. |
| 12 | Fresh database replay, restore drill and deployment acceptance (A07) | To do | Isolated rebuild/restore succeeds; protected preview tested; clinic approves production launch and rollback procedure. |

Keep optional reports, automated reminders, uploads, payments and cosmetic refinements outside this checklist. Do not merge the preview branch into production just because the frontend builds.
