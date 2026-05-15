import React, { useEffect, useState } from 'react'
import { useNotif } from '../../App'
import { SERVICE_CATEGORIES, fmtNaira, listAllServices, upsertService } from '../../utils/outpatient'

const EMPTY = {
  slug: '', name: '', category: 'clinical', short_description: '', long_description: '',
  duration_minutes: '', price_ngn: '', practitioner_role: 'psychiatrist',
  requires_practitioner: true, conversion_eligible: false, conversion_window_days: '',
  sop_url: '', active: true, public: true, display_order: 100,
}

export default function OutpatientServices() {
  const notify = useNotif()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await listAllServices()
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const startEdit = r => setEditing({ ...EMPTY, ...r,
    duration_minutes: r.duration_minutes ?? '',
    price_ngn: r.price_ngn ?? '',
    conversion_window_days: r.conversion_window_days ?? '',
  })
  const startNew = () => setEditing({ ...EMPTY })
  const cancel = () => setEditing(null)

  const save = async () => {
    setSaving(true)
    const payload = { ...editing,
      duration_minutes: editing.duration_minutes ? parseInt(editing.duration_minutes, 10) : null,
      price_ngn: editing.price_ngn ? parseInt(editing.price_ngn, 10) : null,
      conversion_window_days: editing.conversion_window_days ? parseInt(editing.conversion_window_days, 10) : null,
      display_order: parseInt(editing.display_order, 10) || 100,
    }
    const { error } = await upsertService(payload)
    setSaving(false)
    if (error) { notify?.('Save failed', error.message || String(error), 'error'); return }
    notify?.('Service saved', editing.name, 'success')
    setEditing(null); load()
  }

  const toggleActive = async (r) => {
    await upsertService({ id: r.id, active: !r.active })
    load()
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <header style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>Outpatient</div>
          <h1 style={{ fontSize: '1.6rem', margin: '4px 0 0' }}>Services catalog</h1>
        </div>
        <button className="btn btn--primary" onClick={startNew}>+ Add service</button>
      </header>

      <div style={{ background: 'white', border: '1px solid #E5E9EE', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid #E5E9EE' }}>
              <th style={th(60)}>Order</th>
              <th style={th()}>Service</th>
              <th style={th()}>Category</th>
              <th style={th()}>Duration</th>
              <th style={th()}>Price</th>
              <th style={th()}>Active</th>
              <th style={th()}>Public</th>
              <th style={th()}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--g500)' }}>Loading…</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #EDF1F5' }}>
                <td style={td()}>{r.display_order}</td>
                <td style={td()}>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <code style={{ fontSize: '.75rem', color: 'var(--g500)' }}>{r.slug}</code>
                </td>
                <td style={td()}>{SERVICE_CATEGORIES.find(c => c.key === r.category)?.label || r.category}</td>
                <td style={td()}>{r.duration_minutes ? `${r.duration_minutes} min` : '—'}</td>
                <td style={td()}><strong>{fmtNaira(r.price_ngn)}</strong></td>
                <td style={td()}>
                  <button onClick={() => toggleActive(r)} style={{ ...pill(r.active ? '#1A7A4A' : '#7A8090') }}>
                    {r.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td style={td()}><span style={pill(r.public ? '#1A5FAD' : '#7A8090')}>{r.public ? 'Public' : 'Hidden'}</span></td>
                <td style={td()}><button className="btn btn--secondary btn--sm" onClick={() => startEdit(r)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={modalBg} onClick={cancel}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 14 }}>{editing.id ? 'Edit service' : 'New service'}</h2>
            <Grid>
              <F label="Name" v={editing.name} on={v => setEditing(p => ({ ...p, name: v }))} />
              <F label="Slug (URL)" v={editing.slug} on={v => setEditing(p => ({ ...p, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} />
              <S label="Category" v={editing.category} on={v => setEditing(p => ({ ...p, category: v }))} options={SERVICE_CATEGORIES.map(c => [c.key, c.label])} />
              <F label="Practitioner role" v={editing.practitioner_role || ''} on={v => setEditing(p => ({ ...p, practitioner_role: v }))} placeholder="psychiatrist, psychologist, counsellor…" />
              <F label="Duration (min)" v={editing.duration_minutes} on={v => setEditing(p => ({ ...p, duration_minutes: v }))} type="number" />
              <F label="Price (NGN)" v={editing.price_ngn} on={v => setEditing(p => ({ ...p, price_ngn: v }))} type="number" placeholder="e.g. 150000" />
              <F label="Display order" v={editing.display_order} on={v => setEditing(p => ({ ...p, display_order: v }))} type="number" />
              <F label="Conversion window (days)" v={editing.conversion_window_days} on={v => setEditing(p => ({ ...p, conversion_window_days: v }))} type="number" placeholder="Only if conversion-eligible" />
            </Grid>
            <T label="Short description" v={editing.short_description} on={v => setEditing(p => ({ ...p, short_description: v }))} rows={2} />
            <T label="Long description" v={editing.long_description} on={v => setEditing(p => ({ ...p, long_description: v }))} rows={4} />
            <F label="SOP URL" v={editing.sop_url || ''} on={v => setEditing(p => ({ ...p, sop_url: v }))} placeholder="https://… (optional)" />
            <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
              <Chk label="Active" v={editing.active} on={v => setEditing(p => ({ ...p, active: v }))} />
              <Chk label="Public" v={editing.public} on={v => setEditing(p => ({ ...p, public: v }))} />
              <Chk label="Conversion-eligible" v={editing.conversion_eligible} on={v => setEditing(p => ({ ...p, conversion_eligible: v }))} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button className="btn btn--secondary" onClick={cancel}>Cancel</button>
              <button className="btn btn--primary" disabled={saving || !editing.name || !editing.slug} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const F = ({ label, v, on, type = 'text', placeholder }) => (
  <div><label style={lbl}>{label}</label><input value={v ?? ''} onChange={e => on(e.target.value)} type={type} placeholder={placeholder} style={inp} /></div>
)
const T = ({ label, v, on, rows }) => (
  <div style={{ marginTop: 10 }}><label style={lbl}>{label}</label><textarea value={v ?? ''} rows={rows} onChange={e => on(e.target.value)} style={inp} /></div>
)
const S = ({ label, v, on, options }) => (
  <div><label style={lbl}>{label}</label><select value={v} onChange={e => on(e.target.value)} style={inp}>{options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
)
const Chk = ({ label, v, on }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.9rem' }}>
    <input type="checkbox" checked={!!v} onChange={e => on(e.target.checked)} />{label}
  </label>
)
const Grid = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>

const th = w => ({ textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: '.76rem', color: 'var(--g700)', textTransform: 'uppercase', letterSpacing: '.04em', width: w })
const td = () => ({ padding: '11px 12px', verticalAlign: 'top' })
const lbl = { display: 'block', fontSize: '.76rem', fontWeight: 600, color: 'var(--charcoal)', marginBottom: 4 }
const inp = { width: '100%', padding: '8px 10px', border: '1px solid #DDE3EA', borderRadius: 5, fontSize: '.88rem', fontFamily: 'inherit' }
const pill = color => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 12, background: `${color}1A`, color, fontSize: '.74rem', fontWeight: 600, border: 0, cursor: 'pointer' })
const modalBg = { position: 'fixed', inset: 0, background: 'rgba(15,42,74,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
const modal = { background: 'white', borderRadius: 10, padding: 28, maxWidth: 720, width: '92%', maxHeight: '92vh', overflow: 'auto' }
