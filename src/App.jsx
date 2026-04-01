import React, { useState, createContext, useContext, useCallback, Suspense, lazy } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Notification from './components/Notification'
import SponsorModal from './components/SponsorModal'
import Home from './pages/Home'
import About from './pages/About'
import Donate from './pages/Donate'
import Sponsor from './pages/Sponsor'
import Waitlist from './pages/Waitlist'
import Contact from './pages/Contact'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

// Lazy load portal/admin/family pages (legacy routes — redirect to /dashboard)
const Dashboard = lazy(() => import('./pages/portal/Dashboard'))
const Checkin = lazy(() => import('./pages/portal/Checkin'))
const Treatment = lazy(() => import('./pages/portal/Treatment'))
const Meals = lazy(() => import('./pages/portal/Meals'))
const Payments = lazy(() => import('./pages/portal/Payments'))
const FamilyDashboard = lazy(() => import('./pages/family/FamilyDashboard'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))

// New unified dashboard
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'))
const DOverview = lazy(() => import('./pages/dashboard/Overview'))
const DPatients = lazy(() => import('./pages/dashboard/Patients'))
const DAdmissions = lazy(() => import('./pages/dashboard/Admissions'))

// ── Contexts ──────────────────────────────────────────────
export const NotifContext = createContext(null)
export const ModalContext = createContext(null)

export function useNotif() { return useContext(NotifContext) }
export function useModal() { return useContext(ModalContext) }

// ── Protected Route ───────────────────────────────────────
function Protected({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: '120px 24px', textAlign: 'center' }}><span className="spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

// ── Scroll to top on route change ─────────────────────────
function ScrollTop() {
  const { pathname } = useLocation()
  React.useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/dashboardonate" element={<Donate />} />
      <Route path="/sponsor" element={<Sponsor />} />
      <Route path="/apply" element={<Waitlist />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />

      {/* Legacy routes — redirect to unified dashboard */}
      <Route path="/portal/*" element={<Navigate to="/dashboard" replace />} />
      <Route path="/family/*" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />

      {/* ── Unified Dashboard (HMIS) ── */}
      <Route path="/dashboard" element={<Protected roles={['patient', 'family', 'staff', 'admin']}><DashboardLayout /></Protected>}>
        <Route index element={<DOverview />} />
        <Route path="admissions" element={<DAdmissions />} />
        <Route path="patients" element={<DPatients />} />
        <Route path="caseload" element={<DPatients />} />
        <Route path="checkin" element={<Checkin />} />
        <Route path="treatment" element={<Treatment />} />
        <Route path="meals" element={<Meals />} />
        <Route path="payments" element={<Payments />} />
        <Route path="visits" element={<FamilyDashboard />} />
        <Route path="schedule" element={<DOverview />} />
        <Route path="mdt" element={<DOverview />} />
        <Route path="incidents" element={<DOverview />} />
        <Route path="notes" element={<DOverview />} />
        <Route path="staff" element={<DOverview />} />
        <Route path="finance" element={<DOverview />} />
        <Route path="reports" element={<DOverview />} />
        <Route path="resources" element={<DOverview />} />
        <Route path="settings" element={<DOverview />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  const [notif, setNotif] = useState({ show: false, title: '', msg: '', type: '' })
  const [modal, setModal] = useState({ open: false, item: null })

  const showNotif = useCallback((title, msg, type = '') => {
    setNotif({ show: true, title, msg, type })
    setTimeout(() => setNotif(n => ({ ...n, show: false })), 5500)
  }, [])

  const openModal = useCallback((item) => setModal({ open: true, item }), [])
  const closeModal = useCallback(() => setModal({ open: false, item: null }), [])

  return (
    <AuthProvider>
      <NotifContext.Provider value={showNotif}>
        <ModalContext.Provider value={{ openModal, closeModal, modal }}>
          <ScrollTop />
          <Nav />
          <main>
            <Suspense fallback={<div style={{ padding: '120px 24px', textAlign: 'center' }}><span className="spin" /></div>}>
              <AppRoutes />
            </Suspense>
          </main>
          <Footer />
          <Notification notif={notif} />
          <SponsorModal />
        </ModalContext.Provider>
      </NotifContext.Provider>
    </AuthProvider>
  )
}
