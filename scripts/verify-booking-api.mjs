// Non-booking release smoke check: no accounts, appointments or emails are created.
// Requires the Turnstile-protected Edge Function and its real server configuration.
import assert from 'node:assert/strict'
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
assert.ok(/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url || '') && key?.startsWith('sb_publishable_'), 'Provide the project URL and public key.')
const origin = process.env.TEST_SITE_ORIGIN || 'http://127.0.0.1:5173'
const endpoint = `${url}/functions/v1/appointment-api`
const headers = { apikey: key, 'Content-Type': 'application/json', Origin: origin }
async function call(action, data, verificationToken) {
  const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ action, data, verificationToken }), signal: AbortSignal.timeout(30000) })
  return { status: response.status, body: await response.json() }
}
// Intentionally incomplete booking details: even an outdated endpoint cannot create a reservation.
for (const token of [undefined, 'deliberately-invalid-verification-token']) {
  const result = await call('book', {}, token)
  assert.equal(result.status, 403, 'Expected bot verification rejection. A 503 means setup/outage needs attention; a 4xx other than 403 can indicate the old endpoint is still deployed.')
}
const reference = 'VSJ-' + crypto.randomUUID().replaceAll('-', '').toUpperCase()
const tracked = await call('track', { reference, mobile: '09170000999' })
assert.equal(tracked.status, 200)
assert.equal(tracked.body.data, null)
const bypass = await fetch(`${url}/rest/v1/rpc/booking_gateway`, {
  method: 'POST', headers, body: JSON.stringify({ p_action: 'book', p_data: {} }), signal: AbortSignal.timeout(15000),
})
assert.ok([401, 403].includes(bypass.status), 'Anonymous clients must not bypass the Edge Function')
console.log('PASS: missing/invalid bot tokens rejected, tracking independent, direct booking RPC denied. No appointments created.')
