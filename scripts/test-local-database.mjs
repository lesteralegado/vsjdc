// Runs only inside the local Supabase Docker container; accepts no database URL.
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

assert.equal((await readFile('supabase/config.toml', 'utf8')).match(/^project_id\s*=\s*"([^"]+)"/m)?.[1], 'vsjdc')
function sql(input) {
  const result = spawnSync('docker', ['--context', 'default', 'exec', '-i', 'supabase_db_vsjdc', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], { input: "set statement_timeout='30s'; set lock_timeout='5s';\n" + input, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })
  if (result.error) throw new Error('Local Docker is required. Start the disposable Supabase stack first.', { cause: result.error })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  assert.equal(result.status, 0, 'Database check failed; no later tests were run.')
}
const pristine = `do $$ begin
 if exists(select 1 from public.appointments) or exists(select 1 from public.dentists)
 or exists(select 1 from private.staff_accounts) or exists(select 1 from private.branch_schedule_settings)
 or exists(select 1 from private.booking_settings where enabled)
 then raise exception 'Expected a freshly migrated disposable database with no demo/clinic records and booking closed'; end if;
 if (select count(*) from public.branches)<>2 or (select count(*) from public.services)<>15
 then raise exception 'Clinic catalogue migration is incomplete'; end if;
end $$;`
sql(pristine)
const files = (await readdir('supabase/tests')).filter(name => name.endsWith('.sql')).sort()
for (const file of files) {
  console.log(`Database regression: ${file}`)
  sql(await readFile(`supabase/tests/${file}`, 'utf8'))
}
sql(pristine)
console.log(`PASS: ${files.length} SQL regression files; fixtures rolled back and booking remains closed.`)
