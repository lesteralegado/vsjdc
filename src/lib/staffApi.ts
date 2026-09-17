import { requireSupabase } from './supabase'

export type StaffBranch = { id: string; slug: string; name: string }
export type StaffContext = { user_id: string; display_name: string; role: 'admin' | 'receptionist'; branches: StaffBranch[] }
export type StaffMember = { user_id: string; display_name: string; role: 'admin' | 'receptionist'; active: boolean; branch_ids: string[] }

export async function getStaffContext(): Promise<StaffContext> {
  const { data, error } = await requireSupabase().rpc('staff_context')
  if (error || !data || typeof data !== 'object' || Array.isArray(data)
    || !Array.isArray(data.branches) || !data.branches.length
    || !['admin', 'receptionist'].includes(String(data.role))) throw new Error('Active staff access is required. Contact your administrator.')
  return data as unknown as StaffContext
}

export async function signIn(email: string, password: string) {
  const client = requireSupabase()
  const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  try { await getStaffContext() }
  catch (error) { await client.auth.signOut({ scope: 'local' }); throw error }
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut({ scope: 'global' })
  if (error) throw error
}

export async function listStaff(): Promise<StaffMember[]> {
  const { data, error } = await requireSupabase().rpc('list_staff')
  if (error) throw error
  return (data ?? []) as unknown as StaffMember[]
}

export async function setStaffAccess(member: StaffMember) {
  const { error } = await requireSupabase().rpc('set_staff_access', {
    p_user_id: member.user_id, p_role: member.role, p_active: member.active, p_branch_ids: member.branch_ids,
  })
  if (error) throw error
}

export async function getAppointments(branchId: string, date: string, pendingOnly = false) {
  const start = new Date(`${date}T00:00:00+08:00`)
  const end = new Date(start.getTime() + 86400000)
  let query = requireSupabase().from('appointments')
    .select('id, branch_id, service_id, reference, version, starts_at, ends_at, status, services(name), dentists(name), appointment_contacts(patient_name, mobile, notes)')
    .eq('branch_id', branchId)
  query = pendingOnly ? query.eq('status', 'pending') : query.gte('starts_at', start.toISOString()).lt('starts_at', end.toISOString())
  const { data, error } = await query.order('starts_at').limit(200)
  if (error) throw error
  return data
}
export type StaffAppointment = Awaited<ReturnType<typeof getAppointments>>[number]

export async function appointmentAction(appointment: StaffAppointment, action: string, dentistId?: string) {
  const { error } = await requireSupabase().rpc('appointment_action', { p_id: appointment.id, p_expected: appointment.version, p_action: action, p_dentist: dentistId })
  if (error) throw new Error(['P0001', '42501'].includes(error.code) ? error.message : 'Could not update this appointment. Refresh and try again.')
}
