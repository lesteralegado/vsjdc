import { branches } from '../data/clinic'

export default function BranchDetails({ branch, compact = false }: { branch: typeof branches[number]; compact?: boolean }) {
  return <div className={`space-y-3 text-sm ${compact ? '' : 'flex h-full flex-col'}`}>
    {!compact && <h3 className="text-lg font-medium">{branch.name}</h3>}
    <a className="muted block leading-6 hover:text-[#11785e] hover:underline" href={branch.maps} target="_blank" rel="noopener noreferrer">{branch.address}</a>
    <p className="font-medium">Clinic hours · {branch.hours}</p>
    <div className="flex flex-wrap gap-x-3 gap-y-2 muted">{branch.phones.map(phone => <a key={phone.href} href={phone.href} className="hover:text-[#11785e] hover:underline">{phone.label}</a>)}</div>
    <div className="flex flex-wrap gap-2 pt-2"><a className="badge hover:bg-[#daf4eb]" href={branch.maps} target="_blank" rel="noopener noreferrer">View in Google Maps ↗</a>{!compact && <a className="badge hover:bg-[#daf4eb]" href={`/appointments?branch=${branch.id}`}>Appointments →</a>}</div>
  </div>
}
