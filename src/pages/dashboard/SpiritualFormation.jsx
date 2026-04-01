import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Spiritual Formation Tracking — SOP Chapter 6
  Per-patient spiritual activity tracking and chaplain pastoral notes.
  HIPAA: initials only.
*/

const PATIENTS = [
  { initials: 'CO', id: 'P001', day: 23, phase: 'foundation' },
  { initials: 'AN', id: 'P002', day: 45, phase: 'deepening' },
  { initials: 'KA', id: 'P003', day: 74, phase: 'reintegration' },
  { initials: 'IM', id: 'P004', day: 8, phase: 'stabilization' },
]

const ASSESSMENT_LEVELS = ['Not Yet', 'Developing', 'Authentic Growth', 'Ready for Graduation']
const assessmentColors = {
  'Not Yet': '#E53E3E',
  'Developing': '#DD6B20',
  'Authentic Growth': '#1A7A4A',
  'Ready for Graduation': '#805AD5',
}

const NOTE_TOPICS = ['Prayer life', 'Scripture engagement', 'Character growth', 'Testimony', 'Discipleship']

const INITIAL_DATA = {
  CO: {
    morningPrayer: 71, // % this week (5/7)
    bibleSchool: 80,
    eveningChapel: 57,
    sundayChapel: 100,
    pastoralNotes: 3,
    churchPlacement: 'Not applicable (Phase 2)',
    assessment: 'Developing',
  },
  AN: {
    morningPrayer: 86,
    bibleSchool: 100,
    eveningChapel: 86,
    sundayChapel: 100,
    pastoralNotes: 5,
    churchPlacement: 'Not applicable (Phase 3)',
    assessment: 'Authentic Growth',
  },
  KA: {
    morningPrayer: 100,
    bibleSchool: 100,
    eveningChapel: 100,
    sundayChapel: 100,
    pastoralNotes: 8,
    churchPlacement: 'Assigned — Grace Community Church',
    assessment: 'Ready for Graduation',
  },
  IM: {
    morningPrayer: 29,
    bibleSchool: 14,
    eveningChapel: 14,
    sundayChapel: 100,
    pastoralNotes: 1,
    churchPlacement: 'Not applicable (Phase 1)',
    assessment: 'Not Yet',
  },
}

const INITIAL_NOTES = [
  { id: 1, patient: 'KA', topic: 'Testimony', text: 'Shared powerful testimony during chapel. Demonstrates genuine transformation and readiness to mentor newer residents.', date: '2026-03-28' },
  { id: 2, patient: 'AN', topic: 'Scripture engagement', text: 'Completing daily devotional readings consistently. Asked thoughtful questions during Bible School about forgiveness.', date: '2026-03-26' },
  { id: 3, patient: 'CO', topic: 'Prayer life', text: 'Beginning to engage more in morning prayer. Still quiet but shows willingness.', date: '2026-03-24' },
  { id: 4, patient: 'KA', topic: 'Discipleship', text: 'Met with church mentor this week. Positive feedback from church liaison. Ready for independent attendance.', date: '2026-03-22' },
  { id: 5, patient: 'IM', topic: 'Character growth', text: 'Initial pastoral visit. Patient receptive but physically unwell. Will follow up after medical stabilization.', date: '2026-03-25' },
]

const phaseColors = { stabilization: '#E53E3E', foundation: '#DD6B20', deepening: '#D69E2E', reintegration: '#1A7A4A' }

function ProgressBar({ pct, color }) {
  return (
    <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--g100)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: color || 'var(--blue)', transition: 'width .3s' }} />
    </div>
  )
}

export default function SpiritualFormation() {
  const { user } = useAuth()
  const [notes, setNotes] = useState(INITIAL_NOTES)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteForm, setNoteForm] = useState({ patient: '', topic: '', text: '' })

  const handleAddNote = () => {
    if (!noteForm.patient || !noteForm.topic || !noteForm.text) return
    setNotes([{
      id: Date.now(), patient: noteForm.patient, topic: noteForm.topic, text: noteForm.text, date: '2026-03-31',
    }, ...notes])
    setNoteForm({ patient: '', topic: '', text: '' })
    setShowNoteForm(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Spiritual Formation</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>SOP Chapter 6 — Prayer, worship, pastoral care, and church placement tracking</p>
        </div>
        <button className="btn btn--primary" style={{ padding: '10px 20px' }} onClick={() => setShowNoteForm(!showNoteForm)}>
          {showNoteForm ? 'Cancel' : '+ Add Chaplain Note'}
        </button>
      </div>

      {/* Add Chaplain Note Form */}
      {showNoteForm && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16 }}>Add Chaplain Note</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Patient</label>
              <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={noteForm.patient} onChange={e => setNoteForm({ ...noteForm, patient: e.target.value })}>
                <option value="">Select patient</option>
                {PATIENTS.map(p => <option key={p.initials} value={p.initials}>{p.initials} — Day {p.day}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Topic</label>
              <select style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)' }}
                value={noteForm.topic} onChange={e => setNoteForm({ ...noteForm, topic: e.target.value })}>
                <option value="">Select topic</option>
                {NOTE_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Note</label>
            <textarea rows={3} placeholder="Pastoral observation or note..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)', resize: 'vertical' }}
              value={noteForm.text} onChange={e => setNoteForm({ ...noteForm, text: e.target.value })} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn btn--primary" style={{ padding: '8px 20px' }} onClick={handleAddNote}>Save Note</button>
            <button className="btn btn--secondary" style={{ padding: '8px 20px' }} onClick={() => setShowNoteForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Per-patient Spiritual Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        {PATIENTS.map(p => {
          const data = INITIAL_DATA[p.initials]
          const patientNotes = notes.filter(n => n.patient === p.initials)
          return (
            <div className="card" key={p.initials} style={{ padding: 20 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: phaseColors[p.phase], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.92rem' }}>
                    {p.initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{p.initials}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Day {p.day} · {p.phase}</div>
                  </div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '.7rem', fontWeight: 700, background: `${assessmentColors[data.assessment]}18`, color: assessmentColors[data.assessment] }}>
                  {data.assessment}
                </span>
              </div>

              {/* Attendance Metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Morning Prayer', pct: data.morningPrayer },
                  { label: 'Bible School', pct: data.bibleSchool },
                  { label: 'Evening Chapel', pct: data.eveningChapel },
                  { label: 'Sunday Chapel', pct: data.sundayChapel },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: '.76rem', color: 'var(--g600)' }}>{item.label}</span>
                      <span style={{ fontSize: '.76rem', fontWeight: 700, color: item.pct >= 80 ? '#1A7A4A' : item.pct >= 50 ? '#DD6B20' : '#E53E3E' }}>{item.pct}%</span>
                    </div>
                    <ProgressBar pct={item.pct} color={item.pct >= 80 ? '#1A7A4A' : item.pct >= 50 ? '#DD6B20' : '#E53E3E'} />
                  </div>
                ))}
              </div>

              {/* Additional Info */}
              <div style={{ borderTop: '1px solid var(--g100)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem' }}>
                  <span style={{ color: 'var(--g500)' }}>Pastoral Notes</span>
                  <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{data.pastoralNotes}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem' }}>
                  <span style={{ color: 'var(--g500)' }}>Church Placement</span>
                  <span style={{ fontWeight: 600, fontSize: '.74rem', color: data.churchPlacement.startsWith('Assigned') ? '#1A7A4A' : 'var(--g500)' }}>{data.churchPlacement}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Chaplain Notes Log */}
      <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', marginBottom: 12 }}>Chaplain Pastoral Notes</h2>
      {notes.map(n => (
        <div className="card" key={n.id} style={{ padding: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: 'var(--blue)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '.72rem', fontWeight: 700 }}>{n.patient}</span>
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
