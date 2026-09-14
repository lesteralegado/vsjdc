import type { ReactNode } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <><a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-4">Skip to content</a><Navbar /><main id="main-content" className="min-h-[65vh]">{children}</main><Footer /></>
}
