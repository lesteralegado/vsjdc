import { useState, type FormEvent } from 'react'
import ClinicLogo from '../components/ClinicLogo'
import Button from '../components/Buttons'
import { clinicApi } from '../lib/clinicApi'

export default function StaffLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { await clinicApi.signIn(email, password); location.assign('/staff/dashboard') }
    catch { setError(clinicApi.connected ? 'Sign-in failed. Check your credentials and try again.' : 'Staff sign-in is not available yet. Please contact the clinic administrator.'); setPassword('') }
    finally { setBusy(false) }
  }
  return <div className="container-clinic py-10 sm:py-16"><div className="card card-shadow mx-auto grid max-w-5xl overflow-hidden lg:grid-cols-2">
    <div className="flex flex-col justify-center bg-clinic-mint p-7 sm:p-10"><div className="rounded-2xl bg-white"><ClinicLogo variant="wordmark" /></div><h2 className="mt-8 text-2xl font-semibold">A little care.<br />A brighter day.</h2><p className="muted mt-4 text-sm leading-7">One place to manage appointments and help every patient feel welcome.</p></div>
    <div className="p-7 sm:p-10"><span className="badge badge-pink">Clinic management</span><h1 className="mt-5 text-3xl font-bold tracking-tight">Welcome back</h1><p className="muted mt-3 text-sm">Sign in to your staff account.</p><form className="mt-8 space-y-5" onSubmit={submit} aria-busy={busy}><label>Email address<input required type="email" autoComplete="username" placeholder="Your staff email" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" /></label><button type="button" className="py-1 text-xs text-[#11785e] underline" onClick={() => setShowPassword(!showPassword)} aria-pressed={showPassword}>{showPassword ? 'Hide password' : 'Show password'}</button>{error && <p role="alert" className="notice">{error}</p>}<Button disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button></form><p className="muted mt-5 text-xs leading-6">Need access? Please contact your clinic administrator.</p>{!clinicApi.connected && <a href="/staff/dashboard" className="mt-6 block text-center text-sm text-[#11785e] underline">View dashboard UI preview</a>}</div>
  </div></div>
}
