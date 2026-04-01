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
import SponsorItem from './pages/SponsorItem'
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
const DMAR = lazy(() => import('./pages/dashboard/MedicationMAR'))
const DPatientDetail = lazy(() => import('./pages/dashboard/PatientDetail'))
const DClinicalNotes = lazy(() => import('./pages/dashboard/ClinicalNotes'))
const DAdmissionDetail = lazy(() => import('./pages/dashboard/AdmissionDetail'))
const DConsentManager = lazy(() => import('./pages/dashboard/ConsentManager'))
const DDischargeTracker = lazy(() => import('./pages/dashboard/DischargeTracker'))
const DPassManagement = lazy(() => import('./pages/dashboard/PassManagement'))
const DVisitationBooking = lazy(() => import('./pages/dashboard/VisitationBooking'))
const DDailySchedule = lazy(() => import('./pages/dashboard/DailySchedule'))
const DSpiritualFormation = lazy(() => import('./pages/dashboard/SpiritualFormation'))
const DLifeSkillsTracker = lazy(() => import('./pages/dashboard/LifeSkillsTracker'))
const DShiftScheduler = lazy(() => import('./pages/dashboard/ShiftScheduler'))
const DTrainingTracker = lazy(() => import('./pages/dashboard/TrainingTracker'))
const DDonorCRM = lazy(() => import('./pages/dashboard/DonorCRM'))
const DOutcomeTracking = lazy(() => import('./pages/dashboard/OutcomeTracking'))
const DAlumniCRM = lazy(() => import('./pages/dashboard/AlumniCRM'))
const DSafeguarding = lazy(() => import('./pages/dashboard/SafeguardingDashboard'))
const DInventory = lazy(() => import('./pages/dashboard/InventoryManagement'))
const DTreatmentPlanBuilder = lazy(() => import('./pages/dashboard/TreatmentPlanBuilder'))
const DMDTReviews = lazy(() => import('./pages/dashboard/MDTReviews'))
const DEquipmentSponsorship = lazy(() => import('./pages/dashboard/EquipmentSponsorship'))
const DBoardReports = lazy(() => import('./pages/dashboard/BoardReports'))
const DPatientRights = lazy(() => import('./pages/dashboard/PatientRights'))
const DFamilyVisitRequests = lazy(() => import('./pages/dashboard/FamilyVisitRequests'))
const DFamilyResources = lazy(() => import('./pages/dashboard/FamilyResources'))
const DPatientSchedule = lazy(() => import('./pages/dashboard/PatientSchedule'))
const DAlumniDetail = lazy(() => import('./pages/dashboard/AlumniDetail'))
const DBehavioralDetail = lazy(() => import('./pages/dashboard/BehavioralDetail'))
const DDonorDetail = lazy(() => import('./pages/dashboard/DonorDetail'))
const DStaffDetail = lazy(() => import('./pages/dashboard/StaffDetail'))

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
      <Route path="/sponsor/:id" element={<SponsorItem />} />
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
        <Route path="patients/:id" element={<DPatientDetail />} />
        <Route path="caseload" element={<DPatients />} />
        <Route path="treatment-plans" element={<DTreatmentPlanBuilder />} />
        <Route path="medication" element={<DMAR />} />
        <Route path="mdt" element={<DMDTReviews />} />
        <Route path="clinical-notes" element={<DClinicalNotes />} />

        {/* Pillar 2: Admissions & Discharge */}
        <Route path="admissions" element={<DAdmissions />} />
        <Route path="admissions/:id" element={<DAdmissionDetail />} />
        <Route path="consents" element={<DConsentManager />} />
        <Route path="discharge" element={<DDischargeTracker />} />

        {/* Pillar 3: Residential Operations */}
        <Route path="beds" element={<DBeds />} />
        <Route path="schedule" element={<DDailySchedule />} />
        <Route path="behavioral" element={<DBehavioral />} />
        <Route path="behavioral/:id" element={<DBehavioralDetail />} />
        <Route path="passes" element={<DPassManagement />} />
        <Route path="visitation" element={<DVisitationBooking />} />

        {/* Pillar 4: Spiritual & Programme */}
        <Route path="spiritual" element={<DSpiritualFormation />} />
        <Route path="life-skills" element={<DLifeSkillsTracker />} />

        {/* Pillar 5: People & HR */}
        <Route path="staff" element={<DStaff />} />
        <Route path="staff/:id" element={<DStaffDetail />} />
        <Route path="shifts" element={<DShiftScheduler />} />
        <Route path="training" element={<DTrainingTracker />} />

        {/* Pillar 6: Finance & Revenue */}
        <Route path="finance" element={<DFinance />} />
        <Route path="payments" element={<Payments />} />
        <Route path="donors" element={<DDonorCRM />} />
        <Route path="donors/:id" element={<DDonorDetail />} />
        <Route path="inventory" element={<DInventory />} />
        <Route path="sponsorship" element={<DEquipmentSponsorship />} />

        {/* Pillar 7: M&E & Compliance */}
        <Route path="outcomes" element={<DOutcomeTracking />} />
        <Route path="alumni" element={<DAlumniCRM />} />
        <Route path="alumni/:id" element={<DAlumniDetail />} />
        <Route path="safeguarding" element={<DSafeguarding />} />
        <Route path="reports" element={<DBoardReports />} />

        {/* Patient-specific routes */}
        <Route path="checkin" element={<Checkin />} />
        <Route path="treatment" element={<Treatment />} />
        <Route path="meals" element={<Meals />} />
        <Route path="my-schedule" element={<DPatientSchedule />} />
        <Route path="my-spiritual" element={<DOverview />} />
        <Route path="my-skills" element={<DOverview />} />
        <Route path="my-payments" element={<Payments />} />
        <Route path="my-rights" element={<DPatientRights />} />

        {/* Family-specific routes */}
        <Route path="visits" element={<DFamilyVisitRequests />} />
        <Route path="milestones" element={<DOverview />} />
        <Route path="resources" element={<DFamilyResources />} />
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
