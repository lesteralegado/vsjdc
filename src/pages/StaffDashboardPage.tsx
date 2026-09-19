import { lazy, Suspense, useEffect, useState } from 'react'
import ClinicLogo from '../components/ClinicLogo'
import StaffAppointmentList from '../components/StaffAppointmentList'
const ScheduleWorkspace = lazy(() => import('../components/ScheduleWorkspace'))
import BranchDetails from '../components/BranchDetails'
import { branches } from '../data/clinic'
import { demoEnabled, demoAppointmentDate } from '../lib/demo'
import { useCatalogue } from '../lib/useCatalogue'
import { listStaff, setStaffAccess, signOut, type StaffContext, type StaffMember } from '../lib/staffApi'

const sections = ['Appointments', 'Pending requests', 'Dentist Schedules', 'Services', 'Branches']
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

function StaffAccess({ staff }: { staff: StaffContext }) {
  const [members, setMembers] = useState<StaffMember[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(true)
  useEffect(() => {
    let active = true
    listStaff().then(data => { if (active) setMembers(data) }).catch(() => { if (active) setMessage('Could not load staff access.') }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [])
  function edit(userId: string, changes: Partial<StaffMember>) {
    setMembers(current => current.map(member => member.user_id === userId ? { ...member, ...changes } : member))
  }
  async function save(member: StaffMember) {
    setBusy(true); setMessage('')
    try { await setStaffAccess(member); setMembers(await listStaff()); setMessage('Staff access saved.') }
    catch { setMessage('Access could not be saved. Active receptionists need a branch. Refresh and try again.') }
    finally { setBusy(false) }
  }
  return <section className="card p-6"><h2 className="text-xl font-medium">Staff access</h2><p className="muted mt-3 text-sm">Manage existing staff accounts. Your own access cannot be changed here.</p>{message && <p className="notice mt-4" role="status">{message}</p>}{busy && <p role="status" className="mt-4">Please wait…</p>}<div className="mt-6 space-y-5">{members.map(member => <fieldset disabled={busy || member.user_id === staff.user_id} key={member.user_id} className="rounded-xl border border-[#e1e5e9] p-4"><legend className="px-2 font-medium">{member.display_name}{member.user_id === staff.user_id ? ' (you)' : ''}</legend><div className="field-grid"><label>Role<select value={member.role} onChange={e => edit(member.user_id, { role: e.target.value as StaffMember['role'] })}><option value="receptionist">Receptionist</option><option value="admin">Administrator</option></select></label><label className="flex items-center gap-3"><input type="checkbox" checked={member.active} onChange={e => edit(member.user_id, { active: e.target.checked })} />Active account</label></div>{member.role === 'receptionist' && <div className="mt-4 flex flex-wrap gap-5">{staff.branches.map(branch => <label className="flex items-center gap-2" key={branch.id}><input type="checkbox" checked={member.branch_ids.includes(branch.id)} onChange={e => edit(member.user_id, { branch_ids: e.target.checked ? [...member.branch_ids, branch.id] : member.branch_ids.filter(id => id !== branch.id) })} />{branch.name}</label>)}</div>}<button className="btn btn-secondary mt-4" onClick={() => void save(member)}>Save access</button></fieldset>)}</div></section>
}

export default function StaffDashboardPage({ staff }: { staff: StaffContext }) {
  const [section, setSection] = useState('Appointments')
  const [branchId, setBranchId] = useState(staff.branches[0].id)
  const [date, setDate] = useState(today)
  const [error, setError] = useState('')
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const pendingOnly = section === 'Pending requests'
  const catalogue = useCatalogue(false)
  const branch = staff.branches.find(item => item.id === branchId) ?? staff.branches[0]
  function clearRecords() { setRefreshVersion(v => v + 1); setError('') }
  async function logout() {
    setLogoutBusy(true); setError('')
    try { await signOut(); location.replace('/staff/login') }
    catch { setError('Sign out could not be completed. Check your connection and try again.'); setLogoutBusy(false) }
  }
  return <div className="min-h-screen bg-[#f6f7f9] lg:grid lg:grid-cols-[250px_minmax(0,1fr)]"><aside className="border-b border-[#e6e8ec] bg-white p-5 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-r lg:p-6"><a href="/" className="flex items-center gap-2"><ClinicLogo className="w-14" /><span className="text-xs tracking-wider text-clinic-pink">V. SAN JUAN<span className="mt-1 block text-[8px]">DENTAL CLINIC</span></span></a><p className="muted mt-4 break-words text-xs">{staff.display_name} · {staff.role}</p><nav aria-label="Staff navigation" className="mt-5 flex flex-wrap gap-2 lg:flex-col">{[...sections, ...(staff.role === 'admin' ? ['Staff Access'] : [])].map(item => <button key={item} aria-current={section === item ? 'page' : undefined} onClick={() => { clearRecords(); setSection(item); setRefreshVersion(v => v + 1) }} className={`rounded-xl px-4 py-3 text-left text-sm ${section === item ? 'bg-[#fff0f5] text-[#c52559]' : 'hover:bg-clinic-mint'}`}>{item}</button>)}</nav><label className="mt-7 text-xs">Viewing branch<select value={branchId} onChange={e => { clearRecords(); setBranchId(e.target.value) }}>{staff.branches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button onClick={() => void logout()} disabled={logoutBusy} className="mt-5 py-2 text-sm underline">{logoutBusy ? 'Signing out…' : 'Sign out'}</button></aside><main className="min-w-0 p-5 sm:p-8 lg:p-10"><h1 className="mb-6 text-3xl font-bold">{section}</h1>{demoEnabled && demoAppointmentDate && <div className="notice mb-6"><p>Demo appointments are dated {demoAppointmentDate}. Use new test requests to try staff confirmation. These older examples can be reviewed or rejected.</p><button className="mt-3 underline" onClick={() => { clearRecords(); if (demoAppointmentDate) setDate(demoAppointmentDate); setSection('Appointments') }}>View demo appointments</button></div>}{error && <p role="alert" className="notice mb-6">{error}</p>}{!logoutBusy && ['Pending requests', 'Appointments'].includes(section) && <StaffAppointmentList key={`${branchId}:${section}:${date}:${refreshVersion}`} branchId={branchId} branchName={branch.name} initialDate={date} pendingOnly={pendingOnly} />}{section === 'Dentist Schedules' && <Suspense fallback={<p role="status">Loading scheduling…</p>}><ScheduleWorkspace key={branchId} branchId={branchId} admin={staff.role === 'admin'} /></Suspense>}{section === 'Services' && <section className="card p-6"><h2 className="text-xl font-medium">Published clinic services</h2>{catalogue.loading && <p role="status" className="mt-4">Loading services…</p>}{catalogue.error && <p role="alert" className="notice mt-4">{catalogue.error}</p>}<ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{catalogue.services.map(service => <li key={service.id} className="rounded-xl border border-[#e1e5e9] p-4 text-sm">{service.name}</li>)}</ul></section>}{section === 'Branches' && <div className="grid gap-6 xl:grid-cols-2">{branches.filter(item => staff.branches.some(allowed => allowed.slug === item.id)).map(item => <section className="card p-6" key={item.id}><BranchDetails branch={item} /></section>)}</div>}{section === 'Staff Access' && staff.role === 'admin' && <StaffAccess staff={staff} />}</main></div>
}
