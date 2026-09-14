import { useState } from 'react'
import ClinicLogo from './ClinicLogo'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  return <header className="sticky top-0 z-30 border-b border-[#f0eef2] bg-white/95 backdrop-blur">
    <div className="container-clinic flex min-h-22 items-center justify-between gap-4">
      <a href="/" className="flex shrink-0 items-center gap-2" aria-label="V. San Juan Dental Clinic home">
        <ClinicLogo className="w-14 sm:w-16" />
        <span className="text-[12px] font-medium tracking-[.07em] text-clinic-pink sm:text-sm">V. SAN JUAN<span className="mt-1 block text-[8px] tracking-[.12em]">DENTAL CLINIC</span></span>
      </a>
      <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm lg:flex">
        <a className="hover:text-clinic-pink" href="/">Home</a><a className="hover:text-clinic-pink" href="/#services">Services</a><a className="hover:text-clinic-pink" href="/#dentists">Dentists</a><a className="hover:text-clinic-pink" href="/#locations">Locations</a>
      </nav>
      <button className="btn btn-secondary px-4 lg:hidden" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
    </div>
    {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="container-clinic grid gap-1 border-t border-[#edf0f2] py-4 lg:hidden">
      {[['Home', '/'], ['Services', '/#services'], ['Dentists', '/#dentists'], ['Locations', '/#locations']].map(([label, href]) => <a key={label} className="rounded-lg px-3 py-3 hover:bg-clinic-mint" href={href} onClick={() => setOpen(false)}>{label}</a>)}
      <a href="/appointments" className="btn btn-primary mt-2">Appointments</a>
    </nav>}
  </header>
}
