export type BookingAttempt = { id: string; fingerprint: string }
const key = 'vsjdc:booking-attempt:v1'

export function readAttempt(storage: Pick<Storage, 'getItem'>): BookingAttempt | null {
  const raw = storage.getItem(key)
  if (!raw) return null
  const value = JSON.parse(raw)
  if (!/^[0-9a-f-]{36}$/i.test(value?.id ?? '') || !/^[0-9a-f]{64}$/.test(value?.fingerprint ?? '')) {
    throw new Error('The previous request could not be recovered. Contact the clinic before booking again.')
  }
  return { id: value.id, fingerprint: value.fingerprint }
}

export async function prepareAttempt(storage: Pick<Storage, 'getItem' | 'setItem'>, payload: unknown) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)))
  const fingerprint = [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('')
  const existing = readAttempt(storage)
  if (existing && existing.fingerprint !== fingerprint) {
    throw new Error('A previous request has an uncertain result. Recover it above, or retry with exactly the original details before making a different booking.')
  }
  const attempt = existing ?? { id: crypto.randomUUID(), fingerprint }
  // Write before sending. Do not submit if browser storage is unavailable.
  storage.setItem(key, JSON.stringify(attempt))
  return { ...attempt, fresh: !existing }
}

export function clearAttempt(storage: Pick<Storage, 'removeItem'>) {
  storage.removeItem(key)
}
