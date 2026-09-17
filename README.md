# V. San Juan Dental Clinic

Responsive appointment-system UI built with React, TypeScript, Vite, and Tailwind CSS, based on the supplied Figma PDF and original clinic logos.

## Development

```powershell
npm.cmd install
# Copy .env.example to .env.local and enter the Supabase URL and publishable key.
npm.cmd run dev -- --host 127.0.0.1
```

Open the local URL printed by Vite. On shells without the Windows PowerShell execution-policy restriction, `npm run dev` works as usual.

## Checks

```powershell
npm.cmd run build
npm.cmd run lint
```

## Screens

Sprint 0 requirements, confirmed clinic decisions, backlog, security plan, and next-sprint scope are in [docs/sprint-0/README.md](./docs/sprint-0/README.md).

- `/`: landing page, services, dentists, locations, contact
- `/appointments`: appointment hub
- `/appointments/book`: five-step booking UI
- `/appointments/track`: tracking form and status views
- `/staff/login`: Supabase staff sign-in
- `/staff/password`: password recovery and update
- `/staff/dashboard`: protected staff dashboard and branch-scoped records

Sprint 1 connects Supabase staff authentication, branch authorization, and the published catalogue. Sprint 2 now includes calculated availability, pending requests, staff dentist assignment/confirmation, cancellation/rejection, and reference/mobile tracking. Development booking is enabled with fictional scheduling data; production is not deployed. See [current verification and focused delivery plan](./docs/sprint-2/BOOKING-VERIFICATION.md), [hosted Auth settings](./docs/sprint-1/README.md), and [UI-NOTES.md](./UI-NOTES.md).

Sprint 3 release preparation and current blockers: [delivery board](./docs/sprint-3/README.md) and [Vercel release runbook](./docs/sprint-3/RELEASE.md).
