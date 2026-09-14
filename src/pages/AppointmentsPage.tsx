import { branches } from '../data/clinic'

export default function AppointmentsPage() {
  const branch = branches.find(item => item.id === new URLSearchParams(location.search).get('branch'))
  return <div className="container-clinic py-12 sm:py-20"><div className="mx-auto max-w-4xl">
    <a href="/" className="text-sm muted hover:text-clinic-pink">← Back to home</a>
    <div className="mt-8 text-center"><span className="badge">Your next smile starts here</span><h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Appointments</h1><p className="muted mt-4 leading-7">A new visit or an upcoming one — everything you need in one place.</p>{branch && <p className="mt-4 text-sm text-[#11785e]">Selected branch: {branch.name}</p>}</div>
    <div className="mt-10 grid gap-6 sm:grid-cols-2">
      <a href={`/appointments/book${branch ? `?branch=${branch.id}` : ''}`} className="card card-shadow flex flex-col p-7 transition-colors hover:border-clinic-green sm:p-9"><span className="badge w-fit">01 · New visit</span><h2 className="mt-7 text-2xl font-semibold">Book an Appointment</h2><p className="muted mt-4 flex-1 text-sm leading-7">Choose your branch, service, and preferred schedule.</p><span className="btn btn-primary mt-8">Get started →</span></a>
      <a href="/appointments/track" className="card card-shadow flex flex-col p-7 transition-colors hover:border-clinic-pink sm:p-9"><span className="badge badge-pink w-fit">02 · Upcoming visit</span><h2 className="mt-7 text-2xl font-semibold">Track an Appointment</h2><p className="muted mt-4 flex-1 text-sm leading-7">Check your appointment details and status using your reference number.</p><span className="btn btn-secondary mt-8">Check appointment →</span></a>
    </div><p className="muted mt-8 text-center text-sm">Need a hand? <a href="/#contact" className="font-medium text-[#11785e] underline">Contact the clinic</a></p>
  </div></div>
}
