import ClinicLogo from './ClinicLogo'
import { contacts } from '../data/clinic'

export default function Footer() {
  return <footer className="mt-20 border-t border-[#e6e8eb] bg-white py-8">
    <div className="container-clinic flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
      <a href="/" className="flex items-center gap-3 text-sm font-medium"><ClinicLogo className="w-12" />V. San Juan Dental Clinic</a>
      <div className="flex flex-wrap gap-x-6 gap-y-4 text-xs muted">{contacts.map(contact => <a key={contact.label} href={contact.href} target={contact.label === 'Email' ? undefined : '_blank'} rel="noopener noreferrer" className="hover:text-clinic-pink">{contact.label}</a>)}<a href="/staff/login" className="hover:text-clinic-pink">Staff login</a></div>
    </div>
    <div className="container-clinic mt-6 text-xs muted">© {new Date().getFullYear()} V. San Juan Dental Clinic · Cabuyao & Santa Rosa</div>
  </footer>
}
