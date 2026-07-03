import React, { useState, useEffect, useCallback } from 'react'
import { getPatients, getPasses, addPass, updatePass, deletePass, isSupabaseReady } from '../../utils/supabase'
import { mapPatientRow } from '../../utils/patients'

/*
  Pass Management — SOP Section 5.4
  4 pass types with eligibility rules, approval workflow, and post-return
  assessment. Live `passes` table. HIPAA: initials only.
*/

const PASS_TYPES = [
  { value: '3hr', label: '3-Hour Pass', desc: 'Family only, 1 month min residency, not on discipline', minDays: 30, requiresCleanScreen: false },
  { value: '24hr', label: '24-Hour Pass', desc: 'Conduct-based, Program Director approval required', minDays: 30, requiresCleanScreen: false },
  { value: '48hr', label: '48-Hour Weekend', desc: 'Fri 10 PM – Sun 6 PM, clean drug screen required', minDays: 45, requiresCleanScreen: true },
  { value: 'emergency', label: 'Emergency Pass', desc: 'Family death or hospitalization only', minDays: 0, requiresCleanScreen: false },
]

const statusColors = { active: '#1A7A4A', pending: '#DD6B20', completed: 'var(--g500)', denied: '#E53E3E' }
const typeColors = { '3hr': '#3182CE', '24hr': '#805AD5', '48hr': '#D69E2E', emergency: '#E53E3E' }

function mapPassRow(r) {
  return {
    id: r.id,
    patientId: r.patient_id,
    type: r.type,
    status: r.status,
    startDate: r.start_date || '',
    endDate: r.end_date || r.start_date || '',
    guardian: r.guardian || '',
    reason: r.reason || '',
    returnedOnTime: r.returned_on_time,
    substanceClear: r.substance_clear,
    notes: r.notes || '',
  }
}

export default function PassManagement() {
  const [patients, setPatients] = useState([]) // [{id, initials, day, status}]
  const [passes, setPasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('active')
  const [showForm, setShowForm] = useState(false)
  const [returnModal, setReturnModal] = useState(null)

  // New request form state (patient = patient_id)
  const [form, setForm] = useState({ patient: '', type: '', startDate: '', endDate: '', guardian: '', reason: '' })

  // Post-return state
  const [returnData, setReturnData] = useState({ returnedOnTime: false, substanceClear: false, notes: '' })

  const load = useCallback(async () => {
    if (!isSupabaseReady()) { setLoading(false); return }
    const [{ data: rows }, { data: passRows }] = await Promise.all([getPatients(), getPasses()])
    const active = (rows || []).filter(p => ['admitted', 'on-pass', 'suspended'].includes(p.status))
    setPatients(active.map(r => { const m = mapPatientRow(r); return { id: r.id, initials: m.initials, day: m.day, status: r.status } }))
    setPasses((passRows || []).map(mapPassRow))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const initialsFor = (id) => patients.find(p => p.id === id)?.initials || '—'

  const activePasses = passes.filter(p => p.status === 'active')
  const pendingPasses = passes.filter(p => p.status === 'pending')
  const historyPasses = passes.filter(p => p.status === 'completed' || p.status === 'denied')

  const getEligibility = (patientId, passType) => {
    const pt = patients.find(p => p.id === patientId)
    const type = PASS_TYPES.find(t => t.value === passType)
    if (!pt || !type) return { eligible: false, reason: 'Select patient and pass type' }
    if (pt.status === 'suspended' && passType !== 'emergency') return { eligible: false, reason: 'Patient is on discipline' }
    if (pt.day < type.minDays) return { eligible: false, reason: `Min ${type.minDays} days residency required (current: Day ${pt.day})` }
    if (type.requiresCleanScreen) return { eligible: true, reason: 'Clean drug screen required before departure' }
    return { eligible: true, reason: 'Eligible' }
  }

  const handleSubmitRequest = async () => {
    if (!form.patient || !form.type || !form.startDate || !form.guardian || !form.reason) return
    setSaving(true)
    const { error } = await addPass({
      patient_id: form.patient,
      type: form.type,
      status: 'pending',
      start_date: form.startDate,
      end_date: form.endDate || form.startDate,
      guardian: form.guardian,
      reason: form.reason,
    })
    setSaving(false)
    if (error) { alert(`Could not submit request: ${error.message}`); return }
    setForm({ patient: '', type: '', startDate: '', endDate: '', guardian: '', reason: '' })
    setShowForm(false)
    await load()
  }

  const handleApprove = async (id) => { const { error } = await updatePass(id, { status: 'active' }); if (error) alert(error.message); else await load() }
  const handleDeny = async (id) => { const { error } = await updatePass(id, { status: 'denied' }); if (error) alert(error.message); else await load() }
  const handleCancelPending = async (id) => { if (!confirm('Cancel this pending pass?')) return; const { error } = await deletePass(id); if (error) alert(error.message); else await load() }

  const handleReturnSubmit = async () => {
    if (!returnModal) return
    const { error } = await updatePass(returnModal, {
      status: 'completed',
      returned_on_time: returnData.returnedOnTime,
      substance_clear: returnData.substanceClear,
      notes: returnData.notes,
    })
    if (error) { alert(error.message); return }
    setReturnModal(null)
    setReturnData({ returnedOnTime: false, substanceClear: false, notes: '' })
    await load()
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
                {patients.map(p => <option key={p.id} value={p.id}>{p.initials} — Day {p.day}</option>)}
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
                {initialsFor(p.patientId)}
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
                  <button className="btn btn--sm btn--secondary" style={{ padding: '5px 12px', fontSize: '.74rem', color: '#E53E3E' }} onClick={() => handleCancelPending(p.id)}>Cancel</button>
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
