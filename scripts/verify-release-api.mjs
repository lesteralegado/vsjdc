// Read-only checks: no accounts, appointments or emails are created.
import assert from 'node:assert/strict'
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
assert.ok(url && key, 'Load browser environment variables before running this check.')
const origin = process.env.TEST_SITE_ORIGIN || 'http://127.0.0.1:5173'
const headers = { apikey: key, 'Content-Type': 'application/json', Origin: origin }
const settings = await fetch(`${url}/auth/v1/settings`, { headers, signal: AbortSignal.timeout(15000) })
assert.equal(settings.status, 200)
assert.equal((await settings.json()).disable_signup, true, 'Disable public Auth signup before release.')
const endpoint = `${url}/functions/v1/appointment-api`
const options = await fetch(endpoint, { method: 'OPTIONS', headers, signal: AbortSignal.timeout(15000) })
assert.equal(options.status, 204)
assert.equal(options.headers.get('access-control-allow-origin'), origin)
const wrongOrigin = await fetch(endpoint, { method: 'OPTIONS', headers: { ...headers, Origin: 'https://untrusted.example.invalid' }, signal: AbortSignal.timeout(15000) })
assert.equal(wrongOrigin.status, 403)
const invalidKey = await fetch(endpoint, { method: 'POST', headers: { ...headers, apikey: 'invalid' }, body: '{}', signal: AbortSignal.timeout(15000) })
assert.equal(invalidKey.status, 401)
const track = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ action: 'track', data: { reference: 'VSJ-' + crypto.randomUUID().replaceAll('-', '').toUpperCase(), mobile: '09170000999' } }), signal: AbortSignal.timeout(15000) })
assert.equal(track.status, 200)
assert.deepEqual(await track.json(), { data: null })
assert.equal(track.headers.get('cache-control'), 'no-store')
console.log('PASS: signup disabled; exact CORS origin, key checks, private not-found response and no-store verified.')
