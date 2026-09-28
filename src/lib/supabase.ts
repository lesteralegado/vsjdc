import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient<Database>(url, key, {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
}) : null

export function requireSupabase() {
  if (!supabase) throw new Error('Clinic connection is not configured.')
  return supabase
}
