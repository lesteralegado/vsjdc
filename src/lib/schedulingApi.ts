import { requireSupabase } from './supabase'
import type { Json } from './database.types'

export type ScheduleDentist = { id: string; name: string; about: string; photo_url: string | null; published: boolean; active: boolean | null; travel_minutes: number | null; service_ids: string[] }
export type ScheduleContext = {
  settings: { opening_days: number[]; opens_at: string; closes_at: string; chairs: number; lead_minutes: number; horizon_days: number; step_minutes: number } | null
  services: { id: string; name: string; published: boolean }[]
  service_settings: { service_id: string; duration_minutes: number; buffer_minutes: number; enabled: boolean }[]
  dentists: ScheduleDentist[]
  shifts: { id: string; dentist_id: string; starts_at: string; ends_at: string }[]
  blocks: { id: string; dentist_id: string | null; starts_at: string; ends_at: string; reason: string }[]
  resources: { id: string; name: string; capacity: number }[]
  requirements: { service_id: string; resource_id: string; units: number }[]
}
export type AvailabilityPreview = { reason: string; slots: { starts_at: string; ends_at: string; available: boolean }[] }
export type ScheduleAction = 'branch' | 'service' | 'dentist' | 'resource' | 'shift' | 'remove_shift' | 'block' | 'remove_block'

export async function getScheduleContext(branch: string): Promise<ScheduleContext> {
  const { data, error } = await requireSupabase().rpc('schedule_context', { p_branch: branch })
  if (error || !data) throw new Error('Could not load scheduling settings. Please retry or sign in again.')
  return data as unknown as ScheduleContext
}
export async function configureSchedule(branch: string, action: ScheduleAction, data: Json) {
  const { error } = await requireSupabase().rpc('configure_schedule', { p_branch: branch, p_action: action, p_data: data })
  if (error) throw new Error(['P0001', '42501'].includes(error.code) ? error.message : 'Check all required fields, selected services, and numeric limits, then try again.')
}
export async function previewAvailability(branch: string, service: string, date: string): Promise<AvailabilityPreview> {
  const { data, error } = await requireSupabase().rpc('preview_availability', { p_branch: branch, p_service: service, p_date: date })
  if (error || !data) throw new Error('Could not calculate this preview. Please retry or sign in again.')
  return data as unknown as AvailabilityPreview
}
