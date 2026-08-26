import React, { useState, useEffect, useCallback } from 'react'
import { getPatients, getProgress, upsertProgress, isSupabaseReady } from '../../utils/supabase'
import { mapPatientRow } from '../../utils/patients'
import { requireFields } from '../../utils/formGuard'

/*
  Spiritual Formation Tracking — SOP Chapter 6
  Per-patient spiritual activity tracking and chaplain pastoral notes.
  Persisted to the live `progress_records` table (domain 'spiritual_formation'),
  one JSONB document per patient. Notes live inside the same document (data.notes).
  HIPAA: initials only.
*/

const DOMAIN = 'spiritual_formation'

const ASSESSMENT_LEVELS = ['Not Yet', 'Developing', 'Authentic Growth', 'Ready for Graduation']
const assessmentColors = {
  'Not Yet': '#E53E3E',
  'Developing': '#DD6B20',
  'Authentic Growth': '#1A7A4A',
  'Ready for Graduation': '#805AD5',
}

const NOTE_TOPICS = ['Prayer life', 'Scripture engagement', 'Character growth', 'Testimony', 'Discipleship']

const ENGAGEMENT_LEVELS = ['Highly engaged', 'Engaged', 'Partially engaged', 'Resistant', 'Absent']
const SPIRITUAL_INDICATORS = ['Active in prayer', 'Engaging with Scripture', 'Showing genuine remorse', 'Testimony emerging', 'Asking faith questions', 'Resisting spiritual input', 'Processing guilt/shame', 'Showing forgiveness', 'Community integration']
const RECOMMENDED_ACTIONS = ['Continue current approach', 'Increase pastoral sessions', 'Refer to clinical team', 'Prepare for church placement', 'No action needed']

const ATTENDANCE_METRICS = [
  { key: 'morningPrayer', label: 'Morning Prayer' },
  { key: 'bibleSchool', label: 'Bible School' },
  { key: 'eveningChapel', label: 'Evening Chapel' },
  { key: 'sundayChapel', label: 'Sunday Chapel' },
]

const phaseColors = { stabilization: '#E53E3E', foundation: '#DD6B20', deepening: '#D69E2E', reintegration: '#1A7A4A' }

function emptyData() {
  return {
    morningPrayer: '',
    bibleSchool: '',
    eveningChapel: '',
    sundayChapel: '',
    churchPlacement: '',
    assessment: '',
    notes: [],
  }
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--g100)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: color || 'var(--blue)', transition: 'width .3s' }} />
    </div>
  )
}

const pctColor = (n) => (n >= 80 ? '#1A7A4A' : n >= 50 ? '#DD6B20' : '#E53E3E')

export default function SpiritualFormation() {
  const [patients, setPatients] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [dataById, setDataById] = useState({}) // patient_id -> spiritual data doc
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteForm, setNoteForm] = useState({ topic: '', engagementLevel: '', spiritualIndicators: [], recommendedAction: '' })

  const loadData = useCallback(async (patientId) => {
    if (!patientId || !isSupabaseReady()) return emptyData()
    const { data: row } = await getProgress(patientId, DOMAIN)
    if (row?.data && Object.keys(row.data).length) {
      return { ...emptyData(), ...row.data, notes: row.data.notes || [] }
    }
    return emptyData()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!isSupabaseReady()) { setLoading(false); return }
      const { data: rows } = await getPatients()
      const active = (rows || [])
        .filter(p => ['admitted', 'on-pass', 'suspended'].includes(p.status))
        .map(p => mapPatientRow(p))
      setPatients(active)
      const first = active[0]?.id || ''
      setSelectedId(first)
      if (first) setDataById({ [first]: await loadData(first) })
      setLoading(false)
    })()
  }, [loadData])

  const onSelectPatient = async (id) => {
    setSelectedId(id)
    setShowNoteForm(false)
    if (!dataById[id]) {
      const d = await loadData(id)
      setDataById(prev => ({ ...prev, [id]: d }))
    }
  }

  const data = dataById[selectedId]
  const patient = patients.find(p => p.id === selectedId)

  const updateField = (field, value) => {
    setDataById(prev => ({ ...prev, [selectedId]: { ...prev[selectedId], [field]: value } }))
  }

  const persist = async (docOverride) => {
    const doc = docOverride || dataById[selectedId]
    if (!selectedId || !doc) return { error: { message: 'No patient selected' } }
    const { error } = await upsertProgress(selectedId, DOMAIN, doc, 'PK')
    return { error }
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await persist()
    setSaving(false)
    if (error) alert(`Could not save spiritual formation record: ${error.message}`)
    else alert('Spiritual formation record saved.')
  }

  const handleAddNote = async () => {
    if (!requireFields([
      [noteForm.topic, 'Topic'],
      [noteForm.engagementLevel, 'Engagement level'],
    ])) return
    const textParts = [
      `Engagement: ${noteForm.engagementLevel}`,
      noteForm.spiritualIndicators.length ? `Indicators: ${noteForm.spiritualIndicators.join(', ')}` : '',
      noteForm.recommendedAction ? `Action: ${noteForm.recommendedAction}` : '',
    ].filter(Boolean).join('. ')
    const newNote = { id: Date.now(), topic: noteForm.topic, text: textParts, date: new Date().toISOString().slice(0, 10) }
    const newDoc = { ...data, notes: [newNote, ...(data.notes || [])] }
    setDataById(prev => ({ ...prev, [selectedId]: newDoc }))
    setNoteForm({ topic: '', engagementLevel: '', spiritualIndicators: [], recommendedAction: '' })
    setShowNoteForm(false)
    setSaving(true)
    const { error } = await persist(newDoc)
    setSaving(false)
    if (error) alert(`Note added locally but could not be saved: ${error.message}`)
  }

  if (loading) {
    return (
      <div>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Spiritual Formation</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Loading…</p>
      </div>
    )
  }

  if (!patients.length || !data) {
    return (
      <div>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Spiritual Formation</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>No active patients on record yet.</p>
      </div>
    )
  }

  const notes = data.notes || []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Spiritual Formation</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>SOP Chapter 6 — Prayer, worship, pastoral care, and church placement tracking</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--g500)' }}>Patient</label>
          <select
            value={selectedId}
            onChange={e => onSelectPatient(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--g200)', fontWeight: 600, background: '#fff' }}
          >
            {patients.map(p => <option key={p.id} value={p.id}>{p.initials} — Day {p.day}</option>)}
          </select>
          <button className="btn btn--primary" style={{ padding: '10px 18px' }} disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn btn--secondary" style={{ padding: '10px 18px' }} onClick={() => setShowNoteForm(!showNoteForm)}>
            {showNoteForm ? 'Cancel' : '+ Add Chaplain Note'}
          </button>
        </div>
      </div>

      {/* Add Chaplain Note Form */}
      {showNoteForm && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16 }}>
            Add Chaplain Note — {patient?.initials}
          </h3>
          <div>
            <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Topic</label>
            <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
              value={noteForm.topic} onChange={e => setNoteForm({ ...noteForm, topic: e.target.value })}>
              <option value="">Select topic</option>
              {NOTE_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Engagement Level</label>
            <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
              value={noteForm.engagementLevel} onChange={e => setNoteForm({ ...noteForm, engagementLevel: e.target.value })}>
              <option value="">Select engagement level</option>
              {ENGAGEMENT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 6 }}>Spiritual Indicators Observed</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 4 }}>
              {SPIRITUAL_INDICATORS.map(indicator => (
                <label key={indicator} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.8rem', cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={noteForm.spiritualIndicators.includes(indicator)}
                    onChange={e => {
                      setNoteForm(prev => ({
                        ...prev,
                        spiritualIndicators: e.target.checked
                          ? [...prev.spiritualIndicators, indicator]
                          : prev.spiritualIndicators.filter(i => i !== indicator)
                      }))
                    }} />
                  {indicator}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Recommended Action</label>
            <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
              value={noteForm.recommendedAction} onChange={e => setNoteForm({ ...noteForm, recommendedAction: e.target.value })}>
              <option value="">Select recommended action</option>
              {RECOMMENDED_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn btn--primary" style={{ padding: '8px 20px' }} disabled={saving} onClick={handleAddNote}>Save Note</button>
            <button className="btn btn--secondary" style={{ padding: '8px 20px' }} onClick={() => setShowNoteForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Selected patient spiritual card */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: phaseColors[patient?.phase] || 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.92rem' }}>
              {patient?.initials}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{patient?.initials}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Day {patient?.day} · {patient?.phase}</div>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Overall Assessment</label>
            <select
              value={data.assessment}
              onChange={e => updateField('assessment', e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontWeight: 700, fontSize: '.78rem', color: data.assessment ? assessmentColors[data.assessment] : 'var(--g500)' }}
            >
              <option value="">Not assessed</option>
              {ASSESSMENT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Attendance Metrics (editable %) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {ATTENDANCE_METRICS.map(item => {
            const raw = data[item.key]
            const pct = Number(raw) || 0
            return (
              <div key={item.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '.76rem', color: 'var(--g600)' }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={raw === '' || raw === null || raw === undefined ? '' : raw}
                      onChange={e => updateField(item.key, e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value))))}
                      style={{ width: 60, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.76rem', fontWeight: 700, textAlign: 'right', color: pctColor(pct) }}
                    />
                    <span style={{ fontSize: '.76rem', color: 'var(--g400)' }}>%</span>
                  </div>
                </div>
                <ProgressBar pct={pct} color={pctColor(pct)} />
              </div>
            )
          })}
        </div>

        {/* Additional Info */}
        <div style={{ borderTop: '1px solid var(--g100)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.78rem' }}>
            <span style={{ color: 'var(--g500)' }}>Pastoral Notes</span>
            <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{notes.length}</span>
          </div>
          <div>
            <label style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Church Placement</label>
            <input
              type="text"
              value={data.churchPlacement}
              onChange={e => updateField('churchPlacement', e.target.value)}
              placeholder="e.g. Not applicable (Phase 1) or Assigned — Grace Community Church"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem' }}
            />
          </div>
        </div>
      </div>

      {/* Chaplain Notes Log */}
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', marginBottom: 12 }}>Chaplain Pastoral Notes — {patient?.initials}</h2>
      {notes.length === 0 && (
        <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--g500)', fontSize: '.85rem' }}>
          No spiritual notes recorded yet.
        </div>
      )}
      {notes.map(n => (
        <div className="card" key={n.id} style={{ padding: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: 'var(--blue)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '.72rem', fontWeight: 700 }}>{patient?.initials}</span>
              <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 600, background: '#805AD518', color: '#805AD5' }}>{n.topic}</span>
            </div>
            <span style={{ fontSize: '.72rem', color: 'var(--g400)' }}>{n.date}</span>
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--g600)', lineHeight: 1.5 }}>{n.text}</div>
        </div>
      ))}
    </div>
  )
}
