// This label is never an authorization check. Database permissions still apply.
export const demoEnabled = import.meta.env.VITE_DEMO_DATA === 'true'
  && import.meta.env.VITE_SUPABASE_URL === 'https://sqqwjiuskzgwxvxukmxi.supabase.co'
export const demoAppointmentDate = import.meta.env.VITE_DEMO_APPOINTMENT_DATE as string | undefined
