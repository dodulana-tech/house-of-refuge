import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getPatients, getAllVisitations, addVisitation } from '../../utils/supabase'
import { activeBriefs, initialsFromName } from '../../utils/patients'

/*
  Family Visit Requests — SOP Section 5.4.2
  Family-facing visit request page.
  Sundays 12:00–6:00 PM only.
*/

const TIME_SLOTS = ['12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM']
const VISITOR_COUNTS = ['1', '2', '3', '4', '5+']
const CHILDREN_OPTIONS = ['None', '1', '2', '3+']
const SPECIAL_REQUIREMENTS = [
  'Wheelchair access needed',
  'Interpreter required',
  'Extended visit requested',
  'Items for inspection',
  'None',
]

const VISITATION_RULES = [
  'Visiting hours are Sundays only, 12:00 PM to 6:00 PM',
  'All visitors must present valid identification at reception',
  'Visitors must remain in designated visiting areas at all times',
  'No access to dormitory, clinical, or staff areas',
  'Children must be supervised by their guardian throughout the visit',
  'All bags and items brought for residents are subject to inspection',
  'No alcohol, drugs, cigarettes, or contraband may be brought onto the premises',
  'Staff reserve the right to end visits early if the resident becomes distressed',
  'Visits may be suspended during the first 2 weeks (Medical Stabilisation phase)',
  'Maximum 5 visitors per session to maintain a calm therapeutic environment',
]

function getNextSundays(count) {
  const sundays = []
  const d = new Date(2026, 2, 31)
  for (let i = 0; i < 60 && sundays.length < count; i++) {
    const check = new Date(d)
    check.setDate(d.getDate() + i)
    if (check.getDay() === 0) {
      sundays.push(check.toISOString().slice(0, 10))
    }
  }
  return sundays
}

const NEXT_SUNDAYS = getNextSundays(6)

const statusColors = { pending: '#DD6B20', approved: '#1A7A4A', completed: 'var(--g500)', declined: '#E53E3E', cancelled: 'var(--g400)' }

export default function FamilyVisitRequests() {
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    patient: '',
    date: NEXT_SUNDAYS[0] || '',
    timeSlot: '12:00 PM',
    visitors: '1',
    children: 'None',
    requirements: [],
  })

  const relationship = user?.relationship || 'Family Member'

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: pats }, { data: visits }] = await Promise.all([getPatients(), getAllVisitations()])
    setPatients(pats || [])
    setRequests(visits || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const activePatients = activeBriefs(patients)
  const initialsFor = (pid) => initialsFromName(patients.find(p => p.id === pid)?.full_name)

  const handleRequirement = (req) => {
    if (req === 'None') {
      setForm(p => ({ ...p, requirements: p.requirements.includes('None') ? [] : ['None'] }))
      return
    }
    setForm(p => ({
      ...p,
      requirements: p.requirements.filter(r => r !== 'None').includes(req)
        ? p.requirements.filter(r => r !== req)
        : [...p.requirements.filter(r => r !== 'None'), req],
    }))
  }

  const handleSubmit = async () => {
    if (!form.patient || !form.date || !form.timeSlot) return
    setSaving(true)
    const notesParts = []
    if (form.children && form.children !== 'None') notesParts.push(`Children: ${form.children}`)
    const reqs = form.requirements.filter(r => r !== 'None')
    if (reqs.length) notesParts.push(`Requirements: ${reqs.join(', ')}`)
    const { error } = await addVisitation({
      patient_id: form.patient,
      visit_date: form.date,
      visit_time: form.timeSlot,
      visitors: form.visitors,
      notes: notesParts.join(' | ') || null,
      requested_by_name: user?.name || relationship,
      status: 'pending',
    })
    setSaving(false)
    if (error) { alert(error.message || 'Could not submit visit request'); return }
    setForm({ patient: '', date: NEXT_SUNDAYS[0] || '', timeSlot: '12:00 PM', visitors: '1', children: 'None', requirements: [] })
    setShowForm(false)
    load()
  }

  const pending = requests.filter(r => r.status === 'pending').length
  const approved = requests.filter(r => r.status === 'approved').length

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Visit Requests</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Request and manage your Sunday visitation appointments</p>
      </div>

      {/* Next Sunday highlight + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center', padding: 16, borderLeft: '4px solid var(--blue)' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--blue)' }}>{NEXT_SUNDAYS[0]}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Next Available Sunday</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: '#DD6B20' }}>{pending}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Pending Requests</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: '#1A7A4A' }}>{approved}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Approved Visits</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '.95rem', fontWeight: 700, color: 'var(--g700)' }}>{relationship}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Your Relationship</div>
        </div>
      </div>

      {/* Visitation Rules */}
      <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--gold)' }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 10, color: 'var(--gold)' }}>Visitation Rules</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 4 }}>
          {VISITATION_RULES.map((rule, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, marginTop: 6 }} />
              <span style={{ fontSize: '.78rem', color: 'var(--g700)' }}>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Request Form Toggle */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          style={{ marginBottom: 20, padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--blue)', color: '#fff', fontSize: '.86rem', fontWeight: 600, cursor: 'pointer' }}>
          Request a Visit
        </button>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 14 }}>Request a Visit</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: '.78rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Resident</label>
              <select value={form.patient} onChange={e => setForm(p => ({ ...p, patient: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.84rem' }}>
                <option value="">Select resident</option>
                {activePatients.map(p => <option key={p.id} value={p.id}>{p.initials}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.78rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Preferred Sunday</label>
              <select value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.84rem' }}>
                {NEXT_SUNDAYS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.78rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Time Slot</label>
              <select value={form.timeSlot} onChange={e => setForm(p => ({ ...p, timeSlot: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.84rem' }}>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.78rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Number of Visitors</label>
              <select value={form.visitors} onChange={e => setForm(p => ({ ...p, visitors: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.84rem' }}>
                {VISITOR_COUNTS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.78rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Children Accompanying</label>
              <select value={form.children} onChange={e => setForm(p => ({ ...p, children: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.84rem' }}>
                {CHILDREN_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '.78rem', color: 'var(--g500)', display: 'block', marginBottom: 6 }}>Special Requirements</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SPECIAL_REQUIREMENTS.map(req => (
                <label key={req} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.82rem', color: 'var(--g700)', cursor: 'pointer', padding: '4px 10px', borderRadius: 6, background: form.requirements.includes(req) ? '#E8F5E9' : 'var(--g50)' }}>
                  <input type="checkbox" checked={form.requirements.includes(req)} onChange={() => handleRequirement(req)} />
                  {req}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSubmit} disabled={saving}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--blue)', color: '#fff', fontSize: '.86rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Submitting…' : 'Submit Request'}
            </button>
            <button onClick={() => setShowForm(false)} disabled={saving}
              style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid var(--g200)', background: '#fff', color: 'var(--g600)', fontSize: '.86rem', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* My Requests */}
      <div className="card">
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 14 }}>My Requests</h3>
        {loading ? (
          <p style={{ fontSize: '.84rem', color: 'var(--g500)' }}>Loading…</p>
        ) : requests.length === 0 ? (
          <p style={{ fontSize: '.84rem', color: 'var(--g500)' }}>No visit requests yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {requests.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < requests.length - 1 ? '1px solid var(--g100)' : 'none', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: '.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: 'var(--blue)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: '.72rem' }}>{initialsFor(r.patient_id)}</span>
                    {r.visit_date} at {r.visit_time}
                  </div>
                  <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>{r.visitors} visitor(s) | Submitted: {r.created_at?.slice(0, 10) || '—'}</div>
                  {r.notes && (
                    <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>{r.notes}</div>
                  )}
                </div>
                <span style={{ fontSize: '.72rem', padding: '3px 12px', borderRadius: 12, background: (statusColors[r.status] || 'var(--g400)') + '18', color: statusColors[r.status], fontWeight: 600, textTransform: 'capitalize' }}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
