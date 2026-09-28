import { Component, type ReactNode } from 'react'

export default class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="container-clinic py-16"><div className="card mx-auto max-w-lg space-y-5 p-7" role="alert">
      <h1 className="text-2xl font-semibold">This page could not load</h1>
      <p className="muted text-sm leading-7">Please reload the page. If you were submitting an appointment, check your previous request or track it before booking again.</p>
      <div className="flex flex-wrap gap-3"><button className="btn btn-primary" onClick={() => location.reload()}>Reload page</button><a className="btn btn-secondary" href="/appointments">Appointments</a></div>
      <a className="inline-block text-sm underline" href="/#locations">Contact the clinic</a>
    </div></main>
  }
}
