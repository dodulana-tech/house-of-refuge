import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isSupabaseReady } from '../../utils/supabase'
import {
  CLIENT_STATUSES, FOLLOW_UP_STATUSES, RISK_FLAGS,
  colorOf, labelOf, initialsFrom, isOverdue,
  listClients, listFollowUpsDue, listOpenRiskFlags, setFollowUpStatus, createClient,
} from '../../utils/outpatientClinical'
import Pill from '../../components/Pill'
import { requireFields } from '../../utils/formGuard'

/*
  Outpatient clients, plus the two queues that fall out of documenting them:
  follow-ups owed, and risk concerns still open. A client here is a person who
  has been seen outpatient; they are deliberately not `patients` rows, which are
  residential admissions with beds, phases, and a day-in-programme.
*/

const TABS = [
  { key: 'clients',   label: 'Clients',        path: '/clients' },
  { key: 'followups', label: 'Follow-ups due', path: '/follow-ups' },
  { key: 'risk',      label: 'Open risk',      path: '/risk' },
]

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—'

export default function OutpatientClients() {
  const ready = isSupabaseReady()
  const nav = useNavigate()
  const { pathname } = useLocation()
  // /outpatient/clients, /outpatient/follow-ups, /outpatient/risk — one route per
  // tab so exactly one sidebar entry highlights.
  const tab = TABS.find(t => pathname.endsWith(t.path))?.key || 'clients'

  const [clients, setClients] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newClient, setNewClient] = useState({ full_name: '', phone: '', email: '', age: '', primary_concern: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!ready) { setLoading(false); return }
    setLoading(true)
    const [c, f, r] = await Promise.all([
      listClients({ statuses: statusFilter ? [statusFilter] : undefined }),
      listFollowUpsDue({ within: 60 }),
      listOpenRiskFlags(),
    ])
    setClients(c.data || [])
    setFollowUps(f.data || [])
    setRisks(r.data || [])
    setLoading(false)
  }, [ready, statusFilter])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return clients
    return clients.filter(c =>
      [c.full_name, c.client_code, c.phone, c.email].some(v => (v || '').toLowerCase().includes(s)))
  }, [clients, search])

  const overdue = followUps.filter(f => isOverdue(f.follow_up_at)).length

  const addClient = async () => {
    if (!requireFields([[newClient.full_name, 'Full name']])) return
    setSaving(true)
    const { error } = await createClient({
      full_name: newClient.full_name.trim(),
      phone: newClient.phone || null,
      email: newClient.email || null,
      age: newClient.age ? parseInt(newClient.age, 10) : null,
      primary_concern: newClient.primary_concern || null,
    })
    setSaving(false)
    if (error) {
      alert(error.code === '23505'
        ? 'A client with that name and phone number already exists. Search for them instead.'
        : `Could not create client: ${error.message}`)
      return
    }
    setNewClient({ full_name: '', phone: '', email: '', age: '', primary_concern: '' })
    setShowNew(false)
    load()
  }

  const closeFollowUp = async (id, status) => {
    const { error } = await setFollowUpStatus(id, status)
    if (error) { alert(`Could not update: ${error.message}`); return }
    load()
  }

  if (!ready) {
    return (
      <div>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 8 }}>Outpatient Clients</h1>
        <div className="card" style={{ padding: 20, color: 'var(--g500)', fontSize: '.9rem' }}>
          Live data is unavailable — Supabase is not configured for this environment.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Outpatient Clients</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
            {clients.length} client{clients.length === 1 ? '' : 's'} · {followUps.length} follow-up{followUps.length === 1 ? '' : 's'} due
            {overdue > 0 && <span style={{ color: '#8B2A2A', fontWeight: 700 }}> ({overdue} overdue)</span>}
            {risks.length > 0 && <span style={{ color: '#8B2A2A', fontWeight: 700 }}> · {risks.length} open risk</span>}
          </p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setShowNew(!showNew)}>
          {showNew ? 'Cancel' : 'New client'}
        </button>
      </div>

      {showNew && (
        <div className="card" style={{ padding: 22, marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 4 }}>New outpatient client</h3>
          <p style={{ fontSize: '.82rem', color: 'var(--g500)', marginBottom: 14 }}>
            For a walk-in or phone referral with no booking. Bookings create their client record automatically at check-in.
          </p>
          <div className="frow">
            <div className="fg"><label className="flabel">Full name *</label>
              <input className="fi" value={newClient.full_name} onChange={e => setNewClient(p => ({ ...p, full_name: e.target.value }))} /></div>
            <div className="fg"><label className="flabel">Phone</label>
              <input className="fi" value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} /></div>
          </div>
          <div className="frow">
            <div className="fg"><label className="flabel">Email</label>
              <input className="fi" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="fg"><label className="flabel">Age</label>
              <input className="fi" type="number" value={newClient.age} onChange={e => setNewClient(p => ({ ...p, age: e.target.value }))} /></div>
          </div>
          <div className="fg"><label className="flabel">Primary concern</label>
            <input className="fi" value={newClient.primary_concern} onChange={e => setNewClient(p => ({ ...p, primary_concern: e.target.value }))} /></div>
          <button className="btn btn--primary btn--sm" onClick={addClient} disabled={saving || !newClient.full_name.trim()}>
            {saving ? 'Creating…' : 'Create client'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid #E5E9EE', flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const count = t.key === 'followups' ? followUps.length : t.key === 'risk' ? risks.length : clients.length
          const active = tab === t.key
          return (
            <button key={t.key}
              onClick={() => nav(`/dashboard/outpatient${t.path}`)}
              style={{
                padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '.88rem', fontWeight: active ? 700 : 500, fontFamily: 'inherit',
                color: active ? 'var(--blue)' : 'var(--g500)',
                borderBottom: `2px solid ${active ? 'var(--blue)' : 'transparent'}`, marginBottom: -1,
              }}>
              {t.label} {count > 0 && <span style={{ opacity: .7 }}>({count})</span>}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--g500)', fontSize: '.9rem' }}>Loading…</div>
      ) : tab === 'clients' ? (
        <>
          <div className="card" style={{ padding: '14px 20px', marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '2 1 220px' }}>
                <label className="flabel">Search</label>
                <input className="fi" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, code, phone, or email" />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label className="flabel">Status</label>
                <select className="fi" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  {CLIENT_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--g500)', fontSize: '.9rem' }}>
              No clients match.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.87rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--g500)', fontSize: '.71rem', textTransform: 'uppercase', letterSpacing: '.06em', background: '#F8FAFC' }}>
                    <th style={th}>Client</th><th style={th}>Contact</th><th style={th}>First seen</th>
                    <th style={th}>Last seen</th><th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} style={{ borderTop: '1px solid #EEF1F5' }}>
                      <td style={td}>
                        <Link to={`/dashboard/outpatient/clients/${c.id}`} style={{ display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none' }}>
                          <span style={{
                            width: 34, height: 34, borderRadius: 7, background: 'rgba(26,95,173,.09)', color: 'var(--blue)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.72rem', flexShrink: 0,
                          }}>{initialsFrom(c.full_name)}</span>
                          <span>
                            <span style={{ display: 'block', fontWeight: 600, color: 'var(--charcoal)' }}>{c.full_name}</span>
                            <code style={{ fontSize: '.75rem', color: 'var(--g500)' }}>{c.client_code}</code>
                          </span>
                        </Link>
                      </td>
                      <td style={td}>
                        <div>{c.phone || '—'}</div>
                        {c.email && <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>{c.email}</div>}
                      </td>
                      <td style={td}>{fmtDate(c.first_seen_at)}</td>
                      <td style={td}>{fmtDate(c.last_seen_at)}</td>
                      <td style={td}><Pill small text={labelOf(CLIENT_STATUSES, c.status)} color={colorOf(CLIENT_STATUSES, c.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : tab === 'followups' ? (
        <div className="card" style={{ padding: '18px 20px' }}>
          <p style={{ fontSize: '.84rem', color: 'var(--g500)', marginBottom: 14 }}>
            Follow-ups a clinician committed to in a signed note. They stay here until someone closes them, so nobody drops off after one visit.
          </p>
          {followUps.length === 0 ? (
            <div style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Nothing due in the next 60 days.</div>
          ) : followUps.map(e => (
            <div key={e.id} style={{ borderTop: '1px solid #EEF1F5', padding: '12px 0', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link to={`/dashboard/outpatient/clients/${e.client_id}`} style={{ fontWeight: 600 }}>
                    {e.outpatient_clients?.full_name || 'Client'}
                  </Link>
                  <Pill small
                    text={isOverdue(e.follow_up_at) ? `Overdue since ${fmtDate(e.follow_up_at)}` : `Due ${fmtDate(e.follow_up_at)}`}
                    color={isOverdue(e.follow_up_at) ? '#8B2A2A' : '#C08A30'} />
                  <Pill small text={labelOf(FOLLOW_UP_STATUSES, e.follow_up_status)} color={colorOf(FOLLOW_UP_STATUSES, e.follow_up_status)} />
                </div>
                <div style={{ fontSize: '.82rem', color: 'var(--g700)', marginTop: 4 }}>
                  {e.follow_up_notes || e.plan || 'No follow-up note recorded.'}
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--g500)', marginTop: 2 }}>
                  From the note of {fmtDate(e.encounter_date)} · {e.outpatient_clients?.phone || 'no phone on record'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {e.follow_up_status !== 'booked' && (
                  <button className="btn btn--secondary btn--sm" onClick={() => closeFollowUp(e.id, 'booked')}>Booked</button>
                )}
                <button className="btn btn--secondary btn--sm" onClick={() => closeFollowUp(e.id, 'completed')}>Done</button>
                <button className="btn btn--secondary btn--sm" onClick={() => closeFollowUp(e.id, 'declined')}>Declined</button>
                <button className="btn btn--secondary btn--sm" onClick={() => closeFollowUp(e.id, 'lost_to_follow_up')}>Lost</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '18px 20px' }}>
          <p style={{ fontSize: '.84rem', color: 'var(--g500)', marginBottom: 14 }}>
            Risk flagged at moderate or above in a signed outpatient note. These also appear on the Safeguarding dashboard for the DSL.
          </p>
          {risks.length === 0 ? (
            <div style={{ fontSize: '.88rem', color: 'var(--g500)' }}>No open risk concerns.</div>
          ) : risks.map(e => (
            <div key={e.id} style={{ borderTop: '1px solid #EEF1F5', padding: '12px 0' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Link to={`/dashboard/outpatient/clients/${e.client_id}`} style={{ fontWeight: 600 }}>
                  {e.outpatient_clients?.full_name || 'Client'}
                </Link>
                <Pill small text={labelOf(RISK_FLAGS, e.risk_flag)} color={colorOf(RISK_FLAGS, e.risk_flag)} />
                <span style={{ fontSize: '.79rem', color: 'var(--g500)' }}>{fmtDate(e.encounter_date)} · {e.signed_by_name || '—'}</span>
              </div>
              <div style={{ fontSize: '.85rem', color: 'var(--charcoal)', marginTop: 5, whiteSpace: 'pre-wrap' }}>{e.risk_notes}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const th = { padding: '10px 14px', fontWeight: 700 }
const td = { padding: '11px 14px', color: 'var(--charcoal)', verticalAlign: 'top' }
