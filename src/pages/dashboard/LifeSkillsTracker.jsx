import React, { useState, useEffect, useCallback } from 'react'
import { getPatients, getProgress, getAllProgress, upsertProgress, isSupabaseReady } from '../../utils/supabase'
import { activeBriefs } from '../../utils/patients'
import { requireFields } from '../../utils/formGuard'

/*
  Life Skills Tracker — SOP Chapter 7
  13 Life Skills Group modules tracked per patient.
  Per-patient completion is persisted live in `progress_records`
  under domain 'life_skills' (JSONB map of moduleId -> status).
  Module content lives on the separate static LifeSkillsModules page.
  HIPAA: initials only.
*/

// Static module catalog — the definitions never change.
const MODULES = [
  { id: 1, name: 'Morning Community Meeting', frequency: 'Daily', day: 'Mon–Sat', sessionsPerWeek: 6 },
  { id: 2, name: 'Care Planning Group', frequency: 'Weekly', day: 'Thursday', sessionsPerWeek: 1 },
  { id: 3, name: 'CBT and Relapse Prevention', frequency: '3x/week', day: 'Mon/Wed/Fri', sessionsPerWeek: 3 },
  { id: 4, name: 'Small Group / Process Group', frequency: 'Weekly', day: 'Wednesday', sessionsPerWeek: 1 },
  { id: 5, name: 'Psychoeducation', frequency: '2x/week', day: 'Tue/Thu', sessionsPerWeek: 2 },
  { id: 6, name: 'Relaxation and Stress Management', frequency: 'Weekly', day: 'Friday', sessionsPerWeek: 1 },
  { id: 7, name: 'Relationship and Family Group', frequency: 'Weekly', day: 'Friday', sessionsPerWeek: 1 },
  { id: 8, name: 'Transition Group / Discharge Readiness', frequency: 'Weeks 10–12', day: 'Varies', sessionsPerWeek: 2 },
  { id: 9, name: 'Work, Craft, and Vocational', frequency: 'Weekly', day: 'Monday', sessionsPerWeek: 1 },
  { id: 10, name: 'Cooking, Nutrition and Life Practical', frequency: 'Weekly', day: 'Wednesday', sessionsPerWeek: 1 },
  { id: 11, name: 'News and Current Affairs', frequency: 'Weekly', day: 'Monday', sessionsPerWeek: 1 },
  { id: 12, name: 'Creative Writing', frequency: 'Weekly', day: 'Thursday', sessionsPerWeek: 1 },
  { id: 13, name: 'End-of-Day Wrap-Up', frequency: 'Daily', day: 'Mon–Sat', sessionsPerWeek: 6 },
]

const STATUSES = [
  { value: 'not-started', label: 'Not started', color: '#A0AEC0' },
  { value: 'in-progress', label: 'In progress', color: '#DD6B20' },
  { value: 'complete', label: 'Complete', color: '#1A7A4A' },
]

const statusMeta = (value) => STATUSES.find(s => s.value === value) || STATUSES[0]

// Progress % from a status map: complete counts full, in-progress half.
function completionFromDoc(doc) {
  const map = doc || {}
  let score = 0
  for (const m of MODULES) {
    const s = map[m.id] || map[String(m.id)]
    if (s === 'complete') score += 1
    else if (s === 'in-progress') score += 0.5
  }
  return Math.round((score / MODULES.length) * 100)
}

function getPctColor(pct) {
  if (pct >= 80) return '#1A7A4A'
  if (pct >= 50) return '#DD6B20'
  if (pct >= 20) return '#D69E2E'
  return '#E53E3E'
}

export default function LifeSkillsTracker() {
  const [ready] = useState(isSupabaseReady())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [patients, setPatients] = useState([])           // active briefs { id, initials, full_name }
  const [allDocs, setAllDocs] = useState({})             // patient_id -> status map (overview)
  const [selectedPatient, setSelectedPatient] = useState('') // patient_id
  const [statusMap, setStatusMap] = useState({})         // moduleId -> status (editable)
  const [detailLoading, setDetailLoading] = useState(false)

  const initialsById = Object.fromEntries(patients.map(p => [p.id, p.initials]))
  const selectedInitials = initialsById[selectedPatient] || ''

  // Initial load: active patients + all life_skills docs for the overview.
  const load = useCallback(async () => {
    if (!isSupabaseReady()) { setLoading(false); return }
    setLoading(true)
    const [{ data: rows }, { data: progressRows }] = await Promise.all([
      getPatients(),
      getAllProgress('life_skills'),
    ])
    const briefs = activeBriefs(rows)
    setPatients(briefs)
    const docs = {}
    for (const r of (progressRows || [])) docs[r.patient_id] = r.data || {}
    setAllDocs(docs)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // When a patient is selected, seed the editable status map from their doc.
  const openPatient = useCallback(async (id) => {
    setSelectedPatient(id)
    if (!id) return
    setDetailLoading(true)
    const { data } = await getProgress(id, 'life_skills')
    setStatusMap((data && data.data) ? { ...data.data } : {})
    setDetailLoading(false)
  }, [])

  const setModuleStatus = (moduleId, value) =>
    setStatusMap(prev => ({ ...prev, [moduleId]: value }))

  const handleSave = async () => {
    if (!requireFields([[selectedPatient, 'Patient']])) return
    setSaving(true)
    const { error } = await upsertProgress(selectedPatient, 'life_skills', statusMap, 'SN')
    setSaving(false)
    if (error) { alert(`Could not save life-skills progress: ${error.message}`); return }
    setAllDocs(prev => ({ ...prev, [selectedPatient]: { ...statusMap } }))
  }

  if (!ready) {
    return (
      <div>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Life Skills Tracker</h1>
        <p style={{ color: 'var(--g500)', fontSize: '.9rem' }}>Live data is not configured. Set up Supabase to track life-skills progress.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Life Skills Tracker</h1>
        <p style={{ color: 'var(--g500)', fontSize: '.9rem' }}>Loading residents…</p>
      </div>
    )
  }

  const selectedPct = completionFromDoc(statusMap)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Life Skills Tracker</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>SOP Chapter 7 — 13 modules tracked per resident</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--g500)' }}>Resident:</label>
          <select
            value={selectedPatient}
            onChange={(e) => openPatient(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.9rem', fontWeight: 600, background: '#fff' }}
          >
            <option value="">— Select —</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.initials}</option>
            ))}
          </select>
          {selectedPatient && (
            <button className="btn btn--secondary" style={{ padding: '8px 16px' }} onClick={() => setSelectedPatient('')}>
              Show All Residents
            </button>
          )}
        </div>
      </div>

      {patients.length === 0 && (
        <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--g500)' }}>
          No active residents to track.
        </div>
      )}

      {/* Overview cards (live overview from all life_skills docs) */}
      {!selectedPatient && patients.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
          {patients.map(p => {
            const pct = completionFromDoc(allDocs[p.id])
            const hasDoc = !!allDocs[p.id]
            return (
              <div className="card" key={p.id}
                style={{ padding: 16, textAlign: 'center', cursor: 'pointer', border: '2px solid transparent' }}
                onClick={() => openPatient(p.id)}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.92rem', margin: '0 auto 8px' }}>
                  {p.initials}
                </div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', fontWeight: 700, color: hasDoc ? getPctColor(pct) : 'var(--g300)' }}>
                  {hasDoc ? `${pct}%` : '—'}
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>{hasDoc ? 'Overall completion' : 'No records yet'}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Per-resident editable breakdown */}
      {selectedPatient && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', margin: 0 }}>
                {selectedInitials} — Module Breakdown
              </h2>
              <div style={{ fontSize: '.8rem', color: getPctColor(selectedPct), fontWeight: 600, marginTop: 2 }}>
                {selectedPct}% overall completion
              </div>
            </div>
            <button
              className="btn btn--primary"
              style={{ padding: '8px 20px' }}
              onClick={handleSave}
              disabled={saving || detailLoading}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          {detailLoading ? (
            <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--g500)' }}>Loading records…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {MODULES.map(m => {
                const value = statusMap[m.id] || statusMap[String(m.id)] || 'not-started'
                const meta = statusMeta(value)
                return (
                  <div className="card" key={m.id} style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{m.id}. {m.name}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>{m.frequency} · {m.day}</div>
                      </div>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, marginTop: 5, flexShrink: 0 }} />
                    </div>
                    <select
                      value={value}
                      onChange={(e) => setModuleStatus(m.id, e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.82rem', fontWeight: 600, color: meta.color, background: '#fff' }}
                    >
                      {STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    {m.id === 8 && (
                      <div style={{ fontSize: '.72rem', color: 'var(--g400)', marginTop: 6, fontStyle: 'italic' }}>Available Weeks 10–12 only</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
