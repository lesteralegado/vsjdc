import { useEffect, useState } from 'react'
import { appointmentAction, type StaffAppointment } from '../lib/staffApi'
import { getScheduleContext, type ScheduleDentist } from '../lib/schedulingApi'

export default function StaffAppointmentCard({ appointment, refresh }: { appointment: StaffAppointment; refresh: () => void }) {
  const [open, setOpen] = useState(false)
  const [dentists, setDentists] = useState<ScheduleDentist[]>([])
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [clock, setClock] = useState(() => Date.now())
  useEffect(() => {
    let active = true
    if (open && appointment.status === 'pending') getScheduleContext(appointment.branch_id).then(context => {
      if (active) setDentists(context.dentists.filter(d => d.active && d.service_ids.includes(appointment.service_id)))
    }).catch(() => { if (active) setError('Could not load dentist eligibility. Close and reopen this panel to retry.') })
    return () => { active = false }
  }, [open, appointment.branch_id, appointment.service_id, appointment.status])
  async function act(action: string) {
    if (busy) return
    setBusy(true); setError('')
    try { await appointmentAction(appointment, action, selected || undefined); setOpen(false); refresh() }
    catch (error) { setError(error instanceof Error ? error.message : 'Update failed.') }
    finally { setBusy(false) }
  }
  const future = new Date(appointment.starts_at).getTime() > clock
  return <article className="rounded-xl border border-[#e1e5e9] p-4"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-medium">{appointment.appointment_contacts?.patient_name ?? 'Patient information unavailable'}</h3><span className="badge">{appointment.status.replaceAll('_', ' ')}</span></div><p className="mt-3 text-sm">{new Date(appointment.starts_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} · {appointment.services?.name ?? 'Service unavailable'}</p><p className="muted mt-2 text-sm">Dentist: {appointment.dentists?.name ?? 'Awaiting staff assignment'}</p>{appointment.reference && <p className="muted mt-2 break-all text-xs">Reference: {appointment.reference}</p>}{['pending', 'confirmed', 'checked_in'].includes(appointment.status) && <button className="mt-4 text-sm underline" onClick={() => { setClock(Date.now()); setOpen(!open); setError('') }} aria-expanded={open} disabled={busy}>{open ? 'Close actions' : 'Manage appointment'}</button>}{open && <div className="mt-5 space-y-4 border-t pt-4">{appointment.appointment_contacts?.notes && <p className="whitespace-pre-wrap break-words text-sm">Note: {appointment.appointment_contacts.notes}</p>}{appointment.status === 'pending' && <>{!future && <p className="notice">This request is past its scheduled time and still needs staff review. It has not automatically expired.</p>}{future && <label>Assign dentist<select value={selected} onChange={e => setSelected(e.target.value)} disabled={busy}><option value="">Choose an eligible dentist</option>{dentists.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select><span className="muted mt-2 block text-xs">Availability for this assignment is checked when you confirm.</span></label>}</>}{error && <p className="notice" role="alert">{error}</p>}<div className="flex flex-wrap gap-3">{appointment.status === 'pending' && <>{future && <button className="btn btn-primary" disabled={busy || !selected} onClick={() => void act('confirm')}>Confirm and assign</button>}<button className="btn btn-secondary" disabled={busy} onClick={() => void act('reject')}>Reject request</button></>}{['pending', 'confirmed'].includes(appointment.status) && <button className="btn btn-secondary" disabled={busy} onClick={() => void act('cancel')}>Cancel appointment</button>}{appointment.status === 'confirmed' && <><button className="btn btn-primary" disabled={busy} onClick={() => void act('check_in')}>Check in</button>{!future && <button className="btn btn-secondary" disabled={busy} onClick={() => void act('no_show')}>Mark no-show</button>}</>}{appointment.status === 'checked_in' && <button className="btn btn-primary" disabled={busy} onClick={() => void act('complete')}>Mark completed</button>}</div>{busy && <p role="status" className="text-sm">Updating appointment…</p>}</div>}</article>
}
