import React, { useState, useEffect, useCallback } from 'react'
import { getPatients, getProgress, upsertProgress, isSupabaseReady } from '../../utils/supabase'
import { mapPatientRow } from '../../utils/patients'

/*
  Spiritual Milestones — SOP Chapter 6
  Deep spiritual formation tracking per patient.
  Christ-centered transformation milestones, scripture engagement,
  Fruit of the Spirit assessment, church placement pipeline.
  HIPAA: initials only. ALL fields are selects/checkboxes — ZERO free text.
  Persisted as a single JSONB doc in `progress_records` (domain 'spiritual_milestones').
*/

const MILESTONE_STATUSES = ['Not Yet', 'In Progress', 'Achieved', 'N/A']
const MILESTONE_LABELS = [
  'Accepted Jesus Christ as Lord and Saviour',
  'Water baptism',
  'Consistent daily personal devotion (prayer + Bible reading)',
  'First public testimony shared',
  'Regular participation in evening discipleship group',
  'Serving others in the community (chores done "as unto the Lord")',
  'Demonstrating fruit of the Spirit (love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control)',
  'Active intercessory prayer for others',
  'Completed Bible school curriculum',
  'Connected to local church for post-discharge',
]

const BIBLE_BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah',
  'Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians',
  '2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
  '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation',
]

const MEMORY_VERSES_OPTIONS = ['0', '1-3', '4-6', '7-10', '10+']
const STUDY_METHODS = ['Personal reading', 'Audio Bible', 'Group discussion', 'One-on-one discipleship']

const FRUITS = ['Love', 'Joy', 'Peace', 'Patience', 'Kindness', 'Goodness', 'Faithfulness', 'Gentleness', 'Self-Control']
const FRUIT_LEVELS = ['Not Evident', 'Emerging', 'Growing', 'Consistently Demonstrated']

const CHURCHES = ['This Present House', 'Life Center Lagos', 'Daystar Christian Centre', 'RCCG parish', 'TREM', 'Winners Chapel', 'Other denomination', 'Not yet identified']
const INTEGRATION_PLANS = ['Not started', 'Church visit scheduled', 'Attended once', 'Attending regularly', 'Connected to small group', 'Serving in ministry']
const ASSESSMENT_LEVELS = ['Not Yet Assessed', 'Minimal Engagement', 'Developing Faith', 'Authentic Growth', 'Ready for Graduation — Chaplain Approved']

const phaseColors = { stabilization: '#E53E3E', foundation: '#DD6B20', deepening: '#D69E2E', reintegration: '#1A7A4A' }

// Empty (not-done) defaults for a patient with no saved record yet.
// Never fabricate completion — unset milestones read as "Not Yet".
const emptyData = () => ({
  milestones: MILESTONE_LABELS.map(() => 'Not Yet'),
  milestoneDates: MILESTONE_LABELS.map(() => ''),
  bible: '', memory: '0', study: 'Personal reading',
  fruits: FRUITS.map(() => 'Not Evident'),
  churchId: 'No', churchName: 'Not yet identified', pastorContacted: 'No', firstVisit: 'No', integration: 'Not started',
  assessment: 'Not Yet Assessed', assessmentDate: '',
})

// Merge a stored JSONB doc over empty defaults so missing keys stay safe.
const seedData = (stored) => (stored ? { ...emptyData(), ...stored } : emptyData())

const labelS = { fontSize: '.75rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 3 }
const selectS = { width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }
const inputDateS = { ...selectS }

function calcReadiness(d) {
  const achieved = d.milestones.filter(m => m === 'Achieved').length
  return Math.round((achieved / MILESTONE_LABELS.length) * 100)
}

function fruitColor(level) {
  if (level === 'Consistently Demonstrated') return '#1A7A4A'
  if (level === 'Growing') return '#2B6CB0'
  if (level === 'Emerging') return '#DD6B20'
  return '#E53E3E'
}

function assessmentColor(level) {
  if (level === 'Ready for Graduation — Chaplain Approved') return '#805AD5'
  if (level === 'Authentic Growth') return '#1A7A4A'
  if (level === 'Developing Faith') return '#DD6B20'
  if (level === 'Minimal Engagement') return '#E53E3E'
  return 'var(--g500)'
}

export default function SpiritualMilestones() {
  const [patients, setPatients] = useState([])
  const [selected, setSelected] = useState('') // patient_id
  const [data, setData] = useState({})         // keyed by patient_id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  // Load active residents for the selector.
  const load = useCallback(async () => {
    if (!isSupabaseReady()) { setLoading(false); return }
    const { data: rows } = await getPatients()
    const active = (rows || [])
      .filter(r => ['admitted', 'on-pass', 'suspended'].includes(r.status))
      .map(r => mapPatientRow(r))
    setPatients(active)
    setSelected(prev => prev || active[0]?.id || '')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Load the saved milestone doc for the selected patient (once).
  useEffect(() => {
    if (!selected || data[selected]) return
    let cancelled = false
    ;(async () => {
      const { data: rec } = await getProgress(selected, 'spiritual_milestones')
      if (cancelled) return
      setData(prev => ({ ...prev, [selected]: seedData(rec?.data) }))
    })()
    return () => { cancelled = true }
  }, [selected, data])

  const p = patients.find(pt => pt.id === selected)
  const d = data[selected]

  const update = (field, value) => {
    setSavedAt(null)
    setData(prev => ({ ...prev, [selected]: { ...prev[selected], [field]: value } }))
  }

  const updateMilestone = (idx, value) => {
    const m = [...d.milestones]
    m[idx] = value
    update('milestones', m)
  }

  const updateMilestoneDate = (idx, value) => {
    const dt = [...d.milestoneDates]
    dt[idx] = value
    update('milestoneDates', dt)
  }

  const updateFruit = (idx, value) => {
    const f = [...d.fruits]
    f[idx] = value
    update('fruits', f)
  }

  const handleSave = async () => {
    if (!selected || !d) return
    setSaving(true)
    const { error } = await upsertProgress(selected, 'spiritual_milestones', d, 'PK')
    setSaving(false)
    if (error) { alert(`Could not save spiritual milestones: ${error.message}`); return }
    setSavedAt(Date.now())
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Spiritual Milestones</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>SOP Chapter 6 — Deep spiritual formation tracking. Christ-centered transformation milestones.</p>
      </div>

      {loading && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--g500)' }}>Loading residents…</div>
      )}

      {!loading && patients.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--g500)' }}>
          No active residents to track. Milestones appear here once patients are admitted.
        </div>
      )}

      {!loading && patients.length > 0 && (
        <>
          {/* Patient Selector */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            {patients.map(pt => (
              <button key={pt.id} onClick={() => setSelected(pt.id)}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: selected === pt.id ? '2px solid var(--blue)' : '1px solid var(--g200)',
                  background: selected === pt.id ? 'var(--blue)' : '#fff', color: selected === pt.id ? '#fff' : 'var(--g700)',
                  cursor: 'pointer', fontWeight: 600, fontSize: '.9rem',
                }}>
                {pt.initials} <span style={{ fontSize: '.75rem', opacity: .8 }}>Day {pt.day}</span>
              </button>
            ))}
          </div>

          {!d && (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--g500)' }}>Loading record…</div>
          )}

          {d && (
            <>
              {/* Readiness Score */}
              {(() => {
                const readiness = calcReadiness(d)
                return (
                  <div className="card" style={{ padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', border: `4px solid ${readiness >= 80 ? '#1A7A4A' : readiness >= 50 ? '#DD6B20' : '#E53E3E'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: readiness >= 80 ? '#1A7A4A' : readiness >= 50 ? '#DD6B20' : '#E53E3E' }}>{readiness}%</span>
                    </div>
                    <div>
                      <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', marginBottom: 4 }}>Spiritual Readiness Score</h2>
                      <p style={{ fontSize: '.85rem', color: 'var(--g500)' }}>Based on {d.milestones.filter(m => m === 'Achieved').length} of {MILESTONE_LABELS.length} milestones achieved</p>
                      {p && (
                        <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600, background: (phaseColors[p.phase] || 'var(--g500)') + '20', color: phaseColors[p.phase] || 'var(--g500)' }}>{p.phase.charAt(0).toUpperCase() + p.phase.slice(1)} Phase</span>
                      )}
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 20, fontSize: '.8rem', fontWeight: 600, background: assessmentColor(d.assessment) + '20', color: assessmentColor(d.assessment) }}>{d.assessment}</span>
                    </div>
                  </div>
                )
              })()}

              {/* Salvation & Growth Milestones */}
              <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16 }}>Salvation & Growth Milestones</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  {MILESTONE_LABELS.map((label, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: idx < MILESTONE_LABELS.length - 1 ? '1px solid var(--g100)' : 'none' }}>
                      <div style={{ fontSize: '.85rem', color: 'var(--g700)' }}>
                        <span style={{ fontWeight: 600, marginRight: 6 }}>{idx + 1}.</span>{label}
                      </div>
                      <select value={d.milestones[idx]} onChange={e => updateMilestone(idx, e.target.value)} style={selectS}>
                        {MILESTONE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input type="date" value={d.milestoneDates[idx]} onChange={e => updateMilestoneDate(idx, e.target.value)} style={inputDateS} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Scripture Engagement Tracker */}
              <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16 }}>Scripture Engagement Tracker</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={labelS}>Current Bible Book Being Studied</label>
                    <select value={d.bible} onChange={e => update('bible', e.target.value)} style={selectS}>
                      <option value="">Select book</option>
                      {BIBLE_BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelS}>Memory Verses Completed</label>
                    <select value={d.memory} onChange={e => update('memory', e.target.value)} style={selectS}>
                      {MEMORY_VERSES_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelS}>Study Method</label>
                    <select value={d.study} onChange={e => update('study', e.target.value)} style={selectS}>
                      {STUDY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Fruit of the Spirit Assessment — Galatians 5:22-23 */}
              <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 4 }}>Transformation Indicators</h3>
                <p style={{ fontSize: '.8rem', color: 'var(--g500)', marginBottom: 16 }}>Galatians 5:22-23 — Fruit of the Spirit Assessment</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {FRUITS.map((fruit, idx) => (
                    <div key={fruit} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--g200)', background: fruitColor(d.fruits[idx]) + '08' }}>
                      <label style={{ ...labelS, color: fruitColor(d.fruits[idx]) }}>{fruit}</label>
                      <select value={d.fruits[idx]} onChange={e => updateFruit(idx, e.target.value)} style={selectS}>
                        {FRUIT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Church Placement Pipeline */}
              <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16 }}>Church Placement Pipeline</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={labelS}>Church Identified</label>
                    <select value={d.churchId} onChange={e => update('churchId', e.target.value)} style={selectS}>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelS}>Church Name</label>
                    <select value={d.churchName} onChange={e => update('churchName', e.target.value)} style={selectS}>
                      {CHURCHES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelS}>Pastor Contacted</label>
                    <select value={d.pastorContacted} onChange={e => update('pastorContacted', e.target.value)} style={selectS}>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelS}>First Visit Completed</label>
                    <select value={d.firstVisit} onChange={e => update('firstVisit', e.target.value)} style={selectS}>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelS}>Integration Plan</label>
                    <select value={d.integration} onChange={e => update('integration', e.target.value)} style={selectS}>
                      {INTEGRATION_PLANS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Chaplain's Spiritual Formation Assessment */}
              <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16 }}>Chaplain's Spiritual Formation Assessment</h3>
                <p style={{ fontSize: '.8rem', color: 'var(--g500)', marginBottom: 16 }}>For graduation criterion — only the Chaplain may approve spiritual readiness.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={labelS}>Assessment Level</label>
                    <select value={d.assessment} onChange={e => update('assessment', e.target.value)} style={selectS}>
                      {ASSESSMENT_LEVELS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelS}>Assessment Date</label>
                    <input type="date" value={d.assessmentDate} onChange={e => update('assessmentDate', e.target.value)} style={inputDateS} />
                  </div>
                </div>
              </div>

              {/* Save */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--blue)', color: '#fff', fontWeight: 600, fontSize: '.9rem', cursor: saving ? 'default' : 'pointer', opacity: saving ? .7 : 1 }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {savedAt && <span style={{ fontSize: '.8rem', color: '#1A7A4A', fontWeight: 600 }}>Saved</span>}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
