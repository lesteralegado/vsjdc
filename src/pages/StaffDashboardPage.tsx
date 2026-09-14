import { useState } from 'react'
import ClinicLogo from '../components/ClinicLogo'
import BranchDetails from '../components/BranchDetails'
import { branches, serviceNames } from '../data/clinic'

const sections = ['Dashboard', 'Appointments', 'Calendar', 'Dentist Schedules', 'Services', 'Branches']

export default function StaffDashboardPage() {
  const [section, setSection] = useState('Dashboard')
  const [branchId, setBranchId] = useState('cabuyao')
  const [status, setStatus] = useState('All statuses')
  const [search, setSearch] = useState('')
  const [date, setDate] = useState(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()))
  const branch = branches.find(item => item.id === branchId) || branches[0]
  const list = <section className="card card-shadow p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-medium">{section === 'Dashboard' ? 'Today’s appointments' : 'Appointments'}</h2><span className="badge">{branch.shortName}</span></div>
    {section !== 'Dashboard' && <div className="field-grid mt-6"><label>Search appointments<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or reference number" /></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}>{['All statuses', 'Pending', 'Confirmed', 'Checked in', 'Completed', 'Cancelled'].map(item => <option key={item}>{item}</option>)}</select></label></div>}
    <div className="my-8 flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[#dde3e8] p-6 text-center"><span className="badge">Schedule preview</span><h3 className="mt-5 font-medium">Your clinic’s day, at a glance</h3><p className="muted mt-3 max-w-md text-sm leading-7">Appointment records will appear here when the clinic system is connected. No patient information is displayed in this preview.</p></div>
  </section>
  return <div className="min-h-screen bg-[#f6f7f9] lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
    <aside className="border-b border-[#e6e8ec] bg-white p-5 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:p-6"><a href="/" className="flex items-center gap-2"><ClinicLogo className="w-14" /><span className="text-xs tracking-wider text-clinic-pink">V. SAN JUAN<span className="mt-1 block text-[8px]">DENTAL CLINIC</span></span></a><p className="muted mt-4 text-xs">Clinic Management</p>
      <nav aria-label="Staff navigation" className="mt-5 flex flex-wrap gap-2 lg:flex-col">{sections.map(item => <button key={item} type="button" aria-current={section === item ? 'page' : undefined} onClick={() => setSection(item)} className={`rounded-xl px-4 py-3 text-left text-sm transition-colors lg:py-4 ${section === item ? 'bg-[#fff0f5] text-[#c52559]' : 'hover:bg-clinic-mint'}`}>{item}</button>)}</nav>
      <label className="mt-7 rounded-xl border border-[#e1e5e9] p-3 text-xs muted">Viewing branch<select className="border-0 px-0 py-1 text-sm text-clinic-ink" value={branchId} onChange={e => setBranchId(e.target.value)}>{branches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><a href="/staff/login" className="mt-5 inline-block py-2 text-xs muted underline">Back to staff login</a>
    </aside>
    <main className="min-w-0 p-5 sm:p-8 lg:p-10"><div className="notice mb-7"><strong>Dashboard UI preview</strong><p>Live staff access and clinic records are not connected. These screens contain no patient data.</p></div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-5"><div><p className="muted text-sm">{section === 'Dashboard' ? 'Welcome to your clinic' : 'Clinic management'}</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{section === 'Dashboard' ? 'Today’s clinic schedule' : section}</h1></div><a className="btn btn-primary" href="/appointments/book">New appointment</a></div>
      {section === 'Dashboard' && <><div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">{['Today', 'Pending', 'Confirmed', 'Walk-ins'].map((label, i) => <div className="card card-shadow p-5" key={label}><p aria-label={`${label}: data unavailable`} className={`text-3xl font-bold ${i === 1 ? 'text-clinic-pink' : 'text-[#11785e]'}`}>—</p><p className="muted mt-4 text-sm">{label}</p></div>)}</div><div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">{list}<div className="space-y-6"><section className="card card-shadow p-6"><h2 className="text-lg font-medium">Walk-in availability</h2><p className="muted mt-3 text-sm leading-6">Availability is managed by clinic staff.</p><span className="badge mt-5">Status unavailable</span></section><section className="card card-shadow p-6"><h2 className="text-lg font-medium">Dentist location today</h2><p className="muted mt-4 text-sm leading-7">Branch assignments will appear here when dentist schedules are connected.</p></section></div></div></>}
      {section === 'Appointments' && list}
      {section === 'Calendar' && <section className="card p-6"><h2 className="text-xl font-medium">Clinic calendar</h2><div className="mt-5 max-w-sm"><label>Choose a date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label></div><p className="mt-6 text-sm">{date ? new Date(`${date}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'full' }) : 'Select a date'} · {branch.name}</p><p className="muted mt-4 text-sm leading-7">The daily schedule will be available once the clinic system is connected.</p></section>}
      {section === 'Dentist Schedules' && <section className="card p-6"><h2 className="text-xl font-medium">Dentist schedules · {branch.shortName}</h2><p className="muted mt-4 text-sm leading-7">No live schedules are connected. Dentist names, branch assignments, working hours, and unavailable periods will appear here.</p></section>}
      {section === 'Services' && <section className="card p-6"><h2 className="text-xl font-medium">Clinic services</h2><p className="muted mt-3 text-sm">Clinic-supplied catalogue · editing is unavailable in preview.</p><ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{serviceNames.map(name => <li className="rounded-xl border border-[#e1e5e9] p-4 text-sm" key={name}>{name}</li>)}</ul></section>}
      {section === 'Branches' && <div className="grid gap-6 xl:grid-cols-2">{branches.map(item => <section className="card p-6" key={item.id}><BranchDetails branch={item} /></section>)}</div>}
    </main>
  </div>
}
