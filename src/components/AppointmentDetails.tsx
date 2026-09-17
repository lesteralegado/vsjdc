import type { Appointment } from '../lib/clinicApi'

export default function AppointmentDetails({ appointment }: { appointment: Appointment }) {
  const date = new Date(appointment.scheduledAt)
  return <section className="card p-6" aria-label="Appointment information">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Your appointment</h2><span className={`badge ${appointment.status.toLowerCase() === 'pending' ? 'badge-pink' : ''}`}>{appointment.status}</span></div>
    <dl className="mt-6 space-y-4 text-sm">{[
      ['Reference', appointment.reference], ['Branch', appointment.branch], ['Dentist', appointment.dentist || 'To be assigned'], ['Service', appointment.service],
      ['Scheduled date', date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' })],
      ['Scheduled time', date.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }) + ' (Philippine time)'],
    ].map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4 border-b border-[#edf0f2] pb-3"><dt className="muted">{label}</dt><dd className="min-w-0 wrap-anywhere text-right font-medium">{value}</dd></div>)}</dl>
  </section>
}
