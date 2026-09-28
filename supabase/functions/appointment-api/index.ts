import { verifyBookingToken } from './turnstile.ts'

// The publishable key identifies this public application;
// reference+mobile authorize tracking. It is not a staff-authentication mechanism.
const projectUrl = Deno.env.get('SUPABASE_URL')
const development = projectUrl === 'https://sqqwjiuskzgwxvxukmxi.supabase.co'
const publicKey = Deno.env.get('APPOINTMENT_PUBLIC_KEY') ?? (development ? 'sb_publishable_bZc5siT4rBJvLqT2Xi0HUQ_jRzoAaOD' : '')
const originList = Deno.env.get('APPOINTMENT_ALLOWED_ORIGINS') ?? (development ? 'http://127.0.0.1:5173,http://localhost:5173' : '')
const origins = new Set(originList.split(',').map(value => value.trim()).filter(Boolean))
const configured = publicKey.startsWith('sb_publishable_') && origins.size > 0 && [...origins].every(value => {
  try {
    const url = new URL(value)
    return url.origin === value && (url.protocol === 'https:' || (development && ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(value)))
  } catch { return false }
})

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'apikey, content-type, authorization, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (origin && origins.has(origin)) headers['Access-Control-Allow-Origin'] = origin
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers })
  if (!configured) return reply(503, { error: 'Appointment service is not configured' })
  if (origin && !origins.has(origin)) return reply(403, { error: 'Origin not allowed' })
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return reply(405, { error: 'Use POST' })
  // Explicit application-key validation replaces the platform JWT check because
  // patients do not have Auth accounts and publishable keys are not JWTs.
  if (request.headers.get('apikey') !== publicKey) return reply(401, { error: 'Invalid application key' })
  if (!request.headers.get('content-type')?.includes('application/json')) return reply(415, { error: 'Use JSON' })
  const reader = request.body?.getReader()
  if (!reader) return reply(400, { error: 'Request body required' })
  try {
    let bytes = 0
    const parts: Uint8Array[] = []
    while (true) {
      const next = await reader.read()
      if (next.done) break
      bytes += next.value.byteLength
      if (bytes > 8192) { await reader.cancel(); return reply(413, { error: 'Request too large' }) }
      parts.push(next.value)
    }
    const buffer = new Uint8Array(bytes)
    let offset = 0
    for (const part of parts) { buffer.set(part, offset); offset += part.length }
    const input = JSON.parse(new TextDecoder().decode(buffer))
    if (!input || !['availability', 'book', 'track'].includes(input.action) || !input.data || Array.isArray(input.data) || typeof input.data !== 'object') return reply(400, { error: 'Invalid request' })
    const url = Deno.env.get('SUPABASE_URL')
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !secret) return reply(503, { error: 'Appointment service is not configured' })
    if (input.action === 'book') {
      const status = await verifyBookingToken(input.verificationToken, Deno.env.get('TURNSTILE_SECRET_KEY'), new Set([...origins].map(value => new URL(value).hostname)))
      if (status !== 200) return reply(status, { error: status === 403 ? 'Please complete the security check again.' : 'Security verification is unavailable. Please retry or contact the clinic.' })
    }
    const response = await fetch(`${url}/rest/v1/rpc/booking_gateway`, {
      method: 'POST', headers: { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_action: input.action, p_data: input.data }), signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return reply(503, { error: 'Appointment service unavailable. Please retry.' })
    const result = await response.json()
    if (!result.ok) {
      if (result.status === 429) headers['Retry-After'] = '900'
      return reply(result.status ?? 422, { error: result.error })
    }
    return reply(200, { data: result.data })
  } catch (error) {
    return reply(error instanceof SyntaxError ? 400 : 503, { error: 'Request could not be completed. Please retry.' })
  } finally { reader.releaseLock() }
})
