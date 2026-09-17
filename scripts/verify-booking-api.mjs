// Development integration test. Creates a synthetic held request; cleanup is
// intentionally explicit using the reference saved to ignored test-results/.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
assert.equal(url, 'https://sqqwjiuskzgwxvxukmxi.supabase.co', 'Development only')
const endpoint = `${url}/functions/v1/appointment-api`
const headers = { apikey: key, 'Content-Type': 'application/json' }
async function call(action, data) {
  const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ action, data }) })
  return { status: response.status, body: await response.json() }
}
const services = await fetch(`${url}/rest/v1/services?select=id,name`, { headers }).then(r => r.json())
const service = services.find(s => s.name === 'Oral Prophylaxis')
assert.ok(service)
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 2 * 86400000))
const availability = await call('availability', { branchId: 'santa-rosa', serviceId: service.id, date })
assert.equal(availability.status, 200, JSON.stringify(availability.body))
const slot = availability.body.data.find(s => s.available && !s.suggested)
assert.ok(slot, 'Need a demo slot for the concurrency test')
const requests = Array.from({ length: 4 }, (_, i) => ({
  requestId: crypto.randomUUID(), branchId: 'santa-rosa', serviceId: service.id, slotId: slot.id,
  firstName: 'QA-BOOKING', lastName: `Synthetic-${i}`, mobile: `0917000020${i}`, email: `qa-booking-${i}@example.invalid`, notes: 'Temporary integration test', consent: true,
}))
const results = await Promise.all(requests.map(data => call('book', data)))
await mkdir('test-results', { recursive: true })
await writeFile('test-results/booking-api.json', JSON.stringify({ requests, results }, null, 2))
const winners = results.map((r, i) => ({ ...r, request: requests[i] })).filter(r => r.status === 200)
assert.equal(winners.length, 1, `One eligible demo dentist must admit one request: ${JSON.stringify(results.map(r => r.status))}`)
assert.ok(results.every(r => [200, 409].includes(r.status)))
const winner = winners[0]
assert.equal(winner.body.data.status, 'pending')
assert.equal(winner.body.data.dentist, null)
const retry = await call('book', winner.request)
assert.equal(retry.status, 200)
assert.equal(retry.body.data.reference, winner.body.data.reference)
const changed = await call('book', { ...winner.request, notes: 'Different payload' })
assert.equal(changed.status, 409)
const tracked = await call('track', { reference: winner.body.data.reference, mobile: winner.request.mobile })
assert.equal(tracked.status, 200)
assert.equal(tracked.body.data.status, 'pending')
assert.equal(Object.hasOwn(tracked.body.data, 'mobile'), false)
const missing = await call('track', { reference: winner.body.data.reference, mobile: '09179999999' })
assert.equal(missing.body.data, null)
const after = await call('availability', { branchId: 'santa-rosa', serviceId: service.id, date })
assert.equal(after.body.data.find(s => s.id === slot.id).available, false)
const bypass = await fetch(`${url}/rest/v1/rpc/booking_gateway`, { method: 'POST', headers, body: JSON.stringify({ p_action: 'book', p_data: winner.request }) })
assert.ok([401, 403].includes(bypass.status))
assert.equal((await fetch(endpoint, { method: 'POST', headers: { ...headers, apikey: 'invalid' }, body: '{}' })).status, 401)
assert.equal((await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ padding: 'x'.repeat(9000) }) })).status, 413)
assert.equal((await fetch(endpoint, { method: 'POST', headers: { ...headers, Origin: 'https://unapproved.example' }, body: '{}' })).status, 403)
console.log('PASS: four concurrent requests produced one pending hold; retries, changed payload, tracking, capacity refresh, direct RPC denial, key/body/origin checks passed.')
