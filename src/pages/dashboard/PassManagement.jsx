import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Pass Management — SOP Section 5.4
  4 pass types with eligibility rules, approval workflow, and post-return assessment.
  HIPAA: initials only.
*/

const PATIENTS = [
  { initials: 'CO', id: 'P001', day: 23, phase: 'foundation', onDiscipline: false },
  { initials: 'AN', id: 'P002', day: 45, phase: 'deepening', onDiscipline: false },
  { initials: 'KA', id: 'P003', day: 74, phase: 'reintegration', onDiscipline: false },
  { initials: 'IM', id: 'P004', day: 8, phase: 'stabilization', onDiscipline: false },
]

const PASS_TYPES = [
  { value: '3hr', label: '3-Hour Pass', desc: 'Family only, 1 month min residency, not on discipline', minDays: 30, requiresCleanScreen: false },
  { value: '24hr', label: '24-Hour Pass', desc: 'Conduct-based, Program Director approval required', minDays: 30, requiresCleanScreen: false },
  { value: '48hr', label: '48-Hour Weekend', desc: 'Fri 10 PM – Sun 6 PM, clean drug screen required', minDays: 45, requiresCleanScreen: true },
  { value: 'emergency', label: 'Emergency Pass', desc: 'Family death or hospitalization only', minDays: 0, requiresCleanScreen: false },
]

const INITIAL_PASSES = [
  { id: 1, patient: 'KA', type: '48hr', status: 'active', startDate: '2026-03-27', endDate: '2026-03-29', guardian: 'M. Kamara', reason: 'Weekend family visit', returnedOnTime: null, substanceClear: null, notes: '' },
  { id: 2, patient: 'AN', type: '3hr', status: 'pending', startDate: '2026-04-05', endDate: '2026-04-05', guardian: 'F. Annan', reason: 'Family birthday gathering', returnedOnTime: null, substanceClear: null, notes: '' },
  { id: 3, patient: 'CO', type: '3hr', status: 'completed', startDate: '2026-03-15', endDate: '2026-03-15', guardian: 'B. Cole', reason: 'Family visit', returnedOnTime: true, substanceClear: true, notes: 'Returned in good spirits.' },
  { id: 4, patient: 'KA', type: '24hr', status: 'completed', startDate: '2026-03-08', endDate: '2026-03-09', guardian: 'M. Kamara', reason: 'Church event', returnedOnTime: true, substanceClear: true, notes: '' },
  { id: 5, patient: 'AN', type: 'emergency', status: 'completed', startDate: '2026-02-20', endDate: '2026-02-21', guardian: 'F. Annan', reason: 'Grandmother hospitalized', returnedOnTime: true, substanceClear: true, notes: 'Patient was emotionally affected. Follow-up session scheduled.' },
]

const statusColors = { active: '#1A7A4A', pending: '#DD6B20', completed: 'var(--g500)', denied: '#E53E3E' }
const typeColors = { '3hr': '#3182CE', '24hr': '#805AD5', '48hr': '#D69E2E', emergency: '#E53E3E' }

export default function PassManagement() {
  const { user } = useAuth()
  const [passes, setPasses] = useState(INITIAL_PASSES)
  const [tab, setTab] = useState('active')
  const [showForm, setShowForm] = useState(false)
  const [returnModal, setReturnModal] = useState(null)

  // New request form state
  const [form, setForm] = useState({ patient: '', type: '', startDate: '', endDate: '', guardian: '', reason: '' })

  // Post-return state
  const [returnData, setReturnData] = useState({ returnedOnTime: false, substanceClear: false, notes: '' })

  const activePasses = passes.filter(p => p.status === 'active')
  const pendingPasses = passes.filter(p => p.status === 'pending')
  const historyPasses = passes.filter(p => p.status === 'completed' || p.status === 'denied')

  const getEligibility = (patientInitials, passType) => {
    const pt = PATIENTS.find(p => p.initials === patientInitials)
    const type = PASS_TYPES.find(t => t.value === passType)
    if (!pt || !type) return { eligible: false, reason: 'Select patient and pass type' }
    if (pt.onDiscipline && passType !== 'emergency') return { eligible: false, reason: 'Patient is on discipline' }
    if (pt.day < type.minDays) return { eligible: false, reason: `Min ${type.minDays} days residency required (current: Day ${pt.day})` }
    if (type.requiresCleanScreen) return { eligible: true, reason: 'Clean drug screen required before departure' }
    return { eligible: true, reason: 'Eligible' }
  }

  const handleSubmitRequest = () => {
    if (!form.patient || !form.type || !form.startDate || !form.guardian || !form.reason) return
    const newPass = {
      id: Date.now(),
      patient: form.patient,
      type: form.type,
      status: 'pending',
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      guardian: form.guardian,
      reason: form.reason,
      returnedOnTime: null,
      substanceClear: null,
      notes: '',
    }
    setPasses([newPass, ...passes])
    setForm({ patient: '', type: '', startDate: '', endDate: '', guardian: '', reason: '' })
    setShowForm(false)
  }

  const handleApprove = (id) => setPasses(passes.map(p => p.id === id ? { ...p, status: 'active' } : p))
  const handleDeny = (id) => setPasses(passes.map(p => p.id === id ? { ...p, status: 'denied' } : p))

  const handleReturnSubmit = () => {
    if (!returnModal) return
    setPasses(passes.map(p => p.id === returnModal ? { ...p, status: 'completed', returnedOnTime: returnData.returnedOnTime, substanceClear: returnData.substanceClear, notes: returnData.notes } : p))
    setReturnModal(null)
    setReturnData({ returnedOnTime: false, substanceClear: false, notes: '' })
  }

  const eligibility = form.patient && form.type ? getEligibility(form.patient, form.type) : null

  const tabs = [
    { key: 'active', label: 'Active', count: activePasses.length },
    { key: 'pending', label: 'Pending', count: pendingPasses.length },
    { key: 'history', label: 'History', count: historyPasses.length },
  ]

  const displayPasses = tab === 'active' ? activePasses : tab === 'pending' ? pendingPasses : historyPasses

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Pass Management</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>SOP 5.4 — Request, approve, and track resident passes</p>
        </div>
        <button className="btn btn--primary" style={{ padding: '10px 20px' }} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Pass Request'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
        {PASS_TYPES.map(pt => {
          const count = passes.filter(p => p.type === pt.value && (p.status === 'active' || p.status === 'completed')).length
          return (
            <div className="card" key={pt.value} style={{ textAlign: 'center', padding: 14 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: typeColors[pt.value] }}>{count}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>{pt.label}</div>
            </div>
          )
        })}
      </div>

      {/* New Pass Request Form */}
      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16 }}>New Pass Request</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Patient</label>
              <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={form.patient} onChange={e => setForm({ ...form, patient: e.target.value })}>
                <option value="">Select patient</option>
                {PATIENTS.map(p => <option key={p.initials} value={p.initials}>{p.initials} — Day {p.day}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Pass Type</label>
              <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="">Select type</option>
                {PASS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Start Date</label>
              <input type="date" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>End Date</label>
              <input type="date" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Guardian Relationship</label>
              <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={form.guardian} onChange={e => setForm({ ...form, guardian: e.target.value })}>
                <option value="">Select guardian...</option>
                {['PFSP (Primary Family Support Person)', 'Next of Kin', 'Spouse', 'Parent', 'Sibling', 'Pastor/Church leader', 'Other approved guardian'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Reason</label>
              <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
                <option value="">Select reason...</option>
                {['Family visit', 'Medical appointment', 'Church attendance', 'Vocational training', 'Community reintegration activity', 'Personal errand (approved)', 'Emergency — family death', 'Emergency — family hospitalization'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {eligibility && (
            <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 6, background: eligibility.eligible ? '#F0FFF4' : '#FFF5F5', color: eligibility.eligible ? '#1A7A4A' : '#E53E3E', fontSize: '.82rem', fontWeight: 600 }}>
              {eligibility.eligible ? '✓' : '✗'} {eligibility.reason}
            </div>
          )}

          {form.type && (
            <div style={{ marginTop: 8, padding: '8px 14px', borderRadius: 6, background: '#EBF8FF', fontSize: '.78rem', color: '#2B6CB0' }}>
              {PASS_TYPES.find(t => t.value === form.type)?.desc}
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn btn--primary" style={{ padding: '8px 20px' }}
              onClick={handleSubmitRequest}
              disabled={!eligibility?.eligible}>Submit Request</button>
            <button className="btn btn--secondary" style={{ padding: '8px 20px' }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.key}
            className={`btn btn--sm ${tab === t.key ? 'btn--primary' : 'btn--secondary'}`}
            style={{ padding: '8px 16px', fontSize: '.82rem' }}
            onClick={() => setTab(t.key)}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Pass List */}
      {displayPasses.length === 0 && (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--g500)', fontSize: '.88rem' }}>
          No {tab} passes.
        </div>
      )}

      {displayPasses.map(p => (
        <div className="card" key={p.id} style={{ padding: 16, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: typeColors[p.type], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.88rem' }}>
                {p.patient}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{PASS_TYPES.find(t => t.value === p.type)?.label}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>
                  {p.startDate}{p.endDate !== p.startDate ? ` → ${p.endDate}` : ''} · Guardian: {p.guardian}
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--g500)', marginTop: 2 }}>Reason: {p.reason}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '.72rem', fontWeight: 600, background: `${statusColors[p.status]}18`, color: statusColors[p.status], textTransform: 'capitalize' }}>
                {p.status}
              </span>
              {p.status === 'pending' && (
                <>
                  <button className="btn btn--sm btn--primary" style={{ padding: '5px 12px', fontSize: '.74rem' }} onClick={() => handleApprove(p.id)}>Approve</button>
                  <button className="btn btn--sm btn--secondary" style={{ padding: '5px 12px', fontSize: '.74rem', color: '#E53E3E' }} onClick={() => handleDeny(p.id)}>Deny</button>
                </>
              )}
              {p.status === 'active' && (
                <button className="btn btn--sm btn--secondary" style={{ padding: '5px 12px', fontSize: '.74rem' }} onClick={() => setReturnModal(p.id)}>Process Return</button>
              )}
            </div>
          </div>

          {/* Post-return info for completed passes */}
          {p.status === 'completed' && p.returnedOnTime !== null && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--g100)', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '.78rem' }}>
              <span style={{ color: p.returnedOnTime ? '#1A7A4A' : '#E53E3E' }}>{p.returnedOnTime ? '✓ Returned on time' : '✗ Late return'}</span>
              <span style={{ color: p.substanceClear ? '#1A7A4A' : '#E53E3E' }}>{p.substanceClear ? '✓ Substance assessment clear' : '✗ Substance assessment flagged'}</span>
              {p.notes && <span style={{ color: 'var(--g500)' }}>Notes: {p.notes}</span>}
            </div>
          )}
        </div>
      ))}

      {/* Return Modal */}
      {returnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: 24, maxWidth: 440, width: '90%' }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16 }}>Post-Return Assessment</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.88rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={returnData.returnedOnTime} onChange={e => setReturnData({ ...returnData, returnedOnTime: e.target.checked })} />
                Returned on time
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.88rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={returnData.substanceClear} onChange={e => setReturnData({ ...returnData, substanceClear: e.target.checked })} />
                Substance assessment clear
              </label>
              <div>
                <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Notes</label>
                <textarea rows={3} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)', resize: 'vertical' }}
                  value={returnData.notes} onChange={e => setReturnData({ ...returnData, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn--secondary" style={{ padding: '8px 16px' }} onClick={() => { setReturnModal(null); setReturnData({ returnedOnTime: false, substanceClear: false, notes: '' }) }}>Cancel</button>
              <button className="btn btn--primary" style={{ padding: '8px 16px' }} onClick={handleReturnSubmit}>Submit Assessment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
