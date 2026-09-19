import { supabase, requireSupabase } from './supabase'
import { signIn } from './staffApi'

export type Appointment = {
  reference: string
  status: string
  branch: string
  dentist: string | null
  service: string
  scheduledAt: string
}

export type Dentist = { id: string; name: string; photoUrl?: string; about?: string }
export type Service = { id: string; name: string }
export type TimeSlot = { id: string; startsAt: string; available: boolean; suggested?: boolean }
export type BookingRequest = {
  requestId: string; consent: boolean
  branchId: string; serviceId: string; slotId: string
  firstName: string; lastName: string; mobile: string; email: string; notes: string
}

// Catalogue/auth availability does not enable booking before scheduling is implemented.
export interface ClinicApi {
  connected: boolean
  bookingEnabled: boolean
  trackingEnabled: boolean
  getServices(): Promise<Service[]>
  getDentists(branchId?: string): Promise<Dentist[]>
  getSlots(branchId: string, serviceId: string, date: string): Promise<TimeSlot[]>
  book(request: BookingRequest): Promise<Appointment>
  track(reference: string, mobile: string): Promise<Appointment | null>
  recover(requestId: string, mobile: string): Promise<Appointment | null>
  signIn(email: string, password: string): Promise<void>
}

export class PatientRequestError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}
async function patientRequest<T>(action: string, data: unknown): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/appointment-api`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ action, data }), signal: AbortSignal.timeout(20000),
  })
  const result = await response.json()
  if (!response.ok) throw new PatientRequestError(result.error || 'Request could not be completed. Please retry.', response.status)
  return result.data as T
}
export const clinicApi: ClinicApi = {
  connected: Boolean(supabase),
  bookingEnabled: Boolean(supabase) && import.meta.env.VITE_BOOKING_ENABLED === 'true',
  trackingEnabled: Boolean(supabase),
  async getServices() {
    const { data, error } = await requireSupabase().from('services').select('id,name').order('sort_order')
    if (error) throw error
    return data
  },
  async getDentists() {
    const { data, error } = await requireSupabase().from('dentists').select('id,name,about,photo_url').order('name')
    if (error) throw error
    return data.map(row => ({ id: row.id, name: row.name, about: row.about, photoUrl: row.photo_url ?? undefined }))
  },
  getSlots: (branchId, serviceId, date) => patientRequest<TimeSlot[]>('availability', { branchId, serviceId, date }),
  book: request => patientRequest<Appointment>('book', request),
  track: (reference, mobile) => patientRequest<Appointment | null>('track', { reference, mobile }),
  recover: (requestId, mobile) => patientRequest<Appointment | null>('track', { requestId, mobile }),
  signIn,
}
