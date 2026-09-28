import { useEffect, useState, type ReactNode } from 'react'
import { getStaffContext, type StaffContext } from '../lib/staffApi'
import { supabase } from '../lib/supabase'

export default function StaffGate({ children }: { children: (staff: StaffContext) => ReactNode }) {
  const [staff, setStaff] = useState<StaffContext | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    let generation = 0
    async function check() {
      const current = ++generation
      setError('')
      try {
        const context = await getStaffContext()
        if (active && current === generation) setStaff(context)
      } catch {
        if (active && current === generation) {
          setStaff(null)
          setError('Please sign in with an active staff account. If access was removed, contact your administrator.')
        }
      }
    }
    // Defer work outside the auth callback to avoid locking the auth client.
    const { data } = supabase?.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { generation++; setStaff(null) }
      setTimeout(() => { if (active) void check() }, 0)
    }) ?? {}
    void check()
    const interval = window.setInterval(check, 60000)
    window.addEventListener('focus', check)
    return () => { active = false; generation++; data?.subscription.unsubscribe(); window.clearInterval(interval); window.removeEventListener('focus', check) }
  }, [])
  if (!staff) return <main className="container-clinic py-20"><div className="card mx-auto max-w-lg p-8" role={error ? 'alert' : 'status'}><h1 className="text-2xl font-semibold">Staff access</h1><p className="muted mt-4">{error || 'Checking your staff access…'}</p>{error && <a href="/staff/login" className="btn btn-primary mt-6">Staff sign in</a>}</div></main>
  // Reset sensitive child state when identity or permissions actually change,
  // while preserving in-progress forms during successful periodic checks.
  return <div key={JSON.stringify([staff.user_id, staff.role, staff.branches])}>{children(staff)}</div>
}
