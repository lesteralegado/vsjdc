import AppRoutes from './routes/AppRoutes'
import { demoEnabled } from './lib/demo'

export default function App() {
  return <>{demoEnabled && <aside className="border-b border-[#ef9eb8] bg-[#fff0f5] px-5 py-3 text-center text-sm text-[#922348]"><strong>Development demo</strong> · DEMO profiles, patients and scheduling values are fictional. Use fictional patient details. Test appointments are stored in development only. <a href="/staff/dashboard" className="underline">Explore staff dashboard</a></aside>}<AppRoutes /></>
}
