export const branches = [
  {
    id: 'cabuyao', name: 'Cabuyao Clinic', shortName: 'Cabuyao',
    address: '74GF+VC5, JP Rizal St, Cabuyao City, Laguna',
    hours: '9:00 AM – 6:00 PM',
    phones: [{ label: '(0935) 156-0822', href: 'tel:+639351560822' }],
    maps: 'https://www.google.com/maps/place/V.+San+Juan+Dental+Clinic/@14.2771174,121.1230019,19z/data=!3m1!4b1!4m6!3m5!1s0x3397d9dd61cad78b:0x775f7b9e86929a5c!8m2!3d14.2771161!4d121.1236456!16s%2Fg%2F11fl8mkpq_?entry=ttu&g_ep=EgoyMDI2MDkwOS4wIKXMDSoASAFQAw%3D%3D',
  },
  {
    id: 'santa-rosa', name: 'Santa Rosa Clinic', shortName: 'Santa Rosa',
    address: 'Brgy, Santa Rosa - Tagaytay Rd, Pulong Santa Cruz, City of Santa Rosa, 4026 Laguna',
    hours: '9:00 AM – 8:00 PM',
    phones: [{ label: '(0917) 178-2076', href: 'tel:+639171782076' }, { label: '(049) 503 9194', href: 'tel:+63495039194' }],
    maps: 'https://www.google.com/maps/search/?api=1&query=V.%20San%20Juan%20Dental%20Clinic%2C%20Santa%20Rosa%20-%20Tagaytay%20Rd%2C%20Pulong%20Santa%20Cruz%2C%20Santa%20Rosa%2C%20Laguna',
  },
] as const

// Clinic-supplied service catalogue; replace through the data adapter when connected.
export const serviceNames = ['Gingivectomy', 'Diastema Closure', 'Bite Plane', 'Crown Repair', 'Teeth Whitening', 'Laminate Veneers', 'ODONTECTOMY', 'ORTHODONTICS', 'CROWNS', 'Composite Veneers', 'Removable Denture', 'Pulpotomy', 'Oral Prophylaxis', 'Tooth Restoration', 'Retainers']
export const contacts = [
  { label: 'Email', title: 'vsanjuandentalclinic@yahoo.com', description: 'Send an email to the clinic', href: 'mailto:vsanjuandentalclinic@yahoo.com' },
  { label: 'Facebook', title: 'V. San Juan Dental Clinic', description: 'facebook.com/Vsanjuandentalclinic', href: 'https://www.facebook.com/Vsanjuandentalclinic' },
  { label: 'Instagram', title: '@vsanjuandentalclinic', description: 'Follow clinic updates and announcements', href: 'https://www.instagram.com/vsanjuandentalclinic/' },
]
