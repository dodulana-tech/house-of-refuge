import React, { useState, createContext, useContext, useCallback } from 'react'
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
import Dashboard from './pages/portal/Dashboard'
import Checkin from './pages/portal/Checkin'
import Treatment from './pages/portal/Treatment'
import Meals from './pages/portal/Meals'
import Payments from './pages/portal/Payments'
import FamilyDashboard from './pages/family/FamilyDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'

// ── Contexts ──────────────────────────────────────────────
export const NotifContext = createContext(null)
export const ModalContext = createContext(null)

export function useNotif() { return useContext(NotifContext) }
export function useModal() { return useContext(ModalContext) }

// ── Protected Route ───────────────────────────────────────
function Protected({ children, roles }) {
  const { user } = useAuth()
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
      <Route path="/donate" element={<Donate />} />
      <Route path="/sponsor" element={<Sponsor />} />
      <Route path="/apply" element={<Waitlist />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />

      {/* Patient Portal */}
      <Route path="/portal" element={<Protected roles={['patient']}><Dashboard /></Protected>} />
      <Route path="/portal/checkin" element={<Protected roles={['patient']}><Checkin /></Protected>} />
      <Route path="/portal/treatment" element={<Protected roles={['patient']}><Treatment /></Protected>} />
      <Route path="/portal/meals" element={<Protected roles={['patient']}><Meals /></Protected>} />
      <Route path="/portal/payments" element={<Protected roles={['patient']}><Payments /></Protected>} />

      {/* Family Portal */}
      <Route path="/family" element={<Protected roles={['family']}><FamilyDashboard /></Protected>} />

      {/* Admin / Staff */}
      <Route path="/admin" element={<Protected roles={['staff', 'admin']}><AdminDashboard /></Protected>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
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
            <AppRoutes />
          </main>
          <Footer />
          <Notification notif={notif} />
          <SponsorModal />
        </ModalContext.Provider>
      </NotifContext.Provider>
    </AuthProvider>
  )
}
