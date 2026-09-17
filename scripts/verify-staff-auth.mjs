// Run with a temporary synthetic staff account only; never use a real staff password.
// Node 24: node --env-file=.env.local scripts/verify-staff-auth.mjs
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const email = process.env.TEST_STAFF_EMAIL
const password = process.env.TEST_STAFF_PASSWORD
assert.ok(url && key && email?.endsWith('@example.invalid') && password, 'Provide a synthetic test account through environment variables.')
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
try {
  const login = await client.auth.signInWithPassword({ email, password })
  assert.equal(login.error, null, 'Real Auth login succeeds')
  const token = login.data.session.access_token
  const context = await client.rpc('staff_context')
  assert.equal(context.error, null)
  assert.equal(context.data.role, 'receptionist')
  assert.equal(context.data.branches.length, 1)
  assert.equal(context.data.branches[0].slug, 'cabuyao')
  const staff = await client.rpc('list_staff')
  assert.ok(staff.error, 'Receptionist cannot list staff')
  const services = await client.from('services').select('name')
  assert.equal(services.error, null)
  assert.equal(services.data.length, 15)
  const logout = await client.auth.signOut({ scope: 'global' })
  assert.equal(logout.error, null)
  const replay = await fetch(`${url}/rest/v1/rpc/staff_context`, {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}',
  })
  assert.equal(replay.status, 403, 'Logged-out access token cannot read staff context')
  console.log('PASS: real Auth login, branch-scoped context, admin RPC denial, catalogue, logout, revoked-token denial.')
} finally {
  await client.auth.signOut({ scope: 'global' })
}
const settings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).then(response => response.json())
console.log(JSON.stringify({ hosted_signup_disabled: settings.disable_signup, email_auth_enabled: settings.external?.email }))
