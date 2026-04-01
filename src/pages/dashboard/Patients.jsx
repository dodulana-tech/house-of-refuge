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

export default function Patients() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = PATIENTS
    .filter(p => filter === 'all' || p.phase === filter)
    .filter(p => !search || p.initials.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Patient Records</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>{PATIENTS.length} current residents · 24 bed capacity</p>
        </div>
        <input
          className="fi" style={{ maxWidth: 280 }}
          placeholder="Search patients..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Phase filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`btn btn--sm ${filter === 'all' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setFilter('all')}>All ({PATIENTS.length})</button>
        {Object.entries(PHASES).map(([key, phase]) => {
          const count = PATIENTS.filter(p => p.phase === key).length
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
