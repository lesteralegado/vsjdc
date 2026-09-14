# V. San Juan Dental Clinic UI

The existing React, TypeScript, Vite, and Tailwind scaffold now renders the clinic UI. No runtime dependencies were added. Visual reference: the user-supplied four-page Figma PDF. The live Figma file could not be inspected because the connected account reached its MCP call limit.

## Run locally

```powershell
cd 'C:\V. San Juan Dental Clinic\vsjdc'
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

Open the URL printed by Vite (normally http://127.0.0.1:5173). On this machine use `npm.cmd` because PowerShell blocks `npm.ps1` under its execution policy.

```powershell
npm.cmd run build
npm.cmd run lint
```

## Pages

| Path | UI |
| --- | --- |
| `/` | Landing, services, dentists, locations, contact |
| `/appointments` | Booking and tracking hub |
| `/appointments/book` | Clinic location, service/schedule, patient, review, confirmation |
| `/appointments/track` | Reference and mobile form; loading, not-found, error, and result components |
| `/staff/login` | Staff sign-in form |
| `/staff/dashboard` | Clearly labeled dashboard UI preview with section navigation |

Legacy-style aliases `/book-appointment`, `/track-appointment`, and `/staff-login` are included. Native links support back, forward, refresh, and deep links. A production static host must rewrite application paths to `index.html`.

## Data integration boundary

Patients choose the branch, service, date, and time only. Dentist profiles are informational. Availability requests and booking payloads do not accept a patient-selected dentist; the future clinic backend must manage dentist assignment. Tracking may still display an assigned dentist as read-only appointment information.

This workspace did not contain Supabase code, credentials, a database schema, authentication, or scheduling logic. The UI does not simulate successful authentication or create fake appointments. There are no invented patients, dentist identities, dashboard counts, or available appointment times.

`src/lib/clinicApi.ts` defines the typed integration boundary for services, dentist profiles, availability, booking, tracking, and sign-in. Its disconnected implementation rejects operations. Supply the actual backend implementation before enabling live booking. The API must enforce availability and appointment conflict checks, and protect tracking data and staff access. The current dashboard is exclusively an empty public UI preview; it is not an authenticated staff application. Session handling, authorization, staff record loading, and sign-out remain backend integration work.

In disconnected mode:

- The landing page and booking selector use the 15 service names provided by the clinic.
- Dentist cards explicitly state that profiles are coming soon.
- Booking can be explored through all steps. Preferred times are labeled preferences only. The final page explicitly says the appointment was not submitted; no reference is fabricated.
- Patient form values remain in component memory only, with no persistence or transmission.
- Tracking and staff sign-in display honest unavailable errors.
- Status details, real slot chips, unavailable slots, and alternative suggestions have rendering support for the eventual data adapter.

## Assets and visual decisions

- The original `pfp.png` and `bg.png` were copied byte-for-byte to `public/images/clinic-logo.png` and `clinic-wordmark.png`. `ClinicLogo` retains their original proportions with `object-contain`; no cropping, recoloring, or redrawing was applied.
- Poppins is requested from Google Fonts with a sans-serif fallback.
- Navigation and hero use one Appointments action, even though the desktop booking PDF showed separate actions.
- The PDF's overlapping hero and clipped mobile copy were corrected with flowing responsive layouts.
- Branch map links use the supplied Cabuyao plus code and a branch-specific Santa Rosa address/name query. Both address and map action share the same destination and open a new tab. Exact Google Maps place IDs have not been independently confirmed.
- The PDF's walk-in policy was not used to invent scheduling rules.
