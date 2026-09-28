import { useEffect, useState } from 'react'
import { APPOINTMENT_PAGE_SIZE, getAppointments, type StaffAppointment } from '../lib/staffApi'
import StaffAppointmentCard from './StaffAppointmentCard'

export default function StaffAppointmentList({ branchId, branchName, initialDate, pendingOnly }: {
  branchId: string; branchName: string; initialDate: string; pendingOnly: boolean
}) {
  const [date, setDate] = useState(initialDate)
  const [status, setStatus] = useState('all')
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [records, setRecords] = useState<StaffAppointment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  function reset() { setPage(0); setRecords([]); setLoading(true); setError('') }
  function refresh() { reset(); setRevision(value => value + 1) }
  useEffect(() => {
    let active = true
    getAppointments(branchId, date, pendingOnly, { page, status, search }).then(result => {
      if (!active) return
      if (page > 0 && page * APPOINTMENT_PAGE_SIZE >= result.total) {
        setPage(Math.max(0, Math.ceil(result.total / APPOINTMENT_PAGE_SIZE) - 1))
        return
      }
      setRecords(result.appointments); setTotal(result.total); setLoading(false)
    }).catch(() => { if (active) { setError('Could not load appointments. Refresh records or sign in again.'); setLoading(false) } })
    return () => { active = false }
  }, [branchId, date, pendingOnly, page, status, search, revision])
  function changePage(next: number) { setRecords([]); setLoading(true); setError(''); setPage(next) }
  return <section className="card card-shadow p-5 sm:p-6" aria-busy={loading}>
    <h2 className="text-xl font-medium">{pendingOnly ? 'All pending requests' : 'Appointments'} · {branchName}</h2>
    {pendingOnly && <p className="muted mt-3 text-sm">Includes requests from every date awaiting staff review.</p>}
    <button className="mt-3 text-sm underline" onClick={refresh}>Refresh records</button>
    {!pendingOnly && <div className="field-grid mt-5">
      <label>Date (clear for all dates)<input type="date" value={date} onChange={event => { reset(); setDate(event.target.value) }} /></label>
      <label>Status<select value={status} onChange={event => { reset(); setStatus(event.target.value) }}>{['all', 'pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', 'rejected'].map(value => <option key={value} value={value}>{value === 'all' ? 'All statuses' : value.replaceAll('_', ' ')}</option>)}</select></label>
    </div>}
    <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); reset(); setSearch(draft.trim()); setRevision(value => value + 1) }}>
      <label className="min-w-0 flex-1">Appointment reference number<input className="w-full" value={draft} maxLength={64} placeholder="Enter the full reference" onChange={event => setDraft(event.target.value)} /></label>
      <button className="btn btn-primary" type="submit">Search</button>
      <button className="btn btn-secondary" type="button" onClick={() => { reset(); setDraft(''); setSearch(''); setRevision(value => value + 1) }}>Clear search</button>
    </form>
    <p className="muted mt-2 text-xs">Search uses the selected branch, date and status filters.</p>
    {error && <p className="notice mt-5" role="alert">{error}</p>}
    {loading ? <p role="status" className="py-8">Loading appointments…</p> : !error && <>
      <p role="status" className="muted mt-5 text-sm">{total ? `${page * APPOINTMENT_PAGE_SIZE + 1}–${Math.min((page + 1) * APPOINTMENT_PAGE_SIZE, total)} of ${total} appointments` : 'No appointments match these filters.'}</p>
      <div className="mt-5 space-y-3">{records.map(appointment => <StaffAppointmentCard key={appointment.id} appointment={appointment} refresh={refresh} />)}</div>
      {total > APPOINTMENT_PAGE_SIZE && <nav aria-label="Appointment pages" className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button className="btn btn-secondary" disabled={page === 0} onClick={() => changePage(page - 1)}>Previous</button>
        <span className="text-sm">Page {page + 1} of {Math.ceil(total / APPOINTMENT_PAGE_SIZE)}</span>
        <button className="btn btn-secondary" disabled={(page + 1) * APPOINTMENT_PAGE_SIZE >= total} onClick={() => changePage(page + 1)}>Next</button>
      </nav>}
    </>}
  </section>
}
