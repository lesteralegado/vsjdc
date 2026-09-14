import { useEffect, useRef, useState, type FormEvent } from 'react'
import { mobilePattern, isValidMobile, normalizeMobile } from '../lib/validation'
import Button from '../components/Buttons'
import BranchDetails from '../components/BranchDetails'
import AppointmentDetails from '../components/AppointmentDetails'
import { branches } from '../data/clinic'
import { clinicApi, type Appointment, type TimeSlot } from '../lib/clinicApi'
import { useCatalogue } from '../lib/useCatalogue'

const steps = ['Clinic location', 'Service & schedule', 'Patient information', 'Review', 'Confirmation']
const formatTime = (value: string) => new Date(value).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })

export default function BookAppointmentsPage() {
  const [step, setStep] = useState(0)
  const [branchId, setBranchId] = useState(new URLSearchParams(location.search).get('branch') === 'santa-rosa' ? 'santa-rosa' : 'cabuyao')
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [slotId, setSlotId] = useState('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotError, setSlotError] = useState('')
  const [patient, setPatient] = useState({ firstName: '', lastName: '', mobile: '', email: '', notes: '' })
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const { services, error: catalogueError } = useCatalogue(false)
  const branch = branches.find(item => item.id === branchId) || branches[0]
  const service = services.find(item => item.id === serviceId)
  const slot = slots.find(item => item.id === slotId)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  useEffect(() => {
    if (!clinicApi.connected || !date || !serviceId) return
    let active = true
    clinicApi.getSlots(branchId, serviceId, date).then(result => {
      if (active) { setSlots(result); setSlotError('') }
    }).catch(() => { if (active) setSlotError('Available times could not be loaded. Choose the date again to retry.') }).finally(() => { if (active) setSlotsLoading(false) })
    return () => { active = false }
  }, [branchId, serviceId, date])
  function clearSlots() { setSlotId(''); setSlots([]); setSlotError(''); setSlotsLoading(clinicApi.connected) }
  function changeStep(next: number) { setStep(next); setError(''); requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }) }
  async function next(event: FormEvent) {
    event.preventDefault()
    if (step === 1 && clinicApi.connected && !slot?.available) { setError('Please select an available time.'); return }
    if (step === 2 && (!patient.firstName.trim() || !patient.lastName.trim() || !isValidMobile(patient.mobile))) { setError('Enter your first and last name and a valid Philippine mobile number.'); return }
    if (step < 3) { changeStep(step + 1); return }
    if (!clinicApi.connected) { changeStep(4); return }
    if (busy) return
    setBusy(true); setError('')
    try {
      const result = await clinicApi.book({ branchId, serviceId, slotId, ...patient, mobile: normalizeMobile(patient.mobile) })
      setAppointment(result); changeStep(4)
    } catch { setError('Your request could not be sent. Please check availability before trying again, or contact your branch.') }
    finally { setBusy(false) }
  }
  const summary = <dl className="mt-6 space-y-5 text-sm">{[
    ['Branch', branch.shortName], ['Service', service?.name || 'Not selected'],
    ['Date', date ? new Date(`${date}T00:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' }) : 'Not selected'],
    ['Time', slot ? formatTime(slot.startsAt) : preferredTime ? `${preferredTime} · preferred only` : 'Not selected'],
  ].map(([label, value]) => <div key={label} className="grid grid-cols-[1fr_1.6fr] gap-4"><dt className="muted">{label}</dt><dd className="break-words text-right">{value}</dd></div>)}</dl>
  return <div className="container-clinic py-8 sm:py-12"><div className="mx-auto max-w-6xl"><a href="/appointments" className="text-sm muted">← Appointments</a>
    <div className="mt-7 flex flex-wrap items-start justify-between gap-4"><div><h1 ref={heading} tabIndex={-1} className="scroll-mt-28 text-3xl font-bold tracking-tight outline-none sm:text-4xl">Book an appointment</h1><p className="muted mt-3 text-sm leading-7">Choose your branch, service, date, and time.</p></div><span className="badge badge-pink">Step {step + 1} of 5</span></div>
    <ol aria-label="Booking progress" className="my-7 grid grid-cols-5 gap-2">{steps.map((label, i) => <li key={label} aria-current={step === i ? 'step' : undefined} className={`border-t-[3px] pt-3 text-xs ${i <= step ? 'border-clinic-pink text-[#b92152]' : 'border-[#e3e7eb] muted'}`}><span className="font-semibold">0{i + 1}</span><span className="ml-2 hidden sm:inline">{label}</span></li>)}</ol>
    {!clinicApi.connected && <div className="notice mb-6"><strong>Booking preview</strong><p>Online booking is not available yet. You can explore the steps below; no appointment will be sent or reserved. For a visit, please contact your branch.</p></div>}
    {step === 4 ? <div className="mx-auto max-w-2xl">{appointment ? <><div className="card mb-6 p-8 text-center"><span className="badge">Request received</span><h2 className="mt-5 text-2xl font-semibold">Thank you for choosing us</h2><p className="muted mt-4 text-sm leading-7">Keep your reference number to track your appointment. Your clinic will confirm the schedule.</p></div><AppointmentDetails appointment={appointment} /><a className="btn btn-primary mt-6 w-full" href="/appointments/track">Track your appointment</a></> : <div className="card p-8 text-center"><span className="badge badge-pink">Preview complete · Not submitted</span><h2 className="mt-5 text-2xl font-semibold">Let’s arrange your visit</h2><p className="muted mt-4 text-sm leading-7">No appointment has been created and no time is reserved. Contact {branch.name} to arrange your visit.</p><div className="mt-6 flex flex-wrap justify-center gap-3">{branch.phones.map(phone => <a key={phone.href} className="btn btn-primary" href={phone.href}>Call {phone.label}</a>)}</div><Button secondary className="mt-4" onClick={() => changeStep(3)}>Back to review</Button></div>}</div> :
    <form onSubmit={next} className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(290px,1fr)]">
      <div className="card card-shadow min-w-0 space-y-7 p-5 sm:p-8">
        {catalogueError && <p role="alert" className="notice">{catalogueError}</p>}
        {step === 0 && <>
          <fieldset><legend className="mb-4 text-lg font-medium">1. Choose clinic location</legend><div className="field-grid">{branches.map(item => <button type="button" key={item.id} aria-pressed={branchId === item.id} onClick={() => { setBranchId(item.id); clearSlots() }} className={`rounded-xl border p-4 text-left ${branchId === item.id ? 'border-clinic-green bg-clinic-mint ring-1 ring-clinic-green' : 'border-[#dce1e6] hover:bg-[#fafcfc]'}`}><span className="block text-sm font-medium">{item.name}</span><span className="muted mt-2 block text-xs">{branchId === item.id ? '✓ Selected' : 'Select this branch'}</span></button>)}</div></fieldset>
          <div className="rounded-xl bg-[#f7faf9] p-5"><BranchDetails branch={branch} compact /></div>
        </>}
        {step === 1 && <>
          <h2 className="text-xl font-medium">Choose your service & schedule</h2><div className="field-grid"><label>Service<select required value={serviceId} onChange={e => { setServiceId(e.target.value); clearSlots() }}><option value="">Choose a dental service</option>{services.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Preferred date<input required type="date" min={today} value={date} onChange={e => { setDate(e.target.value); clearSlots() }} /></label></div>
          <fieldset><legend className="mb-4 text-lg font-medium">Available times</legend><div className="mb-4 flex flex-wrap gap-2 text-xs"><span className="badge">Available</span><span className="badge badge-pink">Selected</span><span className="rounded-full bg-[#f0f2f4] px-3 py-2 text-[#727b87]">Unavailable</span></div>
          {slotsLoading && date && serviceId && <p role="status" className="muted text-sm">Checking available times…</p>}{slotError && <p role="alert" className="notice">{slotError}</p>}
          <div className="flex flex-wrap gap-3">{slots.filter(item => !item.suggested).map(item => <button key={item.id} type="button" disabled={!item.available} aria-pressed={slotId === item.id} onClick={() => setSlotId(item.id)} className={`badge min-h-11 ${slotId === item.id ? 'badge-pink ring-2 ring-clinic-pink' : !item.available ? 'bg-[#edf0f2] text-[#737d88] line-through' : ''}`}>{formatTime(item.startsAt)}{!item.available ? ' · Unavailable' : ''}</button>)}</div>
          {!slots.length && !slotsLoading && <p className="rounded-xl border border-dashed border-[#dce1e6] p-5 text-sm leading-7 muted">{clinicApi.connected ? (date && serviceId ? 'No available times for this selection. Try another date or contact the clinic.' : 'Select a service and date to see available times.') : 'Live availability is not available yet. Please call the clinic to confirm a time.'}</p>}
          </fieldset>
          {slots.some(item => item.suggested && item.available) && <div className="notice"><h3 className="font-medium">Alternative suggested times</h3><div className="mt-3 flex flex-wrap gap-3">{slots.filter(item => item.suggested && item.available).map(item => <button type="button" className={`badge min-h-11 ${slotId === item.id ? 'badge-pink ring-2 ring-clinic-pink' : ''}`} aria-pressed={slotId === item.id} key={item.id} onClick={() => setSlotId(item.id)}>{new Date(item.startsAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })} · {formatTime(item.startsAt)}</button>)}</div></div>}
          {!clinicApi.connected && <label>Preferred time <span className="muted font-normal">(optional, for preview only)</span><input type="time" min="09:00" max={branchId === 'cabuyao' ? '18:00' : '20:00'} value={preferredTime} onChange={e => setPreferredTime(e.target.value)} /><span className="muted mt-2 block text-xs leading-6">This is a preference, not an available or reserved appointment.</span></label>}
          <p className="notice">Some waiting time may still occur. Dental procedures can take longer than expected. Your clinic will confirm the appointment time.</p>
        </>}
        {step === 2 && <><h2 className="text-xl font-medium">Patient information</h2><p className="muted text-sm leading-6">Tell us who the appointment is for.{!clinicApi.connected && ' This preview does not send or save your information.'}</p><div className="field-grid">{([
          ['firstName', 'First name', 'text', 'given-name'], ['lastName', 'Last name', 'text', 'family-name'], ['mobile', 'Mobile number', 'tel', 'tel'], ['email', 'Email address (optional)', 'email', 'email'],
        ] as const).map(([key, label, type, autoComplete]) => <label key={key}>{label}<input required={key !== 'email'} type={type} autoComplete={autoComplete} maxLength={key === 'mobile' ? 20 : 120} pattern={key === 'mobile' ? mobilePattern : undefined} value={patient[key]} onChange={e => setPatient({ ...patient, [key]: e.target.value })} /></label>)}</div><label>Anything you’d like us to know? <span className="muted font-normal">(optional)</span><textarea rows={3} maxLength={1000} value={patient.notes} onChange={e => setPatient({ ...patient, notes: e.target.value })} placeholder="Share any preferences for your visit." /></label></>}
        {step === 3 && <><h2 className="text-xl font-medium">Review your appointment</h2><p className="muted text-sm leading-6">Please check your details before continuing.</p>{summary}<div className="border-t border-[#e5e8ec] pt-6"><h3 className="font-medium">Patient information</h3><p className="mt-3 break-words text-sm">{patient.firstName} {patient.lastName}</p><p className="muted mt-2 break-words text-sm">{patient.mobile}</p>{patient.email && <p className="muted mt-2 break-words text-sm">{patient.email}</p>}{patient.notes && <p className="muted mt-4 whitespace-pre-wrap break-words text-sm">{patient.notes}</p>}<button type="button" onClick={() => changeStep(2)} className="mt-3 py-2 text-sm text-[#11785e] underline">Edit patient details</button></div><label className="flex items-start gap-3"><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span className="text-xs leading-6">{clinicApi.connected ? 'I confirm that my details are correct and agree to the clinic using this information to arrange my appointment.' : 'I understand this is a preview. No appointment will be submitted or time reserved.'}</span></label></>}
        {error && <p role="alert" className="notice">{error}</p>}
        <div className="flex flex-wrap justify-between gap-3 border-t border-[#edf0f2] pt-5">{step > 0 ? <Button type="button" secondary onClick={() => changeStep(step - 1)} disabled={busy}>Back</Button> : <a className="btn btn-secondary" href="/appointments">Cancel</a>}<Button type="submit" disabled={busy}>{busy ? 'Sending request…' : step === 3 ? (clinicApi.connected ? 'Send appointment request' : 'Finish preview') : 'Continue →'}</Button></div>
      </div>
      <aside className="card card-shadow min-w-0 p-6 lg:sticky lg:top-28"><h2 className="text-xl font-medium">Appointment summary</h2>{summary}<p className="mt-6 border-t border-[#edf0f2] pt-4 text-xs leading-6 muted">All times are in Philippine time. Your appointment is subject to clinic confirmation.</p><a href={branch.phones[0].href} className="mt-4 block text-sm text-[#11785e] underline">Need help? Call {branch.shortName}</a></aside>
    </form>}
  </div></div>
}
