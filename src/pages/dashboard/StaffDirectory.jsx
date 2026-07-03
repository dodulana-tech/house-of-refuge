import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseReady, getStaff, addStaff } from '../../utils/supabase'

/*
  Staff Directory — per HOR Organogram
  Program Director → Program Manager + Chaplain + Head of Clinical Services
  → Admin Officer, House Masters, Head Nurse
  → Cooks/Janitors/Security, Fitness Coach/Crisis Officers, Nurses/Psychologist/Social Worker
*/

const deptColors = {
  Leadership: 'var(--blue)',
  Operations: '#1A7A4A',
  'Spiritual Care': 'var(--gold)',
  Clinical: '#805AD5',
  Nursing: '#E53E3E',
  Residential: '#DD6B20',
  Psychosocial: '#D69E2E',
  Administration: 'var(--g500)',
}

const departmentOptions = Object.keys(deptColors)

const emptyForm = { code: '', full_name: '', role: '', department: 'Leadership', email: '', phone: '', start_date: '' }

export default function StaffDirectory() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!isSupabaseReady()) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await getStaff()
    if (error) alert('Failed to load staff: ' + error.message)
    setStaff(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setSaving(true)
    const { error } = await addStaff({
      code: form.code || null,
      full_name: form.full_name,
      role: form.role || null,
      department: form.department || null,
      email: form.email || null,
      phone: form.phone || null,
      status: 'active',
      start_date: form.start_date || null,
    })
    setSaving(false)
    if (error) {
      alert('Failed to add staff: ' + error.message)
      return
    }
    setForm(emptyForm)
    setShowAdd(false)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Staff Directory</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>{staff.length} team members · Per HOR Organisational Structure</p>
        </div>
        {isSupabaseReady() && (
          <button
            onClick={() => setShowAdd(v => !v)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--blue)', color: '#fff', fontWeight: 700, fontSize: '.82rem', cursor: 'pointer' }}
          >
            {showAdd ? 'Cancel' : '+ Add Staff'}
          </button>
        )}
      </div>

      {/* Add staff form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="card" style={{ padding: 20, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <label style={{ fontSize: '.76rem', color: 'var(--g500)' }}>
            Full Name *
            <input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} style={inputStyle} />
          </label>
          <label style={{ fontSize: '.76rem', color: 'var(--g500)' }}>
            Staff Code
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} style={inputStyle} />
          </label>
          <label style={{ fontSize: '.76rem', color: 'var(--g500)' }}>
            Role
            <input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inputStyle} />
          </label>
          <label style={{ fontSize: '.76rem', color: 'var(--g500)' }}>
            Department
            <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} style={inputStyle}>
              {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label style={{ fontSize: '.76rem', color: 'var(--g500)' }}>
            Email
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
          </label>
          <label style={{ fontSize: '.76rem', color: 'var(--g500)' }}>
            Phone
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
          </label>
          <label style={{ fontSize: '.76rem', color: 'var(--g500)' }}>
            Start Date
            <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} style={inputStyle} />
          </label>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--blue)', color: '#fff', fontWeight: 700, fontSize: '.82rem', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Add Staff'}
            </button>
          </div>
        </form>
      )}

      {/* Department summary */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(deptColors).map(([dept, color]) => {
          const count = staff.filter(s => s.department === dept).length
          if (!count) return null
          return (
            <span key={dept} style={{ padding: '4px 12px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700, background: color + '12', color }}>
              {dept} ({count})
            </span>
          )
        })}
      </div>

      {/* Staff list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--g500)', fontSize: '.88rem' }}>Loading staff…</div>
      ) : staff.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--g500)', fontSize: '.88rem' }}>No staff on record yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {staff.map(s => {
            const name = s.full_name || 'Unnamed'
            const color = deptColors[s.department] || 'var(--g300)'
            return (
              <div key={s.id} className="card" style={{ padding: '14px 18px', borderLeft: `3px solid ${color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: `${deptColors[s.department] || 'var(--g300)'}15`,
                      color: deptColors[s.department] || 'var(--g500)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.72rem', fontWeight: 700, flexShrink: 0,
                    }}>{name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                    <div>
                      <Link to={'/dashboard/staff/' + s.id} style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--charcoal)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--charcoal)'}>{name}</Link>
                      <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>{[s.role, s.department].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '.76rem', color: 'var(--g500)', textAlign: 'right' }}>
                    {s.email && <div>{s.email}</div>}
                    {s.phone && <div>{s.phone}</div>}
                    {s.data?.reports && <div style={{ fontSize: '.68rem', marginTop: 2 }}>Reports to: {s.data.reports}</div>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const inputStyle = { display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.84rem', color: 'var(--charcoal)' }
