import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotif } from '../../App'
import {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  fmtNaira,
  listBookings,
  bulkUpdateBookings,
  exportBookingsCSV,
  downloadCSV,
} from '../../utils/outpatient'

export default function OutpatientBookings() {
  const notify = useNotif()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(['pending_payment', 'confirmed', 'checked_in'])
  const [sort, setSort] = useState('scheduled_at.desc')

  const [selected, setSelected] = useState(new Set())
  const [bulkAction, setBulkAction] = useState('')
  const [working, setWorking] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await listBookings({
      search: search || undefined,
      statuses: statusFilter.length === BOOKING_STATUSES.length ? undefined : statusFilter,
      sort,
    })
    setLoading(false)
    if (error) { setError(error.message || String(error)); return }
    setError('')
    setRows(data || [])
    setSelected(new Set())
  }

  useEffect(() => { load() }, [sort, JSON.stringify(statusFilter)])

  const counts = useMemo(() => {
    const c = Object.fromEntries(BOOKING_STATUSES.map(s => [s.key, 0]))
    rows.forEach(r => { if (c[r.status] != null) c[r.status]++ })
    return c
  }, [rows])

  const toggleStatus = k => setStatusFilter(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k])
  const toggleRow = id => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map(r => r.id)))

  const handleBulk = async () => {
    if (!bulkAction || selected.size === 0) return
    if (!confirm(`Set ${selected.size} booking(s) to ${BOOKING_STATUSES.find(s => s.key === bulkAction)?.label}?`)) return
    setWorking(true)
    const { error } = await bulkUpdateBookings(Array.from(selected), { status: bulkAction })
    setWorking(false)
    if (error) { notify?.('Bulk update failed', error.message || String(error), 'error'); return }
    notify?.('Updated', `${selected.size} booking(s) updated.`, 'success')
    setBulkAction(''); load()
  }

  const handleExport = () => {
    const csv = exportBookingsCSV(rows)
    downloadCSV(csv, `outpatient_bookings_${new Date().toISOString().slice(0,10)}.csv`)
  }

  const fmtDT = iso => iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div style={{ padding: '24px 28px' }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>Outpatient</div>
        <h1 style={{ fontSize: '1.6rem', margin: '4px 0 4px' }}>Bookings</h1>
        <p style={{ fontSize: '.9rem', color: 'var(--g700)', margin: 0 }}>{rows.length} booking{rows.length === 1 ? '' : 's'} matching current filters.</p>
      </header>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {BOOKING_STATUSES.map(s => {
          const active = statusFilter.includes(s.key)
          return (
            <button key={s.key} onClick={() => toggleStatus(s.key)} style={{
              background: active ? s.color : 'transparent',
              border: `1px solid ${active ? s.color : '#DDE3EA'}`,
              color: active ? 'white' : 'var(--g700)',
              padding: '6px 12px', borderRadius: 6, fontSize: '.82rem', fontWeight: 600, cursor: 'pointer',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {!active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />}
                {s.label} <span style={{ opacity: .65, fontWeight: 500 }}>({counts[s.key] || 0})</span>
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <form onSubmit={e => { e.preventDefault(); load() }} style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Search reference, patient name, booker name/email, phone…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #DDE3EA', borderRadius: 6, fontSize: '.9rem' }} />
          <button type="submit" className="btn btn--secondary btn--sm">Search</button>
        </form>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #DDE3EA', borderRadius: 6, fontSize: '.85rem' }}>
          <option value="scheduled_at.desc">Date — newest</option>
          <option value="scheduled_at.asc">Date — oldest</option>
          <option value="created_at.desc">Recently booked</option>
          <option value="patient_name.asc">Patient A–Z</option>
        </select>
        <button className="btn btn--secondary btn--sm" onClick={handleExport} disabled={rows.length === 0}>Export CSV</button>
        <button className="btn btn--primary btn--sm" onClick={load}>Refresh</button>
      </div>

      {selected.size > 0 && (
        <div style={{ background: '#F0F5FB', border: '1px solid rgba(26,95,173,.2)', borderRadius: 6, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <strong style={{ fontSize: '.88rem' }}>{selected.size} selected</strong>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #DDE3EA', borderRadius: 4, fontSize: '.85rem' }}>
            <option value="">Bulk action…</option>
            <option value="confirmed">Mark Confirmed</option>
            <option value="checked_in">Mark Checked In</option>
            <option value="completed">Mark Completed</option>
            <option value="no_show">Mark No-show</option>
            <option value="cancelled">Cancel</option>
            <option value="rescheduled">Mark Rescheduled</option>
          </select>
          <button className="btn btn--primary btn--sm" disabled={!bulkAction || working} onClick={handleBulk}>{working ? '…' : 'Apply'}</button>
          <button className="btn btn--secondary btn--sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {error && <div style={{ background: '#FFF0F0', border: '1px solid rgba(139,42,42,.3)', color: '#6B2020', padding: '10px 14px', borderRadius: 6, marginBottom: 12, fontSize: '.88rem' }}>{error}</div>}

      <div style={{ background: 'white', border: '1px solid #E5E9EE', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid #E5E9EE' }}>
              <th style={th(40)}><input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} /></th>
              <th style={th()}>Ref</th>
              <th style={th()}>Status</th>
              <th style={th()}>Payment</th>
              <th style={th()}>Date/time</th>
              <th style={th()}>Service</th>
              <th style={th()}>Patient</th>
              <th style={th()}>Booker</th>
              <th style={th()}>Practitioner</th>
              <th style={th()}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--g500)' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--g500)' }}>No bookings match.</td></tr>
            ) : rows.map(r => {
              const s = BOOKING_STATUSES.find(x => x.key === r.status) || BOOKING_STATUSES[0]
              const p = PAYMENT_STATUSES.find(x => x.key === r.payment_status) || PAYMENT_STATUSES[0]
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #EDF1F5' }}>
                  <td style={td()}><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} /></td>
                  <td style={td()}><code style={{ fontSize: '.82rem', color: 'var(--blue)', fontWeight: 600 }}>{r.reference_code}</code></td>
                  <td style={td()}><Pill it={s} /></td>
                  <td style={td()}><Pill it={p} /></td>
                  <td style={td()}>{fmtDT(r.scheduled_at)}</td>
                  <td style={td()}>{r.outpatient_services?.name || '—'}</td>
                  <td style={td()}>
                    <div style={{ fontWeight: 600 }}>{r.patient_name}</div>
                    <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>{r.patient_phone}</div>
                  </td>
                  <td style={td()}>
                    <div>{r.booker_name}</div>
                    <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>{r.booker_email}</div>
                  </td>
                  <td style={td()}>{r.outpatient_practitioners?.full_name || <span style={{ color: 'var(--g500)', fontStyle: 'italic' }}>Next available</span>}</td>
                  <td style={td()}><Link to={`/dashboard/outpatient/bookings/${r.id}`} className="btn btn--secondary btn--sm">Open</Link></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Pill({ it }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 12,
      background: `${it.color}18`, color: it.color,
      fontSize: '.76rem', fontWeight: 600,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: it.color }} />
      {it.label}
    </span>
  )
}

const th = w => ({ textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: '.76rem', color: 'var(--g700)', textTransform: 'uppercase', letterSpacing: '.04em', width: w })
const td = () => ({ padding: '11px 12px', verticalAlign: 'top' })
