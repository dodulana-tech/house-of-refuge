import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getPatients, getClinicalNotes, addClinicalNote, deleteClinicalNote, isSupabaseReady } from '../../utils/supabase'
import { activeBriefs, initialsFromName } from '../../utils/patients'
import { requireFields } from '../../utils/formGuard'

/*
  Clinical Notes Module — add and view SOAP-format notes for all patients.
  Live `clinical_notes` table. Note types map to the HOR multi-disciplinary
  team. Initials only — no full names surfaced (HIPAA).
*/

const NOTE_TYPES = [
  'Individual CBT',
  'Group CBT',
  'Psychoeducation',
  'Life Skills',
  'Nursing',
  'Pastoral',
  'Social Work',
  'MDT Review',
  'Admission',
  'Discharge',
]

const NOTE_TYPE_COLORS = {
  'Individual CBT': 'var(--blue)',
  'Group CBT': '#2B6CB0',
  'Psychoeducation': '#6B46C1',
  'Life Skills': '#319795',
  'Nursing': '#DD6B20',
  'Pastoral': '#8B5CF6',
  'Social Work': '#D69E2E',
  'MDT Review': '#E53E3E',
  'Admission': '#1A7A4A',
  'Discharge': '#718096',
}

const SOAP_PROMPTS = {
  'Individual CBT': {
    subjective: 'Patient-reported thoughts, feelings, and concerns. Cognitive distortions identified. Homework review from last session...',
    objective: 'Affect, engagement level, eye contact, thought process. Beck Depression/Anxiety Inventory scores if administered...',
    assessment: 'Stage of change progression. Cognitive restructuring progress. Therapeutic alliance quality...',
    plan: 'Homework assignments, thought records, behavioral experiments. Next session focus areas...',
  },
  'Group CBT': {
    subjective: 'Patient participation level and topics discussed. Peer interactions observed...',
    objective: 'Group dynamics, patient engagement, body language, contributions to discussion...',
    assessment: 'Social skills development, peer support capacity, group cohesion contribution...',
    plan: 'Topics for next session, individual follow-up needed, peer mentoring opportunities...',
  },
  'Psychoeducation': {
    subjective: 'Patient understanding and questions about educational content. Personal relevance expressed...',
    objective: 'Attendance, engagement, comprehension demonstrated, quiz/worksheet performance...',
    assessment: 'Knowledge retention, ability to apply concepts, areas needing reinforcement...',
    plan: 'Follow-up materials, next module topic, individualized learning needs...',
  },
  'Life Skills': {
    subjective: 'Patient self-assessment of skill development. Challenges faced in practice...',
    objective: 'Skill demonstration, task completion, independence level observed...',
    assessment: 'Progress in anger management, communication, budgeting, time management, etc...',
    plan: 'Skill practice assignments, community outing goals, vocational next steps...',
  },
  'Nursing': {
    subjective: 'Patient-reported symptoms, pain, sleep quality, appetite, medication side effects...',
    objective: 'BP: ___/___, Pulse: ___, Temp: ___C, Weight: ___kg, BMI: ___. Physical exam findings...',
    assessment: 'Vital trends, withdrawal symptom management, medication adherence, nutritional status...',
    plan: 'Medication changes, PRN administered, next vitals check, physician referral if needed...',
  },
  'Pastoral': {
    subjective: 'Spiritual concerns, faith journey reflections, guilt/shame processing, prayer requests...',
    objective: 'Attendance at devotions, Bible study engagement, chapel participation, spiritual practices observed...',
    assessment: 'Spiritual formation progress, forgiveness work, meaning-making, hope indicators...',
    plan: 'Scripture assignments, devotional materials, chaplain follow-up, faith community connections...',
  },
  'Social Work': {
    subjective: 'Family dynamics, community concerns, housing/employment worries, support system status...',
    objective: 'Family contact log, resource referrals made, social support mapping completed...',
    assessment: 'Reintegration readiness, family relationship quality, community resource needs...',
    plan: 'Family sessions scheduled, housing plan, employment referral, aftercare network building...',
  },
  'MDT Review': {
    subjective: 'Team member perspectives on patient progress. Patient self-assessment summary...',
    objective: 'Clinical scores, behavioral record, programme compliance metrics, phase milestones achieved...',
    assessment: 'Readiness for phase transition, risk level, treatment plan modifications needed...',
    plan: 'Phase transition decision, treatment plan updates, specialist referrals, next MDT date...',
  },
  'Admission': {
    subjective: 'Presenting complaint, substance use history, motivation for treatment, patient goals...',
    objective: 'Medical history, current medications, psychiatric history, baseline vitals, urine drug screen...',
    assessment: 'DSM-5 diagnosis, severity level, co-occurring conditions, risk assessment...',
    plan: 'Pathway assignment, initial treatment plan, detox protocol, orientation schedule...',
  },
  'Discharge': {
    subjective: 'Patient reflections on treatment, confidence level, concerns about returning to community...',
    objective: 'Programme completion metrics, final assessment scores, discharge vitals, medication list...',
    assessment: 'Treatment outcomes, relapse risk level, aftercare readiness, support system strength...',
    plan: 'Aftercare plan, support group referral, follow-up appointments, emergency contacts...',
  },
}

const DEFAULT_PROMPTS = {
  subjective: 'What the patient reports — symptoms, feelings, concerns, progress since last visit...',
  objective: 'Observable and measurable data — vitals, behavior, test results, clinical observations...',
  assessment: 'Clinical interpretation — diagnosis, progress evaluation, risk level, treatment response...',
  plan: 'Next steps — interventions, referrals, follow-up schedule, homework, medication changes...',
}

export default function ClinicalNotes() {
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filterPatient, setFilterPatient] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [expandedNote, setExpandedNote] = useState(null)

  const [form, setForm] = useState({
    patient: '', // patient_id
    type: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  })

  const initialsById = Object.fromEntries(patients.map(p => [p.id, p.initials]))

  const load = useCallback(async () => {
    if (!isSupabaseReady()) { setLoading(false); return }
    setLoading(true)
    const [{ data: rows }, { data: noteRows }] = await Promise.all([getPatients(), getClinicalNotes()])
    setPatients(activeBriefs(rows))
    setNotes((noteRows || []).map(n => ({
      id: n.id,
      patient_id: n.patient_id,
      date: (n.created_at || '').slice(0, 10),
      author: n.author_code || '—',
      type: n.type,
      subjective: n.subjective || '',
      objective: n.objective || '',
      assessment: n.assessment || '',
      plan: n.plan || '',
    })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const prompts = form.type ? (SOAP_PROMPTS[form.type] || DEFAULT_PROMPTS) : DEFAULT_PROMPTS

  const filteredNotes = notes
    .filter(n => !filterPatient || n.patient_id === filterPatient)
    .filter(n => !filterType || n.type === filterType)
    .filter(n => !filterDateFrom || n.date >= filterDateFrom)
    .filter(n => !filterDateTo || n.date <= filterDateTo)

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!requireFields([
      [form.patient, 'Patient'],
      [form.type, 'Note type'],
      [form.subjective, 'Subjective (what the patient reported)'],
    ])) return
    const authorInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'ST'
    setSaving(true)
    const { error } = await addClinicalNote({
      patient_id: form.patient,
      author_id: user?.id || null,
      author_code: authorInitials,
      type: form.type,
      subjective: form.subjective,
      objective: form.objective,
      assessment: form.assessment,
      plan: form.plan,
    })
    setSaving(false)
    if (error) { alert(`Could not save note: ${error.message}`); return }
    setForm({ patient: '', type: '', subjective: '', objective: '', assessment: '', plan: '' })
    setShowForm(false)
    await load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return
    const { error } = await deleteClinicalNote(id)
    if (error) { alert(`Could not delete: ${error.message}`); return }
    setExpandedNote(null)
    await load()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Clinical Notes</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>{notes.length} notes across {patients.length} patients · SOAP format</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Note'}
        </button>
      </div>

      {/* Add Note Form */}
      {showForm && (
        <div className="card" style={{ padding: '22px', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: 16 }}>New Clinical Note</h3>

          <div className="frow">
            <div className="fg">
              <label className="flabel">Patient *</label>
              <select className="fi" value={form.patient} onChange={e => handleFormChange('patient', e.target.value)}>
                <option value="">Select patient...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.initials}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="flabel">Note Type *</label>
              <select className="fi" value={form.type} onChange={e => handleFormChange('type', e.target.value)}>
                <option value="">Select type...</option>
                {NOTE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {form.type && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 14,
              background: (NOTE_TYPE_COLORS[form.type] || 'var(--g500)') + '10',
              borderLeft: `3px solid ${NOTE_TYPE_COLORS[form.type] || 'var(--g500)'}`,
            }}>
              <span style={{ fontSize: '.76rem', fontWeight: 600, color: NOTE_TYPE_COLORS[form.type] || 'var(--g500)' }}>
                {form.type} — prompts will guide your documentation below
              </span>
            </div>
          )}

          <div className="fg">
            <label className="flabel">S — Subjective *</label>
            <textarea
              className="fi" rows={3}
              placeholder={prompts.subjective}
              value={form.subjective}
              onChange={e => handleFormChange('subjective', e.target.value)}
            />
          </div>
          <div className="fg">
            <label className="flabel">O — Objective</label>
            <textarea
              className="fi" rows={3}
              placeholder={prompts.objective}
              value={form.objective}
              onChange={e => handleFormChange('objective', e.target.value)}
            />
          </div>
          <div className="fg">
            <label className="flabel">A — Assessment</label>
            <textarea
              className="fi" rows={3}
              placeholder={prompts.assessment}
              value={form.assessment}
              onChange={e => handleFormChange('assessment', e.target.value)}
            />
          </div>
          <div className="fg">
            <label className="flabel">P — Plan</label>
            <textarea
              className="fi" rows={3}
              placeholder={prompts.plan}
              value={form.plan}
              onChange={e => handleFormChange('plan', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn btn--primary btn--sm" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save Note'}</button>
            <button className="btn btn--secondary btn--sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Patient</label>
            <select className="fi" value={filterPatient} onChange={e => setFilterPatient(e.target.value)} style={{ fontSize: '.84rem' }}>
              <option value="">All patients</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.initials}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Note Type</label>
            <select className="fi" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ fontSize: '.84rem' }}>
              <option value="">All types</option>
              {NOTE_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>From</label>
            <input className="fi" type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ fontSize: '.84rem' }} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>To</label>
            <input className="fi" type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={{ fontSize: '.84rem' }} />
          </div>
          {(filterPatient || filterType || filterDateFrom || filterDateTo) && (
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => { setFilterPatient(''); setFilterType(''); setFilterDateFrom(''); setFilterDateTo('') }}
              style={{ alignSelf: 'flex-end' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p style={{ fontSize: '.82rem', color: 'var(--g500)', marginBottom: 12 }}>
        Showing {filteredNotes.length} of {notes.length} notes
      </p>

      {/* Notes list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredNotes.length === 0 ? (
          <div className="card" style={{ padding: '32px 22px', textAlign: 'center' }}>
            <p style={{ fontSize: '.92rem', color: 'var(--g500)' }}>No notes match the current filters.</p>
          </div>
        ) : (
          filteredNotes.map(note => {
            const typeColor = NOTE_TYPE_COLORS[note.type] || 'var(--g500)'
            const isExpanded = expandedNote === note.id
            return (
              <div
                key={note.id}
                className="card"
                style={{ padding: '16px 20px', borderLeft: `4px solid ${typeColor}`, cursor: 'pointer' }}
                onClick={() => setExpandedNote(isExpanded ? null : note.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--blue), var(--blue-dk))',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.72rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {initialsById[note.patient_id] || '—'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--charcoal)' }}>
                        {(initialsById[note.patient_id] || '—')} — {note.type}
                      </div>
                      <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>
                        {note.date} · Author: {note.author}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700,
                    background: typeColor + '18', color: typeColor,
                  }}>
                    {note.type}
                  </span>
                </div>

                {/* Excerpt (always visible) */}
                {!isExpanded && (
                  <div style={{ fontSize: '.82rem', color: 'var(--g700)', marginTop: 10, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: 'var(--g500)' }}>S: </span>
                    {note.subjective.length > 120 ? note.subjective.slice(0, 120) + '...' : note.subjective}
                  </div>
                )}

                {/* Full SOAP (expanded) */}
                {isExpanded && (
                  <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                    {[
                      ['S — Subjective', note.subjective],
                      ['O — Objective', note.objective],
                      ['A — Assessment', note.assessment],
                      ['P — Plan', note.plan],
                    ].map(([label, text]) => (
                      <div key={label}>
                        <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: '.84rem', color: 'var(--charcoal)', lineHeight: 1.5 }}>{text}</div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }}
                        style={{ background: 'none', border: '1px solid #E53E3E', color: '#E53E3E', cursor: 'pointer', fontSize: '.74rem', fontWeight: 600, padding: '4px 12px', borderRadius: 6 }}>
                        Delete Note
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
