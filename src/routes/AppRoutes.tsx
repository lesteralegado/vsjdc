import PublicLayout from '../layouts/PublicLayout'
import HomePage from '../pages/HomePage'
import AppointmentsPage from '../pages/AppointmentsPage'
import BookAppointmentsPage from '../pages/BookAppointmentsPage'
import TrackAppointmentPage from '../pages/TrackAppointmentPage'
import StaffLoginPage from '../pages/StaffLoginPage'
import StaffDashboardPage from '../pages/StaffDashboardPage'

// Native links retain browser history, refresh, and deep links without a routing dependency.
export default function AppRoutes() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/staff/dashboard') return <StaffDashboardPage />
  const pages = {
    '/': <HomePage />,
    '/appointments': <AppointmentsPage />,
    '/appointments/book': <BookAppointmentsPage />,
    '/book-appointment': <BookAppointmentsPage />,
    '/appointments/track': <TrackAppointmentPage />,
    '/track-appointment': <TrackAppointmentPage />,
    '/staff/login': <StaffLoginPage />,
    '/staff-login': <StaffLoginPage />,
  }
  const page = pages[path as keyof typeof pages]
  return <PublicLayout>{page || <div className="container-clinic py-20 text-center"><span className="badge badge-pink">404</span><h1 className="mt-5 text-3xl font-bold">This page isn’t here</h1><p className="muted mt-4">Let’s help you find your way back.</p><a href="/" className="btn btn-primary mt-7">Back to home</a></div>}</PublicLayout>
}
