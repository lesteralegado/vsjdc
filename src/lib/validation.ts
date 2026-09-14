// HTML patterns use Unicode-set syntax, which requires escaped punctuation.
export const mobilePattern = String.raw`[+0-9\s\(\)\-]{10,20}`
export const normalizeMobile = (value: string) => value.replace(/[\s()-]/g, '')
export const isValidMobile = (value: string) => /^(?:\+?63|0)9\d{9}$/.test(normalizeMobile(value))
