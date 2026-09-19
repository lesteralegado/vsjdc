import { useState } from 'react'
import { moveAppointment, type StaffAppointment } from '../lib/staffApi'
import type { ScheduleDentist } from '../lib/schedulingApi'

// datetime-local fields must display clinic time, regardless of the staff device timezone.
const clinicInput = (iso: string) => new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16)

export default function StaffAppointmentMove({ appointment, dentists, busy, setBusy, refresh }: {
  appointment: StaffAppointment; dentists: ScheduleDentist[]; busy: boolean
  setBusy: (value: boolean) => void; refresh: () => void
}) {
  const [startsAt, setStartsAt] = useState(() => clinicInput(appointment.starts_at))
  const [dentist, setDentist] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [reviewing, setReviewing] = useState(false)
  async function save() {
    if (busy) return
    setBusy(true); setError('')
    try {
      await moveAppointment(appointment, new Date(`${startsAt}:00+08:00`).toISOString(), dentist, reason)
      refresh()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not confirm the change. Refresh records before trying again.')
      setReviewing(false)
    } finally { setBusy(false) }
  }
  return <form className="rounded-xl bg-[#f6faf8] p-4" onSubmit={event => { event.preventDefault(); setError(''); setReviewing(true) }}>
    <h4 className="font-medium">Reschedule or reassign dentist</h4>
    <p className="muted mt-2 text-sm">Agree on changes with the patient first. The branch, service and reference stay the same. Pending requests still require confirmation.</p>
    <fieldset disabled={busy || reviewing} className="mt-4 space-y-4">
      <label>New date and time (Philippine time)<input type="datetime-local" required value={startsAt} onChange={event => setStartsAt(event.target.value)} className="w-full min-w-0" /></label>
      <label>Dentist<select required value={dentist} onChange={event => setDentist(event.target.value)}><option value="">Choose an eligible dentist</option>{dentists.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Reason for change<textarea required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <p className="muted text-xs">Keep the current date and time to change only the dentist. A new time uses current service duration and branch booking rules. Availability is checked when saved.</p>
    </fieldset>
    {error && <p role="alert" className="notice mt-4">{error}</p>}
    {reviewing ? <div className="mt-4 space-y-3">
      <p className="text-sm">Change to {startsAt.replace('T', ' ')} (Philippine time) with {dentists.find(item => item.id === dentist)?.name}? Status remains {appointment.status}.</p>
      <div className="flex flex-wrap gap-3"><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving change…' : 'Save appointment change'}</button><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setReviewing(false)}>Back to edit</button></div>
    </div> : <button type="submit" className="btn btn-secondary mt-4" disabled={busy || reason.trim().length < 3}>Review change</button>}
  </form>
}
