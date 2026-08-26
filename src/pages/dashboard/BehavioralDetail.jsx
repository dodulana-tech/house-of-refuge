import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { isSupabaseReady, getIncident, updateIncident, getIncidents, getPatients } from '../../utils/supabase'
import { initialsFromName } from '../../utils/patients'
import { requireFields } from '../../utils/formGuard'

const tierConfig = {
  1: { label: 'Tier 1 — Minor', color: '#D69E2E', bg: 'rgba(214,158,46,.1)' },
  2: { label: 'Tier 2 — Major', color: '#DD6B20', bg: 'rgba(221,107,32,.1)' },
  3: { label: 'Tier 3 — Motivational', color: '#E53E3E', bg: 'rgba(229,62,62,.1)' },
}

const fmtDate = (ts) => (ts ? String(ts).slice(0, 10) : '—')

export default function BehavioralDetail() {
  const { id } = useParams()

  const [incident, setIncident] = useState(null)
  const [patientsById, setPatientsById] = useState({})
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const [status, setStatus] = useState('open')
  const [response, setResponse] = useState('')
  const [escalationNotes, setEscalationNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      if (!isSupabaseReady()) { if (active) setLoading(false); return }
      setLoading(true)
      const [{ data: inc }, { data: patients }, { data: allInc }] = await Promise.all([
        getIncident(id),
        getPatients(),
        getIncidents(),
      ])
      if (!active) return
      const map = {}
      for (const p of patients || []) map[p.id] = p
      setPatientsById(map)
      setIncident(inc || null)
      if (inc) {
        setStatus(inc.status || 'open')
        setResponse(inc.response || '')
        setHistory(
          (allInc || [])
            .filter(i => i.patient_id === inc.patient_id && i.id !== inc.id)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        )
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [id])

  const persist = async (updates) => {
    setSaving(true)
    const { data, error } = await updateIncident(incident.id, updates)
    setSaving(false)
    if (error) { alert('Could not save changes: ' + (error.message || 'unknown error')); return }
    setIncident(data)
    setStatus(data.status || 'open')
    setResponse(data.response || '')
    setEscalationNotes('')
  }

  const composeResponse = () => {
    if (!requireFields([[escalationNotes, 'Escalation notes']])) return
    const note = escalationNotes.trim()
    if (!note) return response
    const stamp = fmtDate(new Date().toISOString())
    return [response.trim(), `Escalation note (${stamp}): ${note}`].filter(Boolean).join('\n\n')
  }

  const handleSaveResponse = () => persist({ status, response })
  const handleSaveNote = () => persist({ response: composeResponse() })
  const handleEscalate = () => persist({ status: 'escalated', response: composeResponse() })

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Link to="/dashboard/behavioral" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: '.88rem', fontWeight: 600 }}>
          &larr; Back to Behavioral Management
        </Link>
        <div style={{ marginTop: 40, textAlign: 'center', color: 'var(--g500)' }}>Loading incident record…</div>
      </div>
    )
  }

  if (!incident) {
    return (
      <div style={{ padding: 24 }}>
        <Link to="/dashboard/behavioral" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: '.88rem', fontWeight: 600 }}>
          &larr; Back to Behavioral Management
        </Link>
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--fd)', color: 'var(--g500)' }}>Incident record not found</h2>
        </div>
      </div>
    )
  }

  const cfg = tierConfig[incident.tier] || tierConfig[1]
  const patient = patientsById[incident.patient_id]
  const patientInitials = patient ? initialsFromName(patient.full_name) : '—'
  const statusColor = status === 'resolved' ? '#1A7A4A' : status === 'escalated' ? '#E53E3E' : '#DD6B20'
  const statusBg = status === 'resolved' ? 'rgba(26,122,74,.1)' : status === 'escalated' ? 'rgba(229,62,62,.1)' : 'rgba(221,107,32,.1)'

  return (
    <div>
      <Link to="/dashboard/behavioral" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: '.88rem', fontWeight: 600 }}>
        &larr; Back to Behavioral Management
      </Link>

      {/* Header */}
      <div style={{ marginTop: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Incident Report — {patientInitials}</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>3-Tier Behavioral Management System</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: '.72rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: '.72rem', fontWeight: 700, background: statusBg, color: statusColor }}>
            {status}
          </span>
        </div>
      </div>

      {/* Incident Details */}
      <div className="card" style={{ padding: 18, marginBottom: 16, borderLeft: `4px solid ${cfg.color}` }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Incident Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, fontSize: '.84rem', marginBottom: 14 }}>
          {[
            ['Patient', patientInitials],
            ['Date', fmtDate(incident.created_at)],
            ['Tier', cfg.label],
            ['Offense Type', incident.type || '—'],
            ['Reported By', incident.reported_by || '—'],
            ['Status', status],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 2 }}>{label}</div>
              <div style={{ color: 'var(--g700)' }}>{value}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 4 }}>Full Description</div>
          <div style={{ fontSize: '.84rem', color: 'var(--g600)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{incident.description || '—'}</div>
        </div>
      </div>

      {/* Response & Action */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Response &amp; Action</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '.84rem' }}>
          <div>
            <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 4 }}>Response Taken</div>
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              rows={4}
              placeholder="Describe the response and action taken…"
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', marginBottom: 4 }}>Status</div>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }}>
                <option value="open">open</option>
                <option value="resolved">resolved</option>
                <option value="escalated">escalated</option>
              </select>
            </div>
            <button
              onClick={handleSaveResponse}
              disabled={saving}
              style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--blue)', color: '#fff', cursor: saving ? 'default' : 'pointer', fontWeight: 700, fontSize: '.78rem', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save Response'}
            </button>
          </div>
        </div>
      </div>

      {/* Escalation Notes */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Escalation Notes</h3>
        <textarea
          value={escalationNotes}
          onChange={e => setEscalationNotes(e.target.value)}
          rows={5}
          placeholder="Add escalation notes, observations, or rationale for tier adjustment…"
          style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleSaveNote}
            disabled={saving}
            style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: 'var(--blue)', color: '#fff', cursor: (saving || !escalationNotes.trim()) ? 'default' : 'pointer', fontWeight: 700, fontSize: '.78rem', opacity: (saving || !escalationNotes.trim()) ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save Notes'}
          </button>
          <button
            onClick={handleEscalate}
            disabled={saving}
            style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #E53E3E', background: '#fff', color: '#E53E3E', cursor: saving ? 'default' : 'pointer', fontWeight: 700, fontSize: '.78rem', opacity: saving ? 0.6 : 1 }}>
            Escalate Incident
          </button>
        </div>
      </div>

      {/* Patient Incident History */}
      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 12 }}>Patient Incident History — {patientInitials}</h3>
        {history.length === 0 ? (
          <div style={{ fontSize: '.84rem', color: 'var(--g400)' }}>No previous incidents on record.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {history.map((h, i) => {
              const hcfg = tierConfig[h.tier] || tierConfig[1]
              return (
                <div key={h.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderTop: i > 0 ? '1px solid var(--g100)' : 'none',
                  fontSize: '.82rem', flexWrap: 'wrap', gap: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--g400)', minWidth: 80 }}>{fmtDate(h.created_at)}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: '.66rem', fontWeight: 700, background: hcfg.bg, color: hcfg.color }}>
                      {hcfg.label}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--g700)' }}>{h.type}</span>
                  </div>
                  <span style={{ color: 'var(--g500)', fontSize: '.78rem' }}>{h.response}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
