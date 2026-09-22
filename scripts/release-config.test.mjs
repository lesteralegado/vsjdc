import { test } from 'node:test'
import assert from 'node:assert/strict'
import { releaseErrors } from './release-config.mjs'
const valid = { VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture', VITE_DEMO_DATA: 'false', VITE_BOOKING_ENABLED: 'false' }

test('enabled booking requires a public widget key and production rejects test keys', () => {
  assert.ok(releaseErrors({ ...valid, VITE_BOOKING_ENABLED: 'true' }, 'production').some(error => error.includes('Turnstile site key')))
  assert.deepEqual(releaseErrors({ ...valid, VITE_BOOKING_ENABLED: 'true', VITE_TURNSTILE_SITE_KEY: '0x4AAAAAAAsyntheticPublicKey' }, 'production'), [])
  assert.ok(releaseErrors({ ...valid, VITE_BOOKING_ENABLED: 'true', VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' }, 'production').some(error => error.includes('test key')))
  assert.ok(releaseErrors({ ...valid, VITE_TURNSTILE_SECRET_KEY: 'private' }, 'production').some(error => error.includes('Unreviewed browser variable')))
})
test('explicit production configuration passes', () => assert.deepEqual(releaseErrors(valid, 'production'), []))
test('development data and demo settings cannot reach production', () => {
  const env = { ...valid, VITE_SUPABASE_URL: 'https://sqqwjiuskzgwxvxukmxi.supabase.co', VITE_DEMO_DATA: 'true' }
  assert.equal(releaseErrors(env, 'production').length, 2)
  assert.deepEqual(releaseErrors(env, 'preview'), [])
})
test('secret keys and unreviewed VITE variables are rejected', () => {
  assert.equal(releaseErrors({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_fixture', VITE_SERVICE_ROLE_KEY: 'hidden' }, 'production').length, 2)
})
test('missing settings and implicit target fail closed', () => assert.ok(releaseErrors({}, undefined).length >= 5))
test('public Vercel deployment metadata passes without allowing arbitrary platform secrets', () => {
  assert.deepEqual(releaseErrors({ ...valid, VITE_VERCEL_ENV: 'preview', VITE_VERCEL_URL: 'clinic.vercel.app', VITE_VERCEL_GIT_COMMIT_SHA: 'fixture' }, 'preview'), [])
  assert.ok(releaseErrors({ ...valid, VITE_VERCEL_TOKEN: 'fixture' }, 'preview').includes('Unreviewed browser variable: VITE_VERCEL_TOKEN'))
})
