import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Patient Rights — HOR Resident Rights Charter (SOP Chapter 11)
  Display-only rights + structured grievance submission form.
  HIPAA-compliant: no free text fields.
*/

const RIGHTS = [
  { title: 'Right to Dignity and Respect', desc: 'Every resident shall be treated with dignity, compassion, and respect regardless of background, substance history, or personal circumstances.' },
  { title: 'Right to Confidentiality', desc: 'All personal, medical, and treatment information shall be kept strictly confidential and shared only with authorised care team members.' },
  { title: 'Right to Informed Consent', desc: 'Residents have the right to be fully informed about their treatment plan, medications, and any procedures before consenting.' },
  { title: 'Right to Safety', desc: 'Every resident has the right to a safe, clean, and secure living environment free from abuse, bullying, or harassment.' },
  { title: 'Right to Spiritual Freedom', desc: 'While HOR operates within a faith-based framework, residents have the right to their own spiritual beliefs and practices.' },
  { title: 'Right to Communication', desc: 'Residents may communicate with family members during designated visiting hours and through approved communication channels.' },
  { title: 'Right to Grievance', desc: 'Residents have the right to raise concerns or complaints through the formal grievance procedure without fear of retaliation.' },
]

const EXPECT_FROM_HOR = [
  'A structured 12-week recovery programme based on clinical best practice',
  'Qualified medical and clinical staff available 24/7 during critical phases',
  'Individual counselling sessions at least once per week',
  'Group therapy sessions including CBT, relapse prevention, and life skills',
  'Nutritious meals three times daily plus morning and afternoon tea',
  'A clean, safe, and maintained residential facility',
  'Spiritual formation and pastoral care as part of holistic recovery',
]

const EXPECT_FROM_YOU = [
  'Full participation in all scheduled programme activities',
  'Adherence to the House Rules and Code of Conduct',
  'Respect for fellow residents, staff, and the facility',
  'Honesty and transparency in all therapeutic interactions',
  'Zero tolerance compliance: no substances, violence, or sexual activity on premises',
  'Cooperation with random drug testing and room inspections',
]

const RECOVERY_REQUIRES = [
  'Commitment to the full 12-week programme duration',
  'Willingness to examine personal triggers, patterns, and behaviours',
  'Engagement with both clinical and spiritual components of treatment',
  'Building a personal relapse prevention plan with your care team',
  'Developing a support network for life after the programme',
]

const GRIEVANCE_TYPES = ['Treatment concern', 'Staff conduct', 'Facility condition', 'Food/nutrition', 'Safety concern', 'Privacy/confidentiality', 'Other']
const SEVERITIES = ['Low', 'Medium', 'High', 'Urgent']
const RELATED_TO = ['Staff', 'Facility', 'Programme', 'Other']

const INITIAL_GRIEVANCES = [
  { id: 1, date: '2026-03-20', type: 'Facility condition', severity: 'Low', relatedTo: 'Facility', status: 'Resolved' },
  { id: 2, date: '2026-03-10', type: 'Food/nutrition', severity: 'Medium', relatedTo: 'Programme', status: 'Under Review' },
]

const severityColors = { Low: '#1A7A4A', Medium: '#DD6B20', High: '#E53E3E', Urgent: '#C53030' }
const statusColors = { 'Under Review': '#DD6B20', Resolved: '#1A7A4A', Escalated: '#E53E3E', Acknowledged: 'var(--blue)', Withdrawn: 'var(--g500)' }

export default function PatientRights() {
  const { user } = useAuth()
  const [tab, setTab] = useState('rights')
  const [grievances, setGrievances] = useState(INITIAL_GRIEVANCES)
  const [gForm, setGForm] = useState({ type: '', severity: '', relatedTo: '' })

  const handleSubmit = () => {
    if (!gForm.type || !gForm.severity || !gForm.relatedTo) return
    setGrievances(prev => [
      { id: prev.length + 1, date: new Date().toISOString().slice(0, 10), type: gForm.type, severity: gForm.severity, relatedTo: gForm.relatedTo, status: 'Acknowledged' },
      ...prev,
    ])
    setGForm({ type: '', severity: '', relatedTo: '' })
  }

  const tabs = [
    { key: 'rights', label: 'Your Rights' },
    { key: 'expectations', label: 'Expectations' },
    { key: 'grievance', label: 'Raise Grievance' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Resident Rights Charter</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>House of Refuge Residential Treatment Centre — SOP Chapter 11</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: tab === t.key ? 'var(--charcoal)' : 'var(--g100)', color: tab === t.key ? '#fff' : 'var(--g600)', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'rights' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {RIGHTS.map((r, i) => (
            <div key={i} className="card" style={{ borderLeft: '4px solid var(--blue)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.78rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <h4 style={{ fontSize: '.92rem', fontWeight: 600 }}>{r.title}</h4>
              </div>
              <p style={{ fontSize: '.82rem', color: 'var(--g600)', lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'expectations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* What You Can Expect from HOR */}
          <div className="card" style={{ borderLeft: '4px solid #1A7A4A' }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 12, color: '#1A7A4A' }}>What You Can Expect from HOR</h3>
            {EXPECT_FROM_HOR.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: i < EXPECT_FROM_HOR.length - 1 ? '1px solid var(--g100)' : 'none' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A7A4A', flexShrink: 0, marginTop: 6 }} />
                <span style={{ fontSize: '.84rem', color: 'var(--g700)' }}>{item}</span>
              </div>
            ))}
          </div>

          {/* What HOR Expects from You */}
          <div className="card" style={{ borderLeft: '4px solid var(--gold)' }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 12, color: 'var(--gold)' }}>What HOR Expects from You</h3>
            {EXPECT_FROM_YOU.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: i < EXPECT_FROM_YOU.length - 1 ? '1px solid var(--g100)' : 'none' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, marginTop: 6 }} />
                <span style={{ fontSize: '.84rem', color: 'var(--g700)' }}>{item}</span>
              </div>
            ))}
          </div>

          {/* What Recovery Will Require */}
          <div className="card" style={{ borderLeft: '4px solid #805AD5' }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 12, color: '#805AD5' }}>What Recovery Will Require</h3>
            {RECOVERY_REQUIRES.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: i < RECOVERY_REQUIRES.length - 1 ? '1px solid var(--g100)' : 'none' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#805AD5', flexShrink: 0, marginTop: 6 }} />
                <span style={{ fontSize: '.84rem', color: 'var(--g700)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'grievance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Grievance form */}
          <div className="card">
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14 }}>Submit a Grievance</h3>
            <p style={{ fontSize: '.8rem', color: 'var(--g500)', marginBottom: 16 }}>All grievances are reviewed confidentially. You will not face any retaliation for raising a concern.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '.78rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Type of Concern</label>
                <select value={gForm.type} onChange={e => setGForm(p => ({ ...p, type: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.84rem' }}>
                  <option value="">-- Select --</option>
                  {GRIEVANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.78rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Severity</label>
                <select value={gForm.severity} onChange={e => setGForm(p => ({ ...p, severity: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.84rem' }}>
                  <option value="">-- Select --</option>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '.78rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>Related To</label>
                <select value={gForm.relatedTo} onChange={e => setGForm(p => ({ ...p, relatedTo: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.84rem' }}>
                  <option value="">-- Select --</option>
                  {RELATED_TO.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={!gForm.type || !gForm.severity || !gForm.relatedTo}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: (!gForm.type || !gForm.severity || !gForm.relatedTo) ? 'var(--g300)' : 'var(--blue)', color: '#fff', fontSize: '.86rem', fontWeight: 600, cursor: (!gForm.type || !gForm.severity || !gForm.relatedTo) ? 'not-allowed' : 'pointer' }}>
              Submit Grievance
            </button>
          </div>

          {/* Past grievances */}
          <div className="card">
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', marginBottom: 14 }}>My Grievances</h3>
            {grievances.length === 0 ? (
              <p style={{ fontSize: '.84rem', color: 'var(--g500)' }}>No grievances submitted.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {grievances.map((g, i) => (
                  <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < grievances.length - 1 ? '1px solid var(--g100)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '.86rem', fontWeight: 600 }}>{g.type}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>{g.date} | Related to: {g.relatedTo}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: '.7rem', padding: '2px 8px', borderRadius: 10, background: (severityColors[g.severity] || 'var(--g400)') + '18', color: severityColors[g.severity], fontWeight: 600 }}>{g.severity}</span>
                      <span style={{ fontSize: '.7rem', padding: '2px 8px', borderRadius: 10, background: (statusColors[g.status] || 'var(--g400)') + '18', color: statusColors[g.status], fontWeight: 600 }}>{g.status}</span>
                      {(g.status === 'Acknowledged' || g.status === 'Under Review') && (
                        <button onClick={() => { if (confirm('Withdraw this grievance?')) setGrievances(prev => prev.map(x => x.id === g.id ? { ...x, status: 'Withdrawn' } : x)) }}
                          style={{ fontSize: '.68rem', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--g400)', background: 'none', color: 'var(--g500)', cursor: 'pointer', fontWeight: 600 }}>
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
