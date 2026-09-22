# Booking protection and activation

Status: implementation is local; the updated Edge Function has **not** been deployed. Existing hosted endpoints have not acquired this protection yet. Activate the frontend and backend together after configuring the keys below. Local booking submission is disabled at review when its site key is missing; tracking remains available.

## Owner setup

1. In Cloudflare, create a **Turnstile** widget in **Managed** mode. Add the exact stable preview/production website hostnames you control. Use a separate development widget for localhost. Do not register all of `vercel.app` or enable unrestricted hostnames.
2. Add the public site key as `VITE_TURNSTILE_SITE_KEY` in the relevant Vercel environment. For local development, add it to ignored `.env.local`. A site key is public; the secret is not.
3. In the matching Supabase project's **Edge Functions → Secrets**, save the corresponding secret as `TURNSTILE_SECRET_KEY`. Do not prefix it with `VITE_`, commit it, or paste it into chat.
4. Confirm `APPOINTMENT_ALLOWED_ORIGINS` contains the exact frontend origins, comma-separated (for example `https://your-clinic-domain.example`, without paths or trailing slashes). Token hostnames are checked against these origins as well. Keep `APPOINTMENT_PUBLIC_KEY` set to the project's publishable key.
5. With booking closed during rollout, deploy `supabase/functions/appointment-api/index.ts` **and** its `turnstile.ts` dependency to the matching Supabase project, then deploy the matching frontend/CSP configuration. Keep the existing custom application-key handling (`verify_jwt=false`) for this public patient endpoint. Staff authentication is separate.
6. On a protected preview, verify a successful challenge and booking, rejected/expired/replayed tokens, an unavailable verification service, exact booking retry/recovery, and tracking while booking is closed. Reopen booking only after this acceptance check. The UI flag does not close the database gateway: use the existing server booking setting as well.

You can provide the public site key and confirm that the secret is saved when ready. A real hosted verification roundtrip remains pending until then. Cloudflare test keys are for isolated tests only; production release validation rejects public test keys. Never configure a hosted production secret with a Cloudflare dummy key.

## Implemented controls

- Booking requires a server-side Siteverify response with `success=true`, action `booking`, and an allowed hostname. Missing configuration or verification outages fail closed. No client flag bypasses verification.
- Token length is bounded to 2048 characters. The provider validates token expiry and single use. The token stays outside the booking details, database payload and idempotency fingerprint. A fresh widget is mounted after each submission attempt.
- The widget loads at the review step, handles expiration/error/restart, and uses compact sizing on narrow containers. Without a key, it displays the clinic-contact fallback and cannot submit.
- CSP explicitly permits the Cloudflare script and iframe host. No new UI library was added.
- Existing database limits remain: 60 book requests/minute globally; 12 attempts/hour per normalized mobile; 180 availability or tracking requests/minute globally; 15 lookups/15 minutes per reference or recovery key. These count failed attempts too. Synthetic tests confirmed the mobile and global booking boundaries.
- Turnstile is an abuse deterrent, not proof of phone ownership or protection against all deliberate slot hoarding. Pending holds still remain until staff acts, as requested. Clinic operations must review/reject unwanted requests. Transport-level flood protection and real multi-client load testing remain part of deployment acceptance.

## September 22 development measurements

`supabase/tests/capacity_and_rate_limits.sql` uses one synthetic dentist and sequential five-minute visits on a future day. It evaluates 108 candidate times; all rows, settings and rate counters roll back. These are single-run database timings, not production latency percentiles or a concurrent traffic benchmark.

| Active holds | Feasibility check | Full availability calculation |
| --- | --- | --- |
| 20 | 24.95 ms | 791.85 ms |
| 40 | 21.19 ms | 1616.38 ms |
| 60 | 40.42 ms | 78.98 ms (new requests rejected by the bound) |

The engine supports at most **60 active holds across both branches on the same day** in its current feasibility calculation. At that limit, additional requests are unavailable even if chair time remains. The 61-hold fixture was rejected in 0.71 ms. An exhausted search budget also rejects availability rather than guessing. Do not increase the 60-job or 5000-search-step bounds without representative mixed-service/dentist and concurrent-load tests. Actual clinic demand has not yet been supplied, so suitability of those limits is not established.

## Sources

- [Cloudflare server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare testing keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
- [Cloudflare CSP guidance](https://developers.cloudflare.com/turnstile/reference/content-security-policy/)
