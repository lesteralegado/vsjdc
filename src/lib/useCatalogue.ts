import { useEffect, useState } from 'react'
import { clinicApi, type Dentist, type Service } from './clinicApi'
import { serviceNames } from '../data/clinic'

export function useCatalogue(includeDentists = true) {
  const [services, setServices] = useState<Service[]>(clinicApi.connected ? [] : serviceNames.map(name => ({ id: name, name })))
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [loading, setLoading] = useState(clinicApi.connected)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!clinicApi.connected) return
    let active = true
    Promise.all([clinicApi.getServices(), includeDentists ? clinicApi.getDentists() : Promise.resolve([])]).then(([nextServices, nextDentists]) => {
      if (active) { setServices(nextServices); setDentists(nextDentists); setError('') }
    }).catch(() => { if (active) setError('We could not load clinic information. Please try again later.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [includeDentists])
  return { services, dentists, loading, error }
}
