import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { createClient } from '@supabase/supabase-js'

test('staff query reaches records beyond 200 with branch and server filters on every page', async () => {
  const requests = []
  const client = createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input)); requests.push(url)
      assert.equal(new Headers(init.headers).get('Prefer'), 'count=exact')
      const offset = Number(url.searchParams.get('offset'))
      const data = Array.from({ length: Math.min(25, 226 - offset) }, (_, i) => ({ id: offset + i }))
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Content-Range': `${offset}-${offset + data.length - 1}/226` } })
    } },
  })
  globalThis.__staffPaginationClient = client
  try {
    const source = (await readFile(new URL('../src/lib/staffApi.ts', import.meta.url), 'utf8')).replace("import { requireSupabase } from './supabase'", 'const requireSupabase = () => globalThis.__staffPaginationClient')
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    const { getAppointments } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
    const ids = []
    for (let page = 0; page < 10; page++) {
      const result = await getAppointments('allowed-branch', '', true, { page, status: 'all', search: '' })
      assert.equal(result.total, 226)
      ids.push(...result.appointments.map(row => row.id))
    }
    assert.equal(new Set(ids).size, 226)
    for (const url of requests) {
      assert.equal(url.searchParams.get('branch_id'), 'eq.allowed-branch')
      assert.equal(url.searchParams.get('status'), 'eq.pending')
      assert.equal(url.searchParams.get('starts_at'), null)
      assert.equal(url.searchParams.get('order'), 'starts_at.asc,id.asc')
      assert.equal(url.searchParams.get('limit'), '25')
    }
    await getAppointments('allowed-branch', '2026-09-19', false, { page: 0, status: 'confirmed', search: ' vsj-test ' })
    const filtered = requests.at(-1).searchParams
    assert.equal(filtered.get('status'), 'eq.confirmed')
    assert.equal(filtered.get('reference'), 'eq.VSJ-TEST')
    assert.deepEqual(filtered.getAll('starts_at'), ['gte.2026-09-18T16:00:00.000Z', 'lt.2026-09-19T16:00:00.000Z'])
  } finally { delete globalThis.__staffPaginationClient }
})
