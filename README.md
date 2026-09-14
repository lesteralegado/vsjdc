# V. San Juan Dental Clinic

Responsive appointment-system UI built with React, TypeScript, Vite, and Tailwind CSS, based on the supplied Figma PDF and original clinic logos.

## Development

```powershell
npm.cmd install
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
- `/staff/login`: staff login UI
- `/staff/dashboard`: empty dashboard UI preview

The current project is a UI implementation. The original workspace contained no backend logic. Live Supabase booking, scheduling, tracking, and authentication still need integration; no real appointments are created. See [UI-NOTES.md](./UI-NOTES.md) for the data adapter, preview behavior, assets, map-link limitations, and hosting notes.
