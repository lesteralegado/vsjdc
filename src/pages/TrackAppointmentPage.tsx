import { useState, type FormEvent } from 'react'
import { mobilePattern, isValidMobile, normalizeMobile } from '../lib/validation'
import Button from '../components/Buttons'
import AppointmentDetails from '../components/AppointmentDetails'
import { clinicApi, type Appointment } from '../lib/clinicApi'

export default function TrackAppointmentPage() {
  const [validationError, setValidationError] = useState('')
  const [reference, setReference] = useState('')
  const [mobile, setMobile] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle')
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [requestError, setRequestError] = useState('')
  function clearResult() { setAppointment(null); setState('idle'); setRequestError(''); setValidationError('') }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (state === 'loading') return
    setValidationError('')
    if (!isValidMobile(mobile)) { setValidationError('Enter a valid Philippine mobile number, such as 0917 123 4567.'); return }
    setState('loading'); setAppointment(null); setRequestError('')
    try { const result = await clinicApi.track(reference.trim(), normalizeMobile(mobile)); setAppointment(result); setState(result ? 'found' : 'not-found') }
    catch (error) { setRequestError(error instanceof Error ? error.message : 'Please try again later.'); setState('error') }
  }
  return <div className="container-clinic py-10 sm:py-16"><div className="mx-auto max-w-2xl"><a href="/appointments" className="text-sm muted">← Appointments</a><span className="badge badge-pink mt-8 flex w-fit">Stay up to date</span><h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Track an appointment</h1><p className="muted mt-4 text-sm leading-7">Enter the reference number you received after booking and the mobile number used for your appointment.</p>
    <form onSubmit={submit} className="card card-shadow mt-8 space-y-6 p-6 sm:p-8" aria-busy={state === 'loading'}>
      <label>Appointment Reference Number<input required disabled={state === 'loading'} value={reference} onChange={e => { clearResult(); setReference(e.target.value) }} placeholder="Enter your reference number" autoCapitalize="characters" maxLength={80} /></label>
      <label>Mobile Number<input required type="tel" inputMode="tel" autoComplete="tel" disabled={state === 'loading'} value={mobile} onChange={e => { clearResult(); setMobile(e.target.value) }} placeholder="09XX XXX XXXX" pattern={mobilePattern} title="Enter the mobile number used when booking." /></label>
      {validationError && <p role="alert" className="notice">{validationError}</p>}
      <Button className="w-full" disabled={state === 'loading'}>{state === 'loading' ? 'Checking appointment…' : 'Track appointment'}</Button>
      <p className="muted text-xs leading-6">Your details are used only to find your appointment.</p>
    </form>
    <div className="mt-6" aria-live="polite" aria-atomic="true">
      {state === 'loading' && <p role="status" className="badge">Looking for your appointment…</p>}
      {state === 'not-found' && <div className="card p-6"><h2 className="font-semibold">Appointment not found</h2><p className="muted mt-2 text-sm leading-6">Check your reference number and mobile number, then try again. If you still need help, please contact your branch.</p></div>}
      {state === 'error' && <div role="alert" className="notice"><h2 className="font-semibold">We couldn’t check your appointment</h2><p className="mt-2">{clinicApi.trackingEnabled ? requestError : 'Online tracking is not available yet. Please contact your branch to check an appointment.'}</p><a className="mt-3 inline-block underline" href="/#locations">Contact your branch →</a></div>}
      {state === 'found' && appointment && <AppointmentDetails appointment={appointment} />}
    </div><p className="muted mt-8 text-center text-sm">Need to arrange a visit? <a href="/appointments/book" className="text-[#11785e] underline">Book an appointment</a></p>
  </div></div>
}
