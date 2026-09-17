import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { configureSchedule, getScheduleContext, previewAvailability, type ScheduleAction, type ScheduleContext, type AvailabilityPreview } from '../lib/schedulingApi'
import type { Json } from '../lib/database.types'

type Save = (action: ScheduleAction, data: Json) => Promise<void>
type FormProps = { context: ScheduleContext; save: Save; busy: boolean }
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const value = (data: FormData, name: string) => String(data.get(name) ?? '').trim()
const number = (data: FormData, name: string) => Number(value(data, name))
const checked = (data: FormData, name: string) => data.has(name)
const instant = (data: FormData, name: string) => new Date(`${value(data, name)}+08:00`).toISOString()
const when = (date: string) => new Date(date).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })
const time = (date: string) => new Date(date).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })

function EditForm({ busy, disabled = false, submit, children }: { busy: boolean; disabled?: boolean; submit: (data: FormData) => void; children: ReactNode }) {
  return <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); submit(new FormData(event.currentTarget)) }}><fieldset disabled={busy || disabled} className="mt-6 space-y-5">{children}<button className="btn btn-primary" type="submit">{busy ? 'Saving…' : 'Save configuration'}</button></fieldset></form>
}
function Numeric({ label, name, initial, min = 0, max }: { label: string; name: string; initial?: number; min?: number; max: number }) {
  return <label>{label}<input type="number" name={name} required min={min} max={max} step="1" defaultValue={initial ?? ''} /></label>
}

function BranchForm({ context, save, busy }: FormProps) {
  const settings = context.settings
  return <><h2 className="text-xl font-semibold">Branch hours and capacity</h2><p className="muted mt-3 text-sm leading-6">Enter approved values. All schedules use Philippine time. A slot must fit the complete procedure and cleanup time.</p><EditForm busy={busy} submit={data => void save('branch', {
    opening_days: data.getAll('days').map(Number), opens_at: value(data, 'opens'), closes_at: value(data, 'closes'), chairs: number(data, 'chairs'), lead_minutes: number(data, 'lead'), horizon_days: number(data, 'horizon'), step_minutes: number(data, 'step'),
  })}><fieldset><legend className="mb-3 text-sm font-medium">Open on these days</legend><div className="flex flex-wrap gap-4">{days.map((day, index) => <label className="flex items-center gap-2 text-sm" key={day}><input type="checkbox" name="days" value={index} defaultChecked={settings?.opening_days.includes(index)} />{day}</label>)}</div></fieldset><div className="field-grid"><label>Opening time<input type="time" name="opens" required defaultValue={settings?.opens_at.slice(0, 5) ?? ''} /></label><label>Closing time<input type="time" name="closes" required defaultValue={settings?.closes_at.slice(0, 5) ?? ''} /></label><Numeric label="Available treatment chairs" name="chairs" min={1} max={100} initial={settings?.chairs} /><Numeric label="Minimum notice (minutes)" name="lead" max={10080} initial={settings?.lead_minutes} /><Numeric label="Booking window (days ahead)" name="horizon" min={1} max={180} initial={settings?.horizon_days} /><Numeric label="Time between offered starts (minutes)" name="step" min={5} max={60} initial={settings?.step_minutes} /></div></EditForm></>
}

function ServiceForm({ context, save, busy }: FormProps) {
  const [selected, setSelected] = useState('')
  const setting = context.service_settings.find(item => item.service_id === selected)
  return <><h2 className="text-xl font-semibold">Service duration and equipment</h2><p className="muted mt-3 text-sm leading-6">Configure each service offered at this branch. Cleanup time also occupies the dentist, chair, and required equipment.</p><label className="mt-5">Service<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Choose a service</option>{context.services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>{selected && <EditForm key={selected} busy={busy} submit={data => void save('service', {
    service_id: selected, duration_minutes: number(data, 'duration'), buffer_minutes: number(data, 'buffer'), enabled: checked(data, 'enabled'),
    requirements: context.resources.map(resource => ({ resource_id: resource.id, units: number(data, `resource_${resource.id}`) })).filter(resource => resource.units > 0),
  })}><div className="field-grid"><Numeric label="Procedure duration (minutes)" name="duration" min={5} max={480} initial={setting?.duration_minutes} /><Numeric label="Cleanup buffer (minutes)" name="buffer" max={120} initial={setting?.buffer_minutes} /></div><label className="flex items-center gap-3"><input type="checkbox" name="enabled" defaultChecked={setting?.enabled ?? false} />Offered at this branch</label>{context.resources.length > 0 && <fieldset><legend className="mb-3 text-sm font-medium">Equipment units needed (0 if none)</legend><div className="field-grid">{context.resources.map(resource => <Numeric key={resource.id} label={`${resource.name} · ${resource.capacity} available`} name={`resource_${resource.id}`} max={resource.capacity} initial={context.requirements.find(item => item.service_id === selected && item.resource_id === resource.id)?.units ?? 0} />)}</div></fieldset>}</EditForm>}</>
}

function DentistForm({ context, save, busy }: FormProps) {
  const [selected, setSelected] = useState('')
  const dentist = context.dentists.find(item => item.id === selected)
  return <><h2 className="text-xl font-semibold">Dentist profiles and eligible services</h2><p className="muted mt-3 text-sm leading-6">These settings apply across both branches. Use actual clinic information. Publishing shows the profile to patients; patients cannot choose a dentist.</p><label className="mt-5">Profile<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Add a dentist</option>{context.dentists.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><EditForm key={selected} busy={busy} submit={data => void save('dentist', {
    id: selected || null, name: value(data, 'name'), about: value(data, 'about'), photo_url: value(data, 'photo'), published: checked(data, 'published'), active: checked(data, 'active'), travel_minutes: number(data, 'travel'), service_ids: data.getAll('services').map(String),
  })}><div className="field-grid"><label>Dentist name<input name="name" required maxLength={120} defaultValue={dentist?.name ?? ''} /></label><label>Photo URL (optional)<input type="url" name="photo" pattern="https://.*" maxLength={2000} placeholder="https://…" defaultValue={dentist?.photo_url ?? ''} /></label></div><label>About me<textarea name="about" maxLength={3000} rows={3} defaultValue={dentist?.about ?? ''} /></label><Numeric label="Minimum travel time between branches (minutes)" name="travel" max={240} initial={dentist?.travel_minutes ?? undefined} /><div className="flex flex-wrap gap-5"><label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={dentist?.active ?? true} />Active for scheduling</label><label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={dentist?.published ?? false} />Publish patient-facing profile</label></div><fieldset><legend className="mb-3 text-sm font-medium">Services this dentist may perform</legend><div className="grid gap-3 sm:grid-cols-2">{context.services.map(service => <label className="flex items-center gap-2 text-sm" key={service.id}><input type="checkbox" name="services" value={service.id} defaultChecked={dentist?.service_ids.includes(service.id)} />{service.name}</label>)}</div></fieldset></EditForm></>
}

function ResourceForm({ context, save, busy }: FormProps) {
  const [selected, setSelected] = useState('')
  const resource = context.resources.find(item => item.id === selected)
  return <><h2 className="text-xl font-semibold">Shared equipment</h2><p className="muted mt-3 text-sm leading-6">Add equipment that limits simultaneous procedures, then specify its usage under Services. Treatment chairs are configured under Branch settings.</p><label className="mt-5">Equipment<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Add equipment</option>{context.resources.map(item => <option value={item.id} key={item.id}>{item.name} ({item.capacity})</option>)}</select></label><EditForm key={selected} busy={busy} submit={data => void save('resource', { id: selected || null, name: value(data, 'name'), capacity: number(data, 'capacity') })}><label>Equipment name<input name="name" required maxLength={80} defaultValue={resource?.name ?? ''} /></label><Numeric label="Available units" name="capacity" min={1} max={100} initial={resource?.capacity} /></EditForm></>
}

function ShiftForm({ context, save, busy }: FormProps) {
  return <><h2 className="text-xl font-semibold">Dated work shifts</h2><p className="muted mt-3 text-sm leading-6">Add working periods for an actual date. Enter separate periods before and after a break. Each shift must fit the branch opening hours; overlaps and insufficient travel time are rejected.</p>{!context.settings && <p className="notice mt-4">An administrator must configure this branch first.</p>}<EditForm busy={busy} disabled={!context.settings} submit={data => void save('shift', { dentist_id: value(data, 'dentist'), starts_at: instant(data, 'start'), ends_at: instant(data, 'end') })}><label>Dentist<select name="dentist" required defaultValue=""><option value="" disabled>Choose an active dentist</option>{context.dentists.filter(d => d.active).map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label><div className="field-grid"><label>Start (Philippine time)<input type="datetime-local" name="start" required /></label><label>End (Philippine time)<input type="datetime-local" name="end" required /></label></div></EditForm><h3 className="mt-8 font-medium">Upcoming shifts</h3><div className="mt-4 space-y-3">{context.shifts.length ? context.shifts.map(shift => <article className="rounded-xl border border-[#e1e5e9] p-4" key={shift.id}><p className="font-medium">{context.dentists.find(d => d.id === shift.dentist_id)?.name ?? 'Dentist'}</p><p className="muted mt-2 text-sm">{when(shift.starts_at)} → {when(shift.ends_at)}</p><button disabled={busy} type="button" className="mt-3 text-sm underline" onClick={() => void save('remove_shift', { id: shift.id })}>Remove shift</button></article>) : <p className="muted text-sm">No work shifts entered.</p>}</div></>
}

function BlockForm({ context, save, busy }: FormProps) {
  return <><h2 className="text-xl font-semibold">Leave and branch closures</h2><p className="muted mt-3 text-sm leading-6">A blocked period removes overlapping times from the preview. Dentist leave applies to shifts in the selected branch; record both branches if needed.</p><EditForm busy={busy} submit={data => void save('block', { dentist_id: value(data, 'dentist') || null, starts_at: instant(data, 'start'), ends_at: instant(data, 'end'), reason: value(data, 'reason') })}><label>Applies to<select name="dentist" defaultValue=""><option value="">Entire branch</option>{context.dentists.filter(d => context.shifts.some(s => s.dentist_id === d.id)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label><div className="field-grid"><label>Start (Philippine time)<input type="datetime-local" name="start" required /></label><label>End (Philippine time)<input type="datetime-local" name="end" required /></label></div><label>Reason<input name="reason" required maxLength={200} /></label></EditForm><div className="mt-8 space-y-3">{context.blocks.length ? context.blocks.map(block => <article className="rounded-xl border border-[#e1e5e9] p-4" key={block.id}><p className="font-medium">{block.dentist_id ? context.dentists.find(d => d.id === block.dentist_id)?.name : 'Entire branch'} · {block.reason}</p><p className="muted mt-2 text-sm">{when(block.starts_at)} → {when(block.ends_at)}</p><button disabled={busy} className="mt-3 text-sm underline" onClick={() => void save('remove_block', { id: block.id })}>Remove blocked period</button></article>) : <p className="muted text-sm">No blocked periods entered.</p>}</div></>
}

function Preview({ context, branchId }: { context: ScheduleContext; branchId: string }) {
  const [result, setResult] = useState<AvailabilityPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    setBusy(true); setResult(null); setError('')
    try { setResult(await previewAvailability(branchId, value(data, 'service'), value(data, 'date'))) }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not calculate preview.') }
    finally { setBusy(false) }
  }
  return <><h2 className="text-xl font-semibold">Check configuration</h2><p className="muted mt-3 text-sm leading-6">This preview checks shifts, eligible services, buffers, chairs, equipment, blocked periods, and existing appointment holds. Checking times does not reserve them.</p><form className="mt-6 space-y-5" onSubmit={submit}><fieldset disabled={busy}><div className="field-grid"><label>Service<select name="service" required defaultValue=""><option value="" disabled>Choose a service</option>{context.services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Date<input name="date" type="date" required /></label></div><button className="btn btn-primary mt-5">{busy ? 'Checking…' : 'Check times'}</button></fieldset></form>{error && <p role="alert" className="notice mt-5">{error}</p>}{result && <div className="mt-6" role="status"><p className="notice">{result.reason}</p><p className="muted mt-4 text-sm">{result.slots.filter(slot => slot.available).length} possible starts · green fits, gray unavailable. These starts are alternatives, not separate bookable slots.</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{result.slots.map(slot => <div key={slot.starts_at} className={`rounded-xl border p-3 text-center text-sm ${slot.available ? 'border-[#93d4bf] bg-clinic-mint' : 'border-[#e1e5e9] bg-[#f5f6f8] text-gray-500'}`}>{time(slot.starts_at)}<span className="mt-1 block text-xs">{slot.available ? 'Fits schedule' : 'Unavailable'}</span></div>)}</div></div>}</>
}

export default function ScheduleWorkspace({ branchId, admin }: { branchId: string; admin: boolean }) {
  const [context, setContext] = useState<ScheduleContext | null>(null)
  const [tab, setTab] = useState(admin ? 'Branch' : 'Shifts')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    getScheduleContext(branchId).then(data => { if (active) setContext(data) }).catch(error => { if (active) setMessage(error.message) })
    return () => { active = false }
  }, [branchId])
  const save: Save = async (action, data) => {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      await configureSchedule(branchId, action, data)
      setContext(await getScheduleContext(branchId)); setRevision(current => current + 1); setMessage('Configuration saved. Availability uses the updated settings.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save configuration.') }
    finally { setBusy(false) }
  }
  if (!context) return <section className="card p-6"><p role="status">{message || 'Loading scheduling configuration…'}</p>{message && <button className="btn btn-secondary mt-4" onClick={() => location.reload()}>Reload</button>}</section>
  const tabs = admin ? ['Branch', 'Dentists', 'Equipment', 'Services', 'Shifts', 'Blocked periods', 'Preview'] : ['Shifts', 'Blocked periods', 'Preview']
  const props = { context, save, busy }
  return <div><p className="notice mb-6">Scheduling setup · Patient availability is closed until clinic configuration and booking checks are approved.</p><div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Scheduling sections">{tabs.map(item => <button key={item} disabled={busy} aria-pressed={tab === item} onClick={() => { setTab(item); setMessage('') }} className={`rounded-xl border px-4 py-3 text-sm ${tab === item ? 'border-[#ef9eb8] bg-[#fff0f5] text-[#c52559]' : 'border-[#e1e5e9] bg-white'}`}>{item}</button>)}</div>{message && <p className="notice mb-5" role="status">{message}</p>}<section key={`${tab}-${revision}`} className="card card-shadow p-5 sm:p-7">{tab === 'Branch' && <BranchForm {...props} />}{tab === 'Dentists' && <DentistForm {...props} />}{tab === 'Equipment' && <ResourceForm {...props} />}{tab === 'Services' && <ServiceForm {...props} />}{tab === 'Shifts' && <ShiftForm {...props} />}{tab === 'Blocked periods' && <BlockForm {...props} />}{tab === 'Preview' && <Preview context={context} branchId={branchId} />}</section></div>
}
