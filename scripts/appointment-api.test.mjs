import { test } from 'node:test'
import assert from 'node:assert/strict'

test('booking verification is enforced before database calls; tracking stays independent', async () => {
  const previousDeno = globalThis.Deno
  const previousFetch = globalThis.fetch
  const env = { SUPABASE_URL: 'https://sqqwjiuskzgwxvxukmxi.supabase.co', APPOINTMENT_PUBLIC_KEY: 'sb_publishable_test', APPOINTMENT_ALLOWED_ORIGINS: 'https://clinic.example', SUPABASE_SERVICE_ROLE_KEY: 'server-only-test' }
  let handler
  let verification = { success: true, hostname: 'clinic.example', action: 'booking' }
  let unavailable = false
  const calls = []
  globalThis.Deno = { env: { get: key => env[key] }, serve: callback => { handler = callback } }
  globalThis.fetch = async (url, options) => {
    calls.push({ url, data: JSON.parse(options.body) })
    if (String(url).includes('siteverify')) {
      if (unavailable) throw new Error('Synthetic outage')
      return Response.json(verification)
    }
    return Response.json({ ok: true, data: { reference: 'synthetic-reference' } })
  }
  try {
    await import('../supabase/functions/appointment-api/index.ts')
    const send = (action, token) => handler(new Request('https://edge.example', {
      method: 'POST', headers: { apikey: env.APPOINTMENT_PUBLIC_KEY, Origin: 'https://clinic.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data: { requestId: 'stable-request-key' }, verificationToken: token }),
    }))
    assert.equal((await send('book', 'token')).status, 503, 'missing secret fails closed')
    assert.equal(calls.length, 0)
    env.TURNSTILE_SECRET_KEY = 'synthetic-server-secret'
    for (const token of [undefined, '', 'x'.repeat(2049), {}]) assert.equal((await send('book', token)).status, 403)
    assert.equal(calls.length, 0)
    for (const result of [
      { success: false, 'error-codes': ['timeout-or-duplicate'] },
      { success: true, hostname: 'attacker.example', action: 'booking' },
      { success: true, hostname: 'clinic.example', action: 'login' },
    ]) {
      verification = result
      assert.equal((await send('book', 'token')).status, 403)
      assert.ok(calls.every(call => call.url.includes('siteverify')))
    }
    unavailable = true
    assert.equal((await send('book', 'token')).status, 503)
    unavailable = false
    verification = { success: true, hostname: 'clinic.example', action: 'booking' }
    assert.equal((await send('book', 'valid-token')).status, 200)
    assert.deepEqual(calls.at(-1).data, { p_action: 'book', p_data: { requestId: 'stable-request-key' } }, 'token is never sent to the database or fingerprinted')
    delete env.TURNSTILE_SECRET_KEY
    const before = calls.length
    assert.equal((await send('track')).status, 200)
    assert.equal(calls.length, before + 1, 'tracking does not call verification')
    assert.equal(calls.at(-1).data.p_action, 'track')
  } finally { globalThis.Deno = previousDeno; globalThis.fetch = previousFetch }
})
