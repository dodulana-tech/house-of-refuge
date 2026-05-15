import React, { useEffect, useState } from 'react'
import { useNotif } from '../../App'
import { listAllPractitioners, upsertPractitioner } from '../../utils/outpatient'

const EMPTY = {
  full_name: '', title: '', role_type: 'visiting', specialties: [], short_bio: '',
  photo_url: '', registration_number: '', email: '', phone: '',
  public: true, active: true, display_order: 100,
}

export default function OutpatientPractitioners() {
  const notify = useNotif()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await listAllPractitioners()
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const startEdit = r => setEditing({ ...EMPTY, ...r, specialties: r.specialties || [] })
  const startNew = () => setEditing({ ...EMPTY })

  const save = async () => {
    setSaving(true)
    const payload = { ...editing, display_order: parseInt(editing.display_order, 10) || 100 }
    const { error } = await upsertPractitioner(payload)
    setSaving(false)
    if (error) { notify?.('Save failed', error.message || String(error), 'error'); return }
    notify?.('Saved', editing.full_name, 'success')
    setEditing(null); load()
  }

  const toggleActive = async (r) => {
    await upsertPractitioner({ id: r.id, active: !r.active })
    load()
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <header style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>Outpatient</div>
          <h1 style={{ fontSize: '1.6rem', margin: '4px 0 0' }}>Clinical roster</h1>
        </div>
        <button className="btn btn--primary" onClick={startNew}>+ Add practitioner</button>
      </header>

      <div style={{ background: 'white', border: '1px solid #E5E9EE', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
          <thead>
            <tr style={{ background: '#FAFBFC', borderBottom: '1px solid #E5E9EE' }}>
              <th style={th(60)}>Order</th>
              <th style={th()}>Name</th>
              <th style={th()}>Title</th>
              <th style={th()}>Type</th>
              <th style={th()}>MDCN</th>
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
                <td style={td()}><strong>{r.full_name}</strong>{r.email && <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>{r.email}</div>}</td>
                <td style={td()}>{r.title || '—'}</td>
                <td style={td()}>{r.role_type === 'in_house' ? 'In-house' : 'Visiting'}</td>
                <td style={td()}>{r.registration_number || '—'}</td>
                <td style={td()}><button onClick={() => toggleActive(r)} style={pill(r.active ? '#1A7A4A' : '#7A8090')}>{r.active ? 'Active' : 'Inactive'}</button></td>
                <td style={td()}><span style={pill(r.public ? '#1A5FAD' : '#7A8090')}>{r.public ? 'Public' : 'Hidden'}</span></td>
                <td style={td()}><button className="btn btn--secondary btn--sm" onClick={() => startEdit(r)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={modalBg} onClick={() => setEditing(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 14 }}>{editing.id ? 'Edit practitioner' : 'New practitioner'}</h2>
            <Grid>
              <F label="Full name" v={editing.full_name} on={v => setEditing(p => ({ ...p, full_name: v }))} />
              <F label="Title" v={editing.title} on={v => setEditing(p => ({ ...p, title: v }))} placeholder="Specialist Psychiatrist" />
              <S label="Role type" v={editing.role_type} on={v => setEditing(p => ({ ...p, role_type: v }))} options={[['in_house', 'In-house'], ['visiting', 'Visiting']]} />
              <F label="MDCN registration" v={editing.registration_number} on={v => setEditing(p => ({ ...p, registration_number: v }))} />
              <F label="Email" v={editing.email} on={v => setEditing(p => ({ ...p, email: v }))} type="email" />
              <F label="Phone" v={editing.phone} on={v => setEditing(p => ({ ...p, phone: v }))} />
              <F label="Photo URL" v={editing.photo_url} on={v => setEditing(p => ({ ...p, photo_url: v }))} placeholder="https://…" />
              <F label="Display order" v={editing.display_order} on={v => setEditing(p => ({ ...p, display_order: v }))} type="number" />
            </Grid>
            <T label="Short bio (1–3 sentences for the public page)" v={editing.short_bio} on={v => setEditing(p => ({ ...p, short_bio: v }))} rows={4} />
            <T label="Specialties (comma-separated)"
               v={Array.isArray(editing.specialties) ? editing.specialties.join(', ') : ''}
               on={v => setEditing(p => ({ ...p, specialties: v.split(',').map(s => s.trim()).filter(Boolean) }))}
               rows={2} />
            <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
              <Chk label="Active" v={editing.active} on={v => setEditing(p => ({ ...p, active: v }))} />
              <Chk label="Public (show on /outpatient)" v={editing.public} on={v => setEditing(p => ({ ...p, public: v }))} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button className="btn btn--secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn--primary" disabled={saving || !editing.full_name} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
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
