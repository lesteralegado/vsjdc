# Local UI regression fixtures

Run the normal Vite development server with the existing local browser configuration, then visit `/tests/browser/index.html` on `localhost` or `127.0.0.1`.

These fixtures replace the data layer in that page only. They never authenticate or write to Supabase. They are not imported by the production entrypoint. Vite's production build must not contain this HTML or `fixtures.tsx`.

- Default view: 226 pending appointments. Page through ten pages, check the final record, search `SYNTHETIC-210`, clear the search, and check narrow widths.
- `?view=tracking`: booking is disabled and tracking stays enabled. Use a valid-format fictional mobile. Any reference except `NOTFOUND` and `ERROR` returns a synthetic appointment. The request deliberately waits: run `window.finishTracking()` in browser tools to resolve it and inspect loading, success, not-found or error states. Changing either lookup field must remove a previous result.
- `?view=failure`: click **Simulate page failure**. The recovery screen must render instead of an empty page. A synthetic React error in the browser console is expected for this test only.

These checks supplement the rollback-wrapped database tests; they do not prove hosted authentication, live bot verification or email delivery.
