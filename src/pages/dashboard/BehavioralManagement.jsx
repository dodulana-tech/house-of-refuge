import React, { useState } from 'react'

/*
  3-Tier Behavioral Management System per SOP Chapter 5
  Tier 1 — Minor Offenses: verbal warning, written reflection, privilege loss
  Tier 2 — Major Offenses: formal reprimand, extra work, loss of all privileges
  Tier 3 — Motivational Discipline: 2-week min, graduation hold, all free time → prayer/Bible study
*/

const MOCK_INCIDENTS = [
  { id: 1, patient: 'IM', tier: 1, type: 'Lateness to sessions', date: '2026-04-01', response: 'Verbal warning documented', status: 'resolved', reportedBy: 'HM' },
  { id: 2, patient: 'CO', tier: 1, type: 'Dormitory cleanliness', date: '2026-03-29', response: 'Written reflection exercise assigned', status: 'resolved', reportedBy: 'HM' },
  { id: 3, patient: 'AN', tier: 2, type: 'Persistent negative attitude', date: '2026-03-25', response: 'Formal reprimand, loss of phone privileges', status: 'monitoring', reportedBy: 'CL' },
]

const tierConfig = {
  1: { label: 'Tier 1 — Minor', color: '#D69E2E', bg: 'rgba(214,158,46,.1)' },
  2: { label: 'Tier 2 — Major', color: '#DD6B20', bg: 'rgba(221,107,32,.1)' },
  3: { label: 'Tier 3 — Motivational', color: '#E53E3E', bg: 'rgba(229,62,62,.1)' },
}

export default function BehavioralManagement() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ patient: '', tier: '1', type: '', description: '', response: '' })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Behavioral Management</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>3-Tier system per SOP — correction and character development, not punishment</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Log Incident'}
        </button>
      </div>

      {/* Tier reference */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {Object.entries(tierConfig).map(([tier, cfg]) => (
          <div key={tier} className="card" style={{ padding: '14px 16px', borderLeft: `4px solid ${cfg.color}` }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem', color: cfg.color }}>{cfg.label}</div>
            <div style={{ fontSize: '.76rem', color: 'var(--g500)', marginTop: 4 }}>
              {tier === '1' && 'Hygiene, lateness, food in rooms, laziness on duties'}
              {tier === '2' && 'Substance on pass, stealing, threats, persistent negativity'}
              {tier === '3' && 'Pattern of disengagement, spiritual stagnation, failure to progress'}
            </div>
          </div>
        ))}
      </div>

      {/* New incident form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: 14 }}>Log New Incident</h3>
          <div className="frow">
            <div className="fg"><label className="flabel">Patient *</label>
              <select className="fi" value={form.patient} onChange={e => setForm(p => ({ ...p, patient: e.target.value }))}>
                <option value="">Select patient...</option>
                <option value="CO">CO</option><option value="AN">AN</option><option value="KA">KA</option><option value="IM">IM</option>
              </select>
            </div>
            <div className="fg"><label className="flabel">Tier *</label>
              <select className="fi" value={form.tier} onChange={e => setForm(p => ({ ...p, tier: e.target.value }))}>
                <option value="1">Tier 1 — Minor Offense</option>
                <option value="2">Tier 2 — Major Offense</option>
                <option value="3">Tier 3 — Motivational Discipline</option>
              </select>
            </div>
          </div>
          <div className="fg"><label className="flabel">Offense Type *</label>
            <select className="fi" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="">Select offense...</option>
              <optgroup label="Tier 1 — Minor Offenses">
                {['Poor personal hygiene', 'Dormitory cleanliness', 'Lateness to sessions', 'Food in rooms', 'Phone privilege abuse', 'Laziness on duties', 'Not following instructions'].map(o => <option key={o} value={o}>{o}</option>)}
              </optgroup>
              <optgroup label="Tier 2 — Major Offenses">
                {['Substance use on pass', 'Smoking on premises', 'Stealing', 'Property damage', 'Threatening resident', 'Not returning from pass', 'Persistent negative attitude', 'Manipulating visitors', 'Threatening staff'].map(o => <option key={o} value={o}>{o}</option>)}
              </optgroup>
              <optgroup label="Tier 3 — Motivational Discipline">
                {['Disengagement pattern', 'Spiritual stagnation', 'Consistent failure to progress'].map(o => <option key={o} value={o}>{o}</option>)}
              </optgroup>
            </select>
          </div>
          <div className="frow">
            <div className="fg"><label className="flabel">Location *</label>
              <select className="fi" value={form.location || ''} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}>
                <option value="">Select location...</option>
                {['Dormitory', 'Chapel', 'Dining hall', 'Therapy room', 'Common area', 'Outside premises', 'Vocational workshop', 'Other'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="fg"><label className="flabel">Time of Day *</label>
              <select className="fi" value={form.timeOfDay || ''} onChange={e => setForm(p => ({ ...p, timeOfDay: e.target.value }))}>
                <option value="">Select time...</option>
                {['Early morning (5:30–7:00)', 'Morning (7:00–12:00)', 'Afternoon (12:00–17:00)', 'Evening (17:00–21:00)', 'Night (21:00–5:30)'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="fg"><label className="flabel">Witnesses Present</label>
              <select className="fi" value={form.witnesses || ''} onChange={e => setForm(p => ({ ...p, witnesses: e.target.value }))}>
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <div className="fg"><label className="flabel">Additional Context</label>
            <textarea className="fi" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief supplementary details (optional)" />
          </div>
          <div className="fg"><label className="flabel">Response / Action Taken *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' }}>
              {form.tier === '1' && ['Verbal warning', 'Written reflection exercise', 'Temporary privilege loss'].map(r => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.86rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={(form.response || '').includes(r)} onChange={e => {
                    const current = form.response ? form.response.split(', ').filter(Boolean) : []
                    const updated = e.target.checked ? [...current, r] : current.filter(c => c !== r)
                    setForm(p => ({ ...p, response: updated.join(', ') }))
                  }} />
                  {r}
                </label>
              ))}
              {form.tier === '2' && ['Formal verbal reprimand', 'Extra work assignments', 'Written confession/apology', 'Bible passage memorization', 'Loss of all privileges', 'Motivational discipline activated'].map(r => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.86rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={(form.response || '').includes(r)} onChange={e => {
                    const current = form.response ? form.response.split(', ').filter(Boolean) : []
                    const updated = e.target.checked ? [...current, r] : current.filter(c => c !== r)
                    setForm(p => ({ ...p, response: updated.join(', ') }))
                  }} />
                  {r}
                </label>
              ))}
              {form.tier === '3' && ['Special work crew', 'Graduation date on hold', 'Loss of all pass/phone', 'All free time → prayer/Bible study', 'Weekly evaluation with Program Director'].map(r => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.86rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={(form.response || '').includes(r)} onChange={e => {
                    const current = form.response ? form.response.split(', ').filter(Boolean) : []
                    const updated = e.target.checked ? [...current, r] : current.filter(c => c !== r)
                    setForm(p => ({ ...p, response: updated.join(', ') }))
                  }} />
                  {r}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn--primary btn--sm">Submit Incident Report</button>
        </div>
      )}

      {/* Incident log */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MOCK_INCIDENTS.map(inc => {
          const cfg = tierConfig[inc.tier]
          return (
            <div key={inc.id} className="card" style={{ padding: '16px 20px', borderLeft: `4px solid ${cfg.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{inc.patient}</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--g700)', marginTop: 2 }}>{inc.type}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700, background: inc.status === 'resolved' ? 'rgba(26,122,74,.1)' : 'rgba(221,107,32,.1)', color: inc.status === 'resolved' ? '#1A7A4A' : '#DD6B20' }}>
                    {inc.status}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '.82rem', color: 'var(--g500)', marginTop: 8 }}>
                Response: {inc.response} · Reported by: {inc.reportedBy} · {inc.date}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
