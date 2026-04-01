import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Shared Patient Records — visible to admin, staff.
  MECE columns: Identity, Programme, Clinical, Behavioral, Actions
*/

const PHASES = {
  stabilization: { label: 'Stabilization', color: '#E53E3E', weeks: '1–2' },
  foundation: { label: 'Foundation', color: '#DD6B20', weeks: '3–6' },
  deepening: { label: 'Deepening', color: '#D69E2E', weeks: '7–10' },
  reintegration: { label: 'Reintegration', color: '#1A7A4A', weeks: '11–12' },
}

const PATIENTS = [
  { id: 'P001', initials: 'CO', gender: 'M', age: 32, day: 23, phase: 'foundation', substance: 'Alcohol', pathway: 'A', insight: 'contemplation', mood: 4, cravings: 2, counselor: 'AI', bed: 'A1', status: 'admitted' },
  { id: 'P002', initials: 'AN', gender: 'F', age: 28, day: 45, phase: 'deepening', substance: 'Tramadol', pathway: 'A', insight: 'preparation', mood: 3, cravings: 3, counselor: 'FA', bed: 'B3', status: 'admitted' },
  { id: 'P003', initials: 'KA', gender: 'M', age: 41, day: 74, phase: 'reintegration', substance: 'Cannabis', pathway: 'B', insight: 'action', mood: 5, cravings: 1, counselor: 'AI', bed: 'A5', status: 'admitted' },
  { id: 'P004', initials: 'IM', gender: 'M', age: 24, day: 8, phase: 'stabilization', substance: 'Heroin', pathway: 'A', insight: 'precontemplation', mood: 2, cravings: 4, counselor: 'FA', bed: 'C2', status: 'admitted' },
]

const moodColors = ['', '#E53E3E', '#DD6B20', '#D69E2E', '#38A169', '#2B6CB0']

const SUBSTANCE_OPTIONS = ['Alcohol', 'Cannabis', 'Cocaine', 'Heroin', 'Tramadol', 'Codeine Syrup', 'Methamphetamine', 'Benzodiazepines', 'Multiple']
const INSIGHT_OPTIONS = ['denial', 'precontemplation', 'contemplation', 'preparation', 'action']
const COUNSELOR_OPTIONS = ['AI', 'FA', 'TA', 'MO']
const BED_OPTIONS = [
  'A1','A2','A3','A4','A5','A6',
  'B1','B2','B3','B4','B5','B6',
  'C1','C2','C3','C4','C5','C6',
  'D1','D2','D3','D4','D5','D6',
]

export default function Patients() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState(PATIENTS)
  const [showAdmitForm, setShowAdmitForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [admitForm, setAdmitForm] = useState({
    initials: '', gender: '', age: '', substance: '', pathway: '', insight: '', bed: '', counselor: '',
  })

  const takenBeds = patients.filter(p => p.id !== editingId).map(p => p.bed)
  const availableBeds = BED_OPTIONS.filter(b => !takenBeds.includes(b))

  const handleAdmitSubmit = () => {
    if (!admitForm.initials || admitForm.initials.length !== 2 || !admitForm.gender || !admitForm.age || !admitForm.substance || !admitForm.pathway || !admitForm.insight || !admitForm.bed || !admitForm.counselor) return
    if (editingId) {
      setPatients(prev => prev.map(p => p.id === editingId ? {
        ...p,
        initials: admitForm.initials.toUpperCase(),
        gender: admitForm.gender === 'Male' ? 'M' : admitForm.gender === 'Female' ? 'F' : admitForm.gender,
        age: parseInt(admitForm.age),
        substance: admitForm.substance,
        pathway: admitForm.pathway,
        insight: admitForm.insight,
        counselor: admitForm.counselor,
        bed: admitForm.bed,
      } : p))
      setEditingId(null)
    } else {
      const newPatient = {
        id: 'P' + String(patients.length + 1).padStart(3, '0'),
        initials: admitForm.initials.toUpperCase(),
        gender: admitForm.gender === 'Male' ? 'M' : 'F',
        age: parseInt(admitForm.age),
        day: 1,
        phase: 'stabilization',
        substance: admitForm.substance,
        pathway: admitForm.pathway,
        insight: admitForm.insight,
        mood: 3,
        cravings: 3,
        counselor: admitForm.counselor,
        bed: admitForm.bed,
        status: 'admitted',
      }
      setPatients(prev => [...prev, newPatient])
    }
    setAdmitForm({ initials: '', gender: '', age: '', substance: '', pathway: '', insight: '', bed: '', counselor: '' })
    setShowAdmitForm(false)
  }

  const handleEditPatient = (p) => {
    setEditingId(p.id)
    setAdmitForm({
      initials: p.initials,
      gender: p.gender === 'M' ? 'Male' : 'Female',
      age: String(p.age),
      substance: p.substance,
      pathway: p.pathway,
      insight: p.insight,
      bed: p.bed,
      counselor: p.counselor,
    })
    setShowAdmitForm(true)
  }

  const filtered = patients
    .filter(p => filter === 'all' || p.phase === filter)
    .filter(p => !search || p.initials.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Patient Records</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>{patients.length} current residents · 24 bed capacity</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="fi" style={{ maxWidth: 200 }} value={search} onChange={e => setSearch(e.target.value)}>
            <option value="">All patients</option>
            {patients.map(p => <option key={p.id} value={p.initials}>{p.initials} ({p.id})</option>)}
          </select>
          <button className="btn btn--primary btn--sm" onClick={() => setShowAdmitForm(!showAdmitForm)}>
            {showAdmitForm ? 'Cancel' : 'Admit New Patient'}
          </button>
        </div>
      </div>

      {/* Admit New Patient Form */}
      {showAdmitForm && (
        <div className="card" style={{ padding: '22px', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: 16 }}>{editingId ? 'Edit Patient' : 'Admit New Patient'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <div className="fg">
              <label className="flabel">Initials (2 letters) *</label>
              <input className="fi" maxLength={2} value={admitForm.initials} placeholder="e.g. AB"
                style={{ textTransform: 'uppercase' }}
                onChange={e => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '')
                  setAdmitForm(p => ({ ...p, initials: val }))
                }} />
            </div>
            <div className="fg">
              <label className="flabel">Gender *</label>
              <select className="fi" value={admitForm.gender} onChange={e => setAdmitForm(p => ({ ...p, gender: e.target.value }))}>
                <option value="">Select...</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <div className="fg">
              <label className="flabel">Age *</label>
              <select className="fi" value={admitForm.age} onChange={e => setAdmitForm(p => ({ ...p, age: e.target.value }))}>
                <option value="">Select...</option>
                {Array.from({ length: 48 }, (_, i) => i + 18).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="flabel">Substance *</label>
              <select className="fi" value={admitForm.substance} onChange={e => setAdmitForm(p => ({ ...p, substance: e.target.value }))}>
                <option value="">Select...</option>
                {SUBSTANCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="flabel">Pathway *</label>
              <select className="fi" value={admitForm.pathway} onChange={e => setAdmitForm(p => ({ ...p, pathway: e.target.value }))}>
                <option value="">Select...</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
            <div className="fg">
              <label className="flabel">Insight Level *</label>
              <select className="fi" value={admitForm.insight} onChange={e => setAdmitForm(p => ({ ...p, insight: e.target.value }))}>
                <option value="">Select...</option>
                {INSIGHT_OPTIONS.map(i => <option key={i} value={i} style={{ textTransform: 'capitalize' }}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="flabel">Assigned Bed *</label>
              <select className="fi" value={admitForm.bed} onChange={e => setAdmitForm(p => ({ ...p, bed: e.target.value }))}>
                <option value="">Select...</option>
                {availableBeds.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="flabel">Assigned Counselor *</label>
              <select className="fi" value={admitForm.counselor} onChange={e => setAdmitForm(p => ({ ...p, counselor: e.target.value }))}>
                <option value="">Select...</option>
                {COUNSELOR_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn btn--primary btn--sm" onClick={handleAdmitSubmit}>{editingId ? 'Update Patient' : 'Admit Patient'}</button>
            <button className="btn btn--secondary btn--sm" onClick={() => { setShowAdmitForm(false); setEditingId(null); setAdmitForm({ initials: '', gender: '', age: '', substance: '', pathway: '', insight: '', bed: '', counselor: '' }) }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Phase filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`btn btn--sm ${filter === 'all' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setFilter('all')}>All ({patients.length})</button>
        {Object.entries(PHASES).map(([key, phase]) => {
          const count = patients.filter(p => p.phase === key).length
          return (
            <button key={key} className={`btn btn--sm ${filter === key ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setFilter(key)}>
              {phase.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Patient cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(p => {
          const phase = PHASES[p.phase]
          return (
            <div key={p.id} className="card" style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                {/* Identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--blue), var(--blue-dk))',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.82rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {p.initials.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--charcoal)' }}>{p.initials}</div>
                    <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>
                      {p.gender}, {p.age}y · ID: {p.id} · Pathway {p.pathway} · {p.substance}
                    </div>
                  </div>
                </div>

                {/* Programme status */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Day</div>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--charcoal)' }}>{p.day}/84</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Phase</div>
                    <span style={{ padding: '4px 10px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700, background: phase.color + '15', color: phase.color }}>
                      {phase.label}
                    </span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Mood</div>
                    <span style={{ fontWeight: 700, fontSize: '.92rem', color: moodColors[p.mood] }}>{p.mood}/5</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Cravings</div>
                    <span style={{ fontWeight: 700, fontSize: '.92rem', color: p.cravings >= 4 ? '#E53E3E' : 'var(--g700)' }}>{p.cravings}/5</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Insight</div>
                    <span style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g700)', textTransform: 'capitalize' }}>{p.insight}</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: 12 }}>
                <div className="pbar"><div className="pfill" style={{ width: `${(p.day / 84) * 100}%`, background: phase.color }} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--g500)', marginTop: 2 }}>
                  <span>Counselor: {p.counselor}</span>
                  <span>{Math.round((p.day / 84) * 100)}% complete</span>
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn--secondary btn--sm" style={{ padding: '4px 12px', fontSize: '.72rem' }} onClick={() => handleEditPatient(p)}>Edit</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
