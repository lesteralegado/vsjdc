import ClinicLogo from '../components/ClinicLogo'
import BranchDetails from '../components/BranchDetails'
import { branches, contacts } from '../data/clinic'
import { useCatalogue } from '../lib/useCatalogue'

export default function HomePage() {
  const { services, dentists, loading, error } = useCatalogue()
  return <div className="container-clinic space-y-16 pt-6 sm:space-y-20 sm:pt-8">
    <section className="card grid items-center gap-8 overflow-hidden p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12 lg:p-14">
      <div><span className="badge">Cabuyao · Santa Rosa</span><h1 className="mt-6 max-w-[650px] text-[clamp(2rem,3.7vw,3.5rem)] leading-[1.2] font-bold tracking-[-.035em]">A brighter smile starts with an easier appointment.</h1>
        <p className="muted mt-6 max-w-xl text-sm leading-7 sm:text-base">Choose your clinic, service, and schedule in just a few steps. We’ll help you find another time if your first choice is unavailable.</p>
        <a href="/appointments" className="btn btn-primary mt-7">Appointments <span aria-hidden="true">→</span></a>
      </div>
      <div className="flex min-h-56 items-center justify-center rounded-[28px] bg-clinic-mint p-6 sm:min-h-80 lg:min-h-96"><div className="w-full rounded-2xl bg-white p-1 sm:p-3"><ClinicLogo variant="wordmark" /></div></div>
    </section>
    <section aria-labelledby="steps-heading"><h2 id="steps-heading" className="section-title">Book in three simple steps</h2><div className="mt-6 grid gap-5 md:grid-cols-3">
      {[
        ['Choose a clinic', 'Pick Cabuyao or Santa Rosa for your next visit.'],
        ['Select service & time', 'See available appointment times at your selected branch.'],
        ['Send your request', 'Receive a reference number and wait for clinic confirmation.'],
      ].map(([title, description], i) => <article key={title} className="card card-shadow p-6"><span className="badge badge-pink">0{i + 1}</span><h3 className="mt-4 font-medium">{title}</h3><p className="muted mt-3 text-sm leading-6">{description}</p></article>)}
    </div></section>
    <section id="services" aria-labelledby="services-heading"><h2 id="services-heading" className="section-title">Dental services</h2><p className="muted mt-2 text-sm leading-6">Explore the treatments and dental services available at V. San Juan Dental Clinic.</p>
      {loading && <p role="status" className="mt-6 muted">Loading services…</p>}{error && <p role="alert" className="notice mt-6">{error}</p>}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-flow-col lg:grid-cols-3 lg:grid-rows-5">{services.map((service, i) => <li key={service.id} className="flex items-center gap-3 rounded-xl border border-[#e1e5e9] bg-white px-4 py-3 text-sm font-medium"><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${i % 2 ? 'bg-clinic-pink' : 'bg-clinic-green'}`} />{service.name}</li>)}</ul>
    </section>
    <section id="dentists" aria-labelledby="dentists-heading"><h2 id="dentists-heading" className="section-title">Meet our dentists</h2><p className="muted mt-2 text-sm leading-6">Get to know the team caring for your smile, their experience, and their areas of focus.</p>
      <div className="mt-6 grid gap-5 md:grid-cols-3">{dentists.length ? dentists.map(dentist => <article className="card p-4" key={dentist.id}>{dentist.photoUrl ? <img src={dentist.photoUrl} alt={dentist.name} className="h-48 w-full rounded-xl object-cover" /> : <div className="flex h-40 items-center justify-center rounded-xl bg-clinic-mint text-sm text-[#11785e]">Photo coming soon</div>}<h3 className="mt-4 text-lg font-semibold">{dentist.name}</h3><p className="mt-2 text-xs font-medium text-[#11785e]">About me</p><p className="muted mt-2 text-sm leading-6">{dentist.about || 'Introduction coming soon.'}</p></article>) : [0, 1, 2].map(i => <article key={i} className="card p-4"><div className={`flex h-36 items-center justify-center rounded-xl text-sm ${i === 1 ? 'bg-[#fff0f5] text-[#c52559]' : 'bg-clinic-mint text-[#11785e]'}`}>Dentist photo coming soon</div><h3 className="mt-4 text-lg font-semibold">Meet your dentist soon</h3><p className="mt-2 text-xs font-medium text-[#11785e]">About me</p><p className="muted mt-2 text-sm leading-6">Our dentist profiles will be available here soon. Contact the clinic to learn more about the team.</p></article>)}</div>
    </section>
    <section id="locations" aria-labelledby="locations-heading"><h2 id="locations-heading" className="section-title">Two locations, one easier booking experience</h2><div className="mt-6 grid gap-5 md:grid-cols-2">{branches.map(branch => <article className="card card-shadow p-6 sm:p-7" key={branch.id}><BranchDetails branch={branch} /></article>)}</div></section>
    <section id="contact" aria-labelledby="contact-heading"><h2 id="contact-heading" className="section-title">Contact the clinic</h2><p className="muted mt-2 text-sm leading-6">Questions before booking? Reach V. San Juan Dental Clinic through email or social media.</p><div className="mt-6 grid gap-5 md:grid-cols-3">{contacts.map((contact, i) => <a key={contact.label} href={contact.href} target={i ? '_blank' : undefined} rel="noopener noreferrer" className="card p-6 transition-colors hover:border-clinic-green"><p className={`text-xs font-medium ${i ? 'text-[#c52559]' : 'text-[#11785e]'}`}>{contact.label} <span aria-hidden="true">↗</span></p><p className="mt-4 break-words text-sm font-medium">{contact.title}</p><p className="muted mt-3 break-words text-xs leading-6">{contact.description}</p></a>)}</div></section>
  </div>
}
