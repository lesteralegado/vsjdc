import { useEffect, useState, type FormEvent } from 'react'
import Button from '../components/Buttons'
import { requireSupabase } from '../lib/supabase'
import { getStaffContext, signOut } from '../lib/staffApi'

export default function StaffPasswordPage() {
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    const url = new URL(location.href)
    const hash = new URLSearchParams(url.hash.slice(1))
    const callback = url.searchParams.has('code') || hash.has('error') || url.searchParams.has('error')
    async function checkSession() {
      try {
        const { error } = await requireSupabase().auth.getSession()
        if (error) throw error
        await getStaffContext()
        if (active) setReady(true)
      } catch {
        if (active && callback) setMessage('This recovery link is invalid or expired, or staff access is unavailable. Request a new link in this browser or contact your administrator.')
      } finally {
        if (active) {
          setChecking(false)
          if (callback) history.replaceState(null, '', '/staff/password')
        }
      }
    }
    void checkSession()
    return () => { active = false }
  }, [])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || checking) return
    setBusy(true); setMessage('')
    try {
      if (ready) {
        if (password.length < 12) throw new Error('Use at least 12 characters.')
        if (password !== confirm) throw new Error('Passwords do not match.')
        await getStaffContext()
        const { error } = await requireSupabase().auth.updateUser({ password })
        if (error) throw new Error('Could not update your password. Try a new recovery link.')
        setPassword(''); setConfirm('')
        try { await signOut() } catch { throw new Error('Password changed, but sign-out could not finish. Sign out before using a shared device.') }
        location.replace('/staff/login')
      } else {
        const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/staff/password` })
        if (error) throw new Error('Could not request a recovery email. Please try again later.')
        setMessage('If this email has an account, a recovery link will arrive shortly. Open it in this browser.')
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.') }
    finally { setBusy(false) }
  }
  return <main className="container-clinic py-12"><div className="card mx-auto max-w-lg p-7"><h1 className="text-2xl font-semibold">{ready ? 'Choose a new password' : 'Reset your password'}</h1>{checking && <p role="status" className="mt-5">Checking your recovery session?</p>}<form className="mt-6 space-y-5" onSubmit={submit} aria-busy={busy || checking}><fieldset disabled={busy || checking} className="space-y-5">{ready ? <><label>New password<input type="password" required minLength={12} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label><label>Confirm password<input type="password" required minLength={12} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label><p className="muted text-xs">Use at least 12 characters. You will sign in again after changing it.</p></> : <label>Staff email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>}{message && <p className="notice" role="status">{message}</p>}<Button disabled={busy}>{busy ? 'Please wait…' : ready ? 'Update password' : 'Send recovery link'}</Button></fieldset></form><a href="/staff/login" className="mt-6 inline-block text-sm underline">Back to sign in</a></div></main>
}
