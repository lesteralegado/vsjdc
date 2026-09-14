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
  branchId: string; serviceId: string; slotId: string
  firstName: string; lastName: string; mobile: string; email: string; notes: string
}

// Integration boundary: no fabricated records, fake authentication, or local patient storage.
// Replace this adapter with the application's Supabase-backed implementation when supplied.
export interface ClinicApi {
  connected: boolean
  getServices(): Promise<Service[]>
  getDentists(branchId?: string): Promise<Dentist[]>
  getSlots(branchId: string, serviceId: string, date: string): Promise<TimeSlot[]>
  book(request: BookingRequest): Promise<Appointment>
  track(reference: string, mobile: string): Promise<Appointment | null>
  signIn(email: string, password: string): Promise<void>
}

const unavailable = async (): Promise<never> => {
  throw new Error('Online appointments are not available yet. Please contact your branch for assistance.')
}
export const clinicApi: ClinicApi = {
  connected: false,
  getServices: unavailable, getDentists: unavailable, getSlots: unavailable,
  book: unavailable, track: unavailable, signIn: unavailable,
}
