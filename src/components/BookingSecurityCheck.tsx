import { useEffect, useRef, useState } from 'react'

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}
declare global { interface Window { turnstile?: Turnstile } }

let loading: Promise<Turnstile> | undefined
function loadWidget() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!loading) loading = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    const fail = () => { clearTimeout(timer); script.remove(); loading = undefined; reject(new Error('Security check unavailable')) }
    const timer = setTimeout(fail, 15000)
    script.onerror = fail
    script.onload = () => { clearTimeout(timer); if (window.turnstile) resolve(window.turnstile); else fail() }
    document.head.appendChild(script)
  })
  return loading
}

export default function BookingSecurityCheck({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState('Loading security check…')
  const [attempt, setAttempt] = useState(0)
  const [compact, setCompact] = useState(true)
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY
  useEffect(() => {
    const element = container.current
    if (!element) return
    const observer = new ResizeObserver(() => setCompact(element.clientWidth < 300))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    let active = true
    let widget: string | undefined
    onToken('')
    if (!sitekey) return
    loadWidget().then(api => {
      if (!active || !container.current) return
      widget = api.render(container.current, {
        sitekey, action: 'booking', size: compact ? 'compact' : 'flexible', theme: 'light',
        callback: (token: string) => { if (active) { onToken(token); setMessage('Security check complete.') } },
        'expired-callback': () => { if (active) { onToken(''); setMessage('Security check expired. Please complete it again.') } },
        'error-callback': () => { if (active) { onToken(''); setMessage('Security check could not load. Retry or contact the clinic.') } },
      })
    }).catch(() => { if (active) setMessage('Security check could not load. Retry or contact the clinic.') })
    return () => { active = false; if (widget !== undefined) window.turnstile?.remove(widget); onToken('') }
  }, [onToken, sitekey, attempt, compact])
  return <section aria-label="Booking security check" className="space-y-3">
    <div ref={container} className="w-full min-w-0" />
    <p role="status" className="muted text-sm">{sitekey ? message : 'Online booking security is being configured. Please contact the clinic to book.'}</p>
    {sitekey && <button type="button" className="text-sm underline" onClick={() => { setMessage('Loading security check…'); setAttempt(value => value + 1) }}>Restart security check</button>}
  </section>
}
