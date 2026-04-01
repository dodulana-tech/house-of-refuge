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

// Unified HMIS dashboard — 7 pillars
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'))
const DOverview = lazy(() => import('./pages/dashboard/Overview'))
const DPatients = lazy(() => import('./pages/dashboard/Patients'))
const DAdmissions = lazy(() => import('./pages/dashboard/Admissions'))
const DBeds = lazy(() => import('./pages/dashboard/BedManagement'))
const DBehavioral = lazy(() => import('./pages/dashboard/BehavioralManagement'))
const DFinance = lazy(() => import('./pages/dashboard/Finance'))
const DStaff = lazy(() => import('./pages/dashboard/StaffDirectory'))
const DComingSoon = lazy(() => import('./pages/dashboard/ComingSoon'))

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

function AppShell() {
  const { pathname } = useLocation()
  const isDashboard = pathname.startsWith('/dashboard')
  return (
    <>
      {!isDashboard && <Nav />}
      <main>
        <Suspense fallback={<div style={{ padding: '120px 24px', textAlign: 'center' }}><span className="spin" /></div>}>
          <AppRoutes />
        </Suspense>
      </main>
      {!isDashboard && <Footer />}
    </>
  )
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

      {/* Legacy routes — redirect to unified dashboard */}
      <Route path="/portal/*" element={<Navigate to="/dashboard" replace />} />
      <Route path="/family/*" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />

      {/* ── Unified Dashboard (HMIS) ── */}
      <Route path="/dashboard" element={<Protected roles={['patient', 'family', 'staff', 'admin']}><DashboardLayout /></Protected>}>
        <Route index element={<DOverview />} />

        {/* Pillar 1: Clinical Operations */}
        <Route path="patients" element={<DPatients />} />
        <Route path="caseload" element={<DPatients />} />
        <Route path="treatment-plans" element={<DComingSoon title="Treatment Plans" description="Columbia Model treatment plan management" features={['Individual treatment plan per patient', 'Goal tracking with progress indicators', 'MDT review scheduling (Week 4, Week 8, pre-discharge)', 'PRPP development and documentation', 'Treatment plan co-authorship with patient']} />} />
        <Route path="medication" element={<DComingSoon title="Medication Administration" description="MAR — Medication Administration Record" features={['Medication inventory and stock management', 'Prescription tracking per patient', 'CIWA-Ar (alcohol) and COWS (opioid) withdrawal monitoring', 'Nursing round documentation (6 AM, 12 PM, 6 PM, 10:30 PM)', 'Controlled substance tracking — no opioids policy']} />} />
        <Route path="mdt" element={<DComingSoon title="MDT Case Reviews" description="Multi-Disciplinary Team governance" features={['Weekly MDT meeting scheduling and minutes', 'Treatment plan review tracking (Week 4, 8, pre-discharge)', 'Care plan decisions and action items', 'Attendance tracking per discipline', 'Emergency MDT for critical incidents']} />} />
        <Route path="clinical-notes" element={<DComingSoon title="Clinical Notes" description="HIPAA-compliant clinical documentation" features={['Individual session notes (CBT, MI)', 'Group therapy attendance and notes', 'Nursing shift notes', 'Chaplain pastoral notes', 'Progress notes with timestamps and author audit trail']} />} />

        {/* Pillar 2: Admissions & Discharge */}
        <Route path="admissions" element={<DAdmissions />} />
        <Route path="consents" element={<DComingSoon title="Consent Management" description="Digital consent form tracking" features={['Admission Agreement', 'Detoxification Consent', 'Confidentiality Agreement', 'Family Confidentiality Agreement (Pathway A)', 'Belongings Receipt', 'Financial Agreement', 'Rights & Responsibilities Charter']} />} />
        <Route path="discharge" element={<DComingSoon title="Discharge & Graduation" description="4 discharge types, 6 graduation criteria tracking" features={['Planned Graduation — 6 criteria checklist', 'Administrative Discharge — behavioral protocol', 'Clinical Referral — psychiatric/medical transfer', 'Self-Discharge (AMA) — harm reduction + safety plan', 'Re-admission processing (30-day gap rule)', 'Graduation ceremony management']} />} />

        {/* Pillar 3: Residential Operations */}
        <Route path="beds" element={<DBeds />} />
        <Route path="schedule" element={<DComingSoon title="Daily Schedule" description="5:30 AM – 11:00 PM operational schedule compliance" features={['Daily schedule template per SOP', 'Attendance tracking per session', 'Schedule deviations requiring Program Director approval', 'Modified schedule for Weeks 1–2 (Detox Phase)', 'Sunday modified schedule (Chapel 9–11:30 AM, family visits PM)']} />} />
        <Route path="behavioral" element={<DBehavioral />} />
        <Route path="passes" element={<DComingSoon title="Passes & Leave" description="Pass management per SOP Section 5.4" features={['3-Hour Pass (family, 1 month min residency)', '24-Hour Pass (conduct-based, Program Director approval)', '48-Hour Weekend Pass (clean drug screen required)', 'Emergency Pass (family death/hospitalization)', 'Post-pass assessment on return', 'Automatic discipline if return under influence']} />} />
        <Route path="visitation" element={<DComingSoon title="Visitation Management" description="Sunday 12:00–6:00 PM per SOP Section 5.4.2" features={['Visit request and approval workflow', 'Visitor registration and designated area management', 'Children safeguarding (never alone with resident)', 'Friend visits require Program Officer approval', 'Contraband check protocols', 'Max 6 hours, once per week']} />} />

        {/* Pillar 4: Spiritual & Programme */}
        <Route path="spiritual" element={<DComingSoon title="Spiritual Formation" description="Christ-centered spiritual development tracking" features={['Daily devotion attendance (Morning Prayer, Evening Chapel)', 'Bible School progress (Mon–Fri, 2hrs)', 'Sunday Chapel attendance and participation', 'Spiritual formation assessment for graduation', 'Chaplain pastoral notes', 'Church placement planning for discharge']} />} />
        <Route path="life-skills" element={<DComingSoon title="Life Skills & Vocational" description="13 Life Skills Group modules per SOP Chapter 7" features={['Morning Community Meeting (daily)', 'Care Planning Group (Thursday)', 'CBT & Relapse Prevention (3x/week)', 'Psychoeducation (2x/week)', 'Relaxation & Stress Management (Friday)', 'Vocational assessment and training', 'Cooking, Nutrition, Creative Writing, Current Affairs']} />} />

        {/* Pillar 5: People & HR */}
        <Route path="staff" element={<DStaff />} />
        <Route path="shifts" element={<DComingSoon title="Shift Scheduling" description="24/7 coverage management" features={['3 rotating nursing shifts', 'House Master on-site coverage', 'Security shift management', 'Shift handover documentation', 'On-call clinical escalation pathway', 'Leave and absence tracking']} />} />
        <Route path="training" element={<DComingSoon title="Training & CPD" description="Mandatory training and certification tracking" features={['Safeguarding training (30 days from hire)', 'Trauma-informed care certification', 'De-escalation and crisis management', 'First Aid and CPR', 'Professional license renewal tracking', 'Individual Development Plans (IDPs)']} />} />

        {/* Pillar 6: Finance & Revenue */}
        <Route path="finance" element={<DFinance />} />
        <Route path="payments" element={<Payments />} />
        <Route path="donors" element={<DComingSoon title="Donor CRM" description="Individual and corporate donor management" features={['Donor profiles and giving history', 'Recurring donation tracking', 'Corporate sponsorship pipeline', 'Grant application tracking', 'Tax receipt generation', 'Donor communication log']} />} />
        <Route path="sponsorship" element={<DComingSoon title="Equipment Sponsorship" description="32-item sponsorship tracking" features={['Item sponsorship status and progress', 'Sponsor recognition and receipts', 'Delivery and installation tracking', 'Budget vs actual for equipment drive', 'Public sponsorship page integration']} />} />

        {/* Pillar 7: M&E & Compliance */}
        <Route path="outcomes" element={<DComingSoon title="Outcome Tracking" description="Programme M&E per SOP Chapter 8.5" features={['Graduation rate tracking', 'Relapse rate monitoring', 'Employment rate post-discharge', 'Church attendance rates', 'Family reunification rates', 'Quarterly board reports']} />} />
        <Route path="alumni" element={<DComingSoon title="Alumni Programme" description="24-month post-discharge monitoring" features={['Year 1: weekly→bi-weekly→monthly contact', 'Year 2: monthly contact, bi-monthly visits', 'Home/workplace visitation at 3, 6, 12 months', 'Alumni support groups and mentorship', 'Relapse response and re-admission pathway', 'Case closure at 24 months']} />} />
        <Route path="safeguarding" element={<DComingSoon title="Safeguarding" description="Zero-tolerance protection framework" features={['Incident reporting and investigation', 'Staff safeguarding training compliance', 'Professional boundary monitoring', 'Whistleblowing protection', 'Designated Safeguarding Lead dashboard', 'Board safeguarding committee reports']} />} />
        <Route path="reports" element={<DComingSoon title="Board Reports" description="Governance and compliance reporting" features={['Monthly progress reports', 'Quarterly M&E reports', 'Financial stewardship reports', 'Safeguarding compliance reports', 'Operational readiness tracking', 'Regulatory compliance (NDLEA, MOH)']} />} />

        {/* Patient-specific routes */}
        <Route path="checkin" element={<Checkin />} />
        <Route path="treatment" element={<Treatment />} />
        <Route path="meals" element={<Meals />} />
        <Route path="my-schedule" element={<DOverview />} />
        <Route path="my-spiritual" element={<DOverview />} />
        <Route path="my-skills" element={<DOverview />} />
        <Route path="my-payments" element={<Payments />} />
        <Route path="my-rights" element={<DComingSoon title="Your Rights" description="HOR Resident Rights Charter" features={['Right to dignity, respect, and compassion', 'Right to an individualized treatment plan', 'Right to confidentiality of personal/medical information', 'Right to know rules, expectations, and consequences', 'Right to submit a grievance or complaint', 'Right to make your own decisions including to leave', 'Right to contact emergency family member at any time']} />} />

        {/* Family-specific routes */}
        <Route path="visits" element={<DComingSoon title="Visit Requests" description="Sunday visitation scheduling" features={['Request a visit (Sunday 12–6 PM)', 'View request status', 'Visitor guidelines and rules', 'Previous visit history']} />} />
        <Route path="milestones" element={<DOverview />} />
        <Route path="resources" element={<DComingSoon title="Family Resources" description="Support for families of residents" features={['Understanding Addiction as a Family', 'Setting Healthy Boundaries', 'Preparing for Re-entry', 'Family Therapy — What to Expect', 'Self-Care for Families', 'Support Groups (Al-Anon, Nar-Anon)']} />} />
        <Route path="family-therapy" element={<DOverview />} />
        <Route path="family-payments" element={<Payments />} />
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
          <AppShell />
          <Notification notif={notif} />
          <SponsorModal />
        </ModalContext.Provider>
      </NotifContext.Provider>
    </AuthProvider>
  )
}
