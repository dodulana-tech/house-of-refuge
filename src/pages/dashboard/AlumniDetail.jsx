import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { isSupabaseReady, getAlumnus, updateAlumnus } from '../../utils/supabase'
import { initialsFromName } from '../../utils/patients'
import { requireFields } from '../../utils/formGuard'

const RISK_COLORS = {
  low: { bg: '#C6F6D5', color: '#22543D' },
  medium: { bg: '#FEFCBF', color: '#744210' },
  high: { bg: '#FED7D7', color: '#742A2A' },
}

const STATUSES = ['active', 'relapsed', 'lost-to-follow-up', 'closed']

const TYPE_ICONS = { phone: '☎', visit: '\u{1F3E0}', group: '\u{1F465}' }

export default function AlumniDetail() {
  const { id } = useParams()
  const [alumnus, setAlumnus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contactForm, setContactForm] = useState({ date: '', type: 'phone', notes: '', outcome: 'stable' })

  const load = async () => {
    setLoading(true)
    const { data, error } = await getAlumnus(id)
    if (error && error.code !== 'PGRST116') alert('Failed to load alumnus: ' + error.message)
    setAlumnus(data || null)
    setLoading(false)
  }

  useEffect(() => {
    if (!isSupabaseReady()) { setLoading(false); return }
    load()
  }, [id])

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Link to="/dashboard/alumni" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: '.88rem', fontWeight: 600 }}>
          &larr; Back to Alumni Programme
        </Link>
        <div style={{ marginTop: 40, textAlign: 'center', color: 'var(--g500)' }}>Loading alumni record…</div>
      </div>
    )
  }

  if (!alumnus) {
    return (
      <div style={{ padding: 24 }}>
        <Link to="/dashboard/alumni" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: '.88rem', fontWeight: 600 }}>
          &larr; Back to Alumni Programme
        </Link>
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--fd)', color: 'var(--g500)' }}>Alumni record not found</h2>
        </div>
      </div>
    )
  }

  const d = alumnus.data || {}
  const name = alumnus.full_name || alumnus.initials || '—'
  const riskLevel = alumnus.risk_level || 'low'
  const rc = RISK_COLORS[riskLevel] || RISK_COLORS.low
  const riskFactors = d.riskFactors || []
  const contactHistory = d.contactLog || []

  const patchData = async (updates) => {
    setSaving(true)
    const { data, error } = await updateAlumnus(alumnus.id, updates)
    setSaving(false)
    if (error) { alert('Failed to save: ' + error.message); return }
    if (data) setAlumnus(data)
  }

  const handleStatusChange = (status) => patchData({ status })
  const handleRiskChange = (risk_level) => patchData({ risk_level })

  const handleSave = async () => {
    if (!requireFields([
      [contactForm.date, 'Contact date'],
      [contactForm.notes, 'Notes'],
    ])) return
    const newContact = { date: contactForm.date, type: contactForm.type, notes: contactForm.notes, outcome: contactForm.outcome }
    await patchData({
      data: { ...d, lastContact: contactForm.date, contactLog: [newContact, ...contactHistory] },
    })
    setContactForm({ date: '', type: 'phone', notes: '', outcome: 'stable' })
  }

  return (
    <div>
      <Link to="/dashboard/alumni" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: '.88rem', fontWeight: 600 }}>
        &larr; Back to Alumni Programme
      </Link>

      {/* Header */}
      <div style={{ marginTop: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>{name}</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Alumni detail — 24-month post-discharge monitoring</p>
        </div>
        <div>
          <label style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', display: 'block', marginBottom: 3 }}>Status</label>
          <select value={alumnus.status || 'active'} disabled={saving} onChange={e => handleStatusChange(e.target.value)}
            style={{ padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {STATUSES.map(s => <option key={s} value={s}>{s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Demographics */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Profile Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, fontSize: '.84rem' }}>
          {[
            ['Name', name],
            ['Graduation Date', alumnus.discharge_date || '—'],
            ['Substance', d.substance || '—'],
            ['Programme Phase Completed', d.phaseCompleted || '—'],
            ['Church Placement', d.churchPlacement || '—'],
            ['Employment Status', d.employmentStatus || d.employment || '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 2 }}>{label}</div>
              <div style={{ color: 'var(--g700)' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Assessment & Reintegration Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Risk Assessment */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Risk Assessment</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 14px', borderRadius: 12, fontSize: '.78rem', fontWeight: 700,
              background: rc.bg, color: rc.color, textTransform: 'uppercase',
            }}>
              {riskLevel} risk
            </span>
            <select value={riskLevel} disabled={saving} onChange={e => handleRiskChange(e.target.value)}
              style={{ padding: 4, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.75rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            {d.lastAssessment && <span style={{ fontSize: '.78rem', color: 'var(--g500)' }}>Last assessed: {d.lastAssessment}</span>}
          </div>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 6 }}>Key Risk Factors</div>
          {riskFactors.length === 0
            ? <p style={{ fontSize: '.82rem', color: 'var(--g400)' }}>None recorded.</p>
            : <ul style={{ margin: 0, paddingLeft: 18, fontSize: '.82rem', color: 'var(--g600)', lineHeight: 1.8 }}>
                {riskFactors.map((f, i) => <li key={i}>{f}</li>)}
              </ul>}
        </div>

        {/* Reintegration Progress */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Reintegration Progress</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '.84rem' }}>
            {[
              ['Housing Status', d.housing || '—'],
              ['Employment', d.employmentStatus || d.employment || '—'],
              ['Family Reunification', d.familyReunification || d.family || '—'],
              ['Church Attendance', d.churchAttendance || d.church || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 2 }}>{label}</div>
                <div style={{ color: 'var(--g700)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact History Timeline */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Contact History</h3>
        {contactHistory.length === 0 && <p style={{ fontSize: '.85rem', color: 'var(--g400)' }}>No contacts logged yet.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {contactHistory.map((c, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0',
              borderTop: i > 0 ? '1px solid var(--g100)' : 'none',
            }}>
              <div style={{
                minWidth: 36, height: 36, borderRadius: '50%', background: 'var(--g100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
              }}>
                {TYPE_ICONS[c.type] || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: '.82rem', textTransform: 'capitalize' }}>{c.type}</span>
                  <span style={{ fontSize: '.72rem', color: 'var(--g400)' }}>{c.date}</span>
                </div>
                <div style={{ fontSize: '.8rem', color: 'var(--g600)', marginTop: 2 }}>{c.notes}</div>
                {c.contactedBy && <div style={{ fontSize: '.72rem', color: 'var(--g400)', marginTop: 3 }}>Contacted by: {c.contactedBy}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Log Contact Form */}
      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Log Contact</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          <div>
            <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>Date</label>
            <input type="date" value={contactForm.date} onChange={e => setContactForm(p => ({ ...p, date: e.target.value }))}
              style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem' }} />
          </div>
          <div>
            <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>Type</label>
            <select value={contactForm.type} onChange={e => setContactForm(p => ({ ...p, type: e.target.value }))}
              style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem' }}>
              <option value="phone">Phone</option>
              <option value="visit">Home Visit</option>
              <option value="group">Alumni Group</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>Outcome</label>
            <select value={contactForm.outcome} onChange={e => setContactForm(p => ({ ...p, outcome: e.target.value }))}
              style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem' }}>
              <option value="stable">Stable</option>
              <option value="improving">Improving</option>
              <option value="declining">Declining</option>
              <option value="relapse-signs">Relapse Signs</option>
              <option value="no-contact">No Contact Made</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '.72rem', fontWeight: 600, display: 'block', marginBottom: 3 }}>Notes</label>
            <textarea value={contactForm.notes} onChange={e => setContactForm(p => ({ ...p, notes: e.target.value }))}
              rows={3} placeholder="Contact summary, observations, action items..."
              style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem', resize: 'vertical' }} />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ marginTop: 10, padding: '7px 20px', borderRadius: 6, border: 'none', background: 'var(--blue)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '.8rem', opacity: saving ? .6 : 1 }}>
          {saving ? 'Saving…' : 'Save Contact'}
        </button>
      </div>
    </div>
  )
}
