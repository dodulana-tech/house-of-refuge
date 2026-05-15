import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotif } from '../../App'
import {
  FA_STATUSES,
  listFinancialAssistance,
  bulkUpdateFAStatus,
  exportFinancialAssistanceCSV,
  downloadCSV,
} from '../../utils/financialAssistance'

const ALL_STATUSES = FA_STATUSES.map(s => s.key)

export default function FinancialAssistanceList() {
  const { user } = useAuth()
  const notify = useNotif()
  const nav = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(['submitted', 'under_review', 'more_info_needed'])
  const [sort, setSort] = useState('submitted_at.desc')

  const [selected, setSelected] = useState(new Set())
  const [bulkAction, setBulkAction] = useState('')
  const [working, setWorking] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await listFinancialAssistance({
      search: search || undefined,
      statuses: statusFilter.length === ALL_STATUSES.length ? undefined : statusFilter,
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
    const c = Object.fromEntries(ALL_STATUSES.map(k => [k, 0]))
    rows.forEach(r => { if (c[r.status] != null) c[r.status]++ })
    return c
  }, [rows])

  const toggleStatus = (key) => {
    setStatusFilter(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const toggleRow = (id) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set())
    else setSelected(new Set(rows.map(r => r.id)))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    load()
  }

  const handleBulk = async () => {
    if (!bulkAction || selected.size === 0) return
    if (!confirm(`Set ${selected.size} application(s) to ${FA_STATUSES.find(s => s.key === bulkAction).label}?`)) return
    setWorking(true)
    const ids = Array.from(selected)
    const { error } = await bulkUpdateFAStatus(ids, bulkAction, user?.id)
    setWorking(false)
    if (error) { notify?.('Bulk update failed', error.message || String(error), 'error'); return }
    notify?.('Updated', `${ids.length} application(s) set to ${FA_STATUSES.find(s => s.key === bulkAction).label}.`, 'success')
    setBulkAction('')
    load()
  }

  const handleExport = () => {
    const csv = exportFinancialAssistanceCSV(rows)
    const ts = new Date().toISOString().slice(0, 10)
    downloadCSV(csv, `financial_assistance_${ts}.csv`)
  }

  const fmtDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const incomeLabel = (band) => {
    const map = {
      under_100k: '<100k', '100k_300k': '100–300k', '300k_500k': '300–500k',
      '500k_1m': '500k–1M', '1m_plus': '>1M', unemployed: 'Unemployed',
    }
    return map[band] || band || '—'
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>Freedom Foundation review</div>
        <h1 style={{ fontSize: '1.6rem', margin: '4px 0 4px' }}>Financial Assistance Applications</h1>
        <p style={{ fontSize: '.9rem', color: 'var(--g700)', margin: 0 }}>{rows.length} application{rows.length === 1 ? '' : 's'} matching current filters.</p>
      </header>

      {/* Status chip filters with counts */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {FA_STATUSES.map(s => {
          const active = statusFilter.includes(s.key)
          return (
            <button key={s.key}
              onClick={() => toggleStatus(s.key)}
              style={{
                background: active ? s.color : 'transparent',
                border: `1px solid ${active ? s.color : '#DDE3EA'}`,
                color: active ? 'white' : 'var(--g700)',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: '.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {!active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />}
                {s.label} <span style={{ opacity: .65, fontWeight: 500 }}>({counts[s.key] || 0})</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Controls row: search, sort, export */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Search by reference, applicant name, email, phone, patient name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #DDE3EA', borderRadius: 6, fontSize: '.9rem' }}
          />
          <button type="submit" className="btn btn--secondary btn--sm">Search</button>
        </form>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #DDE3EA', borderRadius: 6, fontSize: '.85rem' }}>
          <option value="submitted_at.desc">Newest first</option>
          <option value="submitted_at.asc">Oldest first</option>
          <option value="updated_at.desc">Recently updated</option>
          <option value="applicant_name.asc">Name A–Z</option>
        </select>
        <button className="btn btn--secondary btn--sm" onClick={handleExport} disabled={rows.length === 0}>Export CSV</button>
        <button className="btn btn--primary btn--sm" onClick={load}>Refresh</button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div style={{ background: '#F0F5FB', border: '1px solid rgba(26,95,173,.2)', borderRadius: 6, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <strong style={{ fontSize: '.88rem' }}>{selected.size} selected</strong>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #DDE3EA', borderRadius: 4, fontSize: '.85rem' }}>
            <option value="">Bulk action…</option>
            <option value="under_review">Set to Under Review</option>
            <option value="more_info_needed">Set to More Info Needed</option>
            <option value="approved">Approve</option>
            <option value="declined">Decline</option>
            <option value="withdrawn">Mark Withdrawn</option>
          </select>
          <button className="btn btn--primary btn--sm" disabled={!bulkAction || working} onClick={handleBulk}>{working ? 'Working…' : 'Apply'}</button>
          <button className="btn btn--secondary btn--sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {error && (
        <div style={{ background: '#FFF0F0', border: '1px solid rgba(139,42,42,.3)', color: '#6B2020', padding: '10px 14px', borderRadius: 6, marginBottom: 12, fontSize: '.88rem' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #E5E9EE', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid #E5E9EE' }}>
              <th style={th(40)}>
                <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} />
              </th>
              <th style={th()}>Ref</th>
              <th style={th()}>Status</th>
              <th style={th()}>Applicant</th>
              <th style={th()}>Patient</th>
              <th style={th()}>Income</th>
              <th style={th()}>Referrer</th>
              <th style={th()}>Submitted</th>
              <th style={th()}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--g500)' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--g500)' }}>No applications match.</td></tr>
            ) : rows.map(r => {
              const s = FA_STATUSES.find(x => x.key === r.status) || FA_STATUSES[0]
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #EDF1F5' }}>
                  <td style={td()}><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} /></td>
                  <td style={td()}><code style={{ fontSize: '.82rem', color: 'var(--blue)', fontWeight: 600 }}>{r.reference_code}</code></td>
                  <td style={td()}><StatusPill status={s} /></td>
                  <td style={td()}>
                    <div style={{ fontWeight: 600 }}>{r.applicant_name}</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>{r.applicant_email}</div>
                  </td>
                  <td style={td()}>
                    <div>{r.patient_name}</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>{r.patient_substance}{r.patient_age ? ` · ${r.patient_age}y` : ''}</div>
                  </td>
                  <td style={td()}>{incomeLabel(r.monthly_income_band)}</td>
                  <td style={td()}>
                    <div style={{ fontSize: '.82rem' }}>{r.pastoral_referrer_name || '—'}</div>
                    <div style={{ fontSize: '.74rem', color: 'var(--g500)' }}>{r.pastoral_referrer_org || ''}</div>
                  </td>
                  <td style={td()}>{fmtDate(r.submitted_at)}</td>
                  <td style={td()}>
                    <Link to={`/dashboard/financial-assistance/${r.id}`} className="btn btn--secondary btn--sm">Review</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusPill({ status }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 12,
      background: `${status.color}18`,
      color: status.color, fontSize: '.76rem', fontWeight: 600,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.color }} />
      {status.label}
    </span>
  )
}

const th = (w) => ({
  textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: '.78rem',
  color: 'var(--g700)', textTransform: 'uppercase', letterSpacing: '.04em',
  width: w,
})
const td = () => ({ padding: '12px', verticalAlign: 'top' })
