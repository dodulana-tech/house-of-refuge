import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { isSupabaseReady, getStaffMember, updateStaff, deleteStaff } from '../../utils/supabase'
import { requireFields } from '../../utils/formGuard'

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

const STATUS_OPTIONS = ['active', 'on_leave', 'suspended', 'inactive']

export default function StaffDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [staff, setStaff] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [noteText, setNoteText] = useState('')

  async function load() {
    if (!isSupabaseReady()) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await getStaffMember(id)
    if (error && error.code !== 'PGRST116') alert('Failed to load staff member: ' + error.message)
    setStaff(data || null)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  async function handleStatusChange(status) {
    setSaving(true)
    const { data, error } = await updateStaff(id, { status })
    setSaving(false)
    if (error) {
      alert('Failed to update status: ' + error.message)
      return
    }
    if (data) setStaff(data)
  }

  async function handleAddNote(e) {
    e.preventDefault()
    if (!requireFields([[noteText, 'Note']])) return
    const notes = Array.isArray(staff.data?.notes) ? staff.data.notes : []
    const nextData = {
      ...(staff.data || {}),
      notes: [{ date: new Date().toISOString().slice(0, 10), author: 'Staff', note: noteText.trim() }, ...notes],
    }
    setSaving(true)
    const { data, error } = await updateStaff(id, { data: nextData })
    setSaving(false)
    if (error) {
      alert('Failed to add note: ' + error.message)
      return
    }
    if (data) setStaff(data)
    setNoteText('')
  }

  async function handleDelete() {
    if (!window.confirm(`Remove ${staff?.full_name || 'this staff member'} from the directory? This cannot be undone.`)) return
    setSaving(true)
    const { error } = await deleteStaff(id)
    setSaving(false)
    if (error) { alert('Failed to remove staff: ' + error.message); return }
    navigate('/dashboard/staff')
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--g500)', fontSize: '.88rem' }}>Loading staff member…</div>
  }

  if (!staff) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', marginBottom: 12 }}>Staff Member Not Found</h2>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)', marginBottom: 20 }}>No staff record matches this ID.</p>
        <Link to="/dashboard/staff" style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '.88rem' }}>&larr; Back to Staff Directory</Link>
      </div>
    )
  }

  const name = staff.full_name || 'Unnamed'
  const deptColor = deptColors[staff.department] || 'var(--g500)'
  const certs = Array.isArray(staff.data?.certifications) ? staff.data.certifications : []
  const schedule = Array.isArray(staff.data?.schedule) ? staff.data.schedule : []
  const perfNotes = Array.isArray(staff.data?.notes) ? staff.data.notes : []
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)

  return (
    <div>
      {/* Back link + delete */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Link to="/dashboard/staff" style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '.84rem', textDecoration: 'none' }}>
          &larr; Back to Staff Directory
        </Link>
        <button onClick={handleDelete} disabled={saving}
          style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #FED7D7', background: '#fff', color: '#E53E3E', cursor: saving ? 'default' : 'pointer', fontSize: '.78rem', fontWeight: 700 }}>
          Delete Staff Member
        </button>
      </div>

      {/* Staff Info Card */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: deptColor + '15', color: deptColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', fontWeight: 700, flexShrink: 0,
          }}>{initials}</div>
          <div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', margin: 0 }}>{name}</h1>
            <span style={{ fontSize: '.84rem', color: 'var(--g500)' }}>{[staff.role, staff.department].filter(Boolean).join(' · ')}</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginBottom: 4 }}>Status</div>
            <select
              value={staff.status || 'active'}
              disabled={saving}
              onChange={e => handleStatusChange(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem', fontWeight: 600, color: 'var(--charcoal)', cursor: saving ? 'default' : 'pointer' }}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {[
            { label: 'Staff Code', value: staff.code || '—' },
            { label: 'Qualification', value: staff.data?.qualification || '—' },
            { label: 'Phone', value: staff.phone || '—' },
            { label: 'Email', value: staff.email || '—' },
            { label: 'Start Date', value: staff.start_date || '—' },
            { label: 'Reporting Line', value: staff.data?.reports || '—' },
            { label: 'Department', value: staff.department || '—' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--charcoal)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Certifications & Training */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Certifications &amp; Training</h2>
        {certs.length === 0 ? (
          <p style={{ fontSize: '.84rem', color: 'var(--g500)', margin: 0 }}>No certifications on record.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--g200)' }}>
                  {['Certification', 'Date Obtained', 'Status', 'Expiry'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, fontSize: '.72rem', color: 'var(--g500)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {certs.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--g100)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--g500)' }}>{c.date}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 12, fontSize: '.7rem', fontWeight: 700,
                        background: c.status === 'Valid' ? '#C6F6D5' : '#FED7D7',
                        color: c.status === 'Valid' ? '#22543D' : '#9B2C2C',
                      }}>{c.status}</span>
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--g500)' }}>{c.expiry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule This Week */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Schedule This Week</h2>
        {schedule.length === 0 ? (
          <p style={{ fontSize: '.84rem', color: 'var(--g500)', margin: 0 }}>No schedule set.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--g200)' }}>
                  {['Day', 'Shift', 'Key Activities'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, fontSize: '.72rem', color: 'var(--g500)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--g100)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.day}</td>
                    <td style={{ padding: '8px 10px', color: deptColor, fontWeight: 600 }}>{row.shift}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--g600)' }}>{row.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Performance Notes */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 14 }}>Performance Notes</h2>
        <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add a performance note…"
            style={{ flex: 1, minWidth: 200, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.84rem' }}
          />
          <button type="submit" disabled={saving || !noteText.trim()} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--blue)', color: '#fff', fontWeight: 700, fontSize: '.82rem', cursor: saving ? 'default' : 'pointer', opacity: (saving || !noteText.trim()) ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Add Note'}
          </button>
        </form>
        {perfNotes.length === 0 ? (
          <p style={{ fontSize: '.84rem', color: 'var(--g500)', margin: 0 }}>No performance notes recorded.</p>
        ) : (
          perfNotes.map((note, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: i < perfNotes.length - 1 ? '1px solid var(--g100)' : 'none' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: '.78rem', color: 'var(--g400)' }}>{note.date}</span>
                <span style={{ fontSize: '.75rem', fontWeight: 700, color: deptColor }}>{note.author}</span>
              </div>
              <p style={{ fontSize: '.84rem', color: 'var(--g600)', margin: 0 }}>{note.note}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
