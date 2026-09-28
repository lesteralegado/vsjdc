import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prepareAttempt, readAttempt, clearAttempt } from '../src/lib/bookingRetry.ts'
const storage = () => {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}
test('reload and exact retry reuse the saved key without storing patient fields', async () => {
  const store = storage()
  const payload = { firstName: 'Fictional', mobile: '09170000999', notes: 'private test note' }
  const first = await prepareAttempt(store, payload)
  assert.equal(first.fresh, true)
  assert.equal((await prepareAttempt(store, payload)).id, first.id)
  assert.deepEqual(Object.keys(readAttempt(store)).sort(), ['fingerprint', 'id'])
  assert.ok(!JSON.stringify(readAttempt(store)).includes(payload.notes))
  await assert.rejects(prepareAttempt(store, { ...payload, notes: 'different' }), /uncertain result/)
  clearAttempt(store)
  assert.notEqual((await prepareAttempt(store, payload)).id, first.id)
})
test('storage failure prevents preparing a submission', async () => {
  await assert.rejects(prepareAttempt({ getItem: () => null, setItem: () => { throw new Error('Storage disabled') } }, {}), /Storage disabled/)
})
