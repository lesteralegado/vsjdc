// Tokens are short-lived, single-use and never part of the persisted booking payload.
export async function verifyBookingToken(token: unknown, secret: string | undefined, hostnames: Set<string>, fetcher: typeof fetch = fetch): Promise<200 | 403 | 503> {
  if (!secret || hostnames.size === 0) return 503
  if (typeof token !== 'string' || !token.trim() || token.length > 2048) return 403
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }), signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return 503
    const result = await response.json()
    return result?.success === true && result.action === 'booking' && hostnames.has(result.hostname) ? 200 : 403
  } catch { return 503 }
}
