import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Clinical Notes Module — add and view SOAP-format notes for all patients.
  Note types map to the HOR multi-disciplinary team. Intelligent prompts
  appear based on the selected note type. Initials only — no full names (HIPAA).
*/

const NOTE_TYPES = [
  'Individual CBT',
  'Group CBT',
  'Psychoeducation',
  'Life Skills',
  'Nursing',
  'Pastoral',
  'Social Work',
  'MDT Review',
  'Admission',
  'Discharge',
]

const NOTE_TYPE_COLORS = {
  'Individual CBT': 'var(--blue)',
  'Group CBT': '#2B6CB0',
  'Psychoeducation': '#6B46C1',
  'Life Skills': '#319795',
  'Nursing': '#DD6B20',
  'Pastoral': '#8B5CF6',
  'Social Work': '#D69E2E',
  'MDT Review': '#E53E3E',
  'Admission': '#1A7A4A',
  'Discharge': '#718096',
}

const SOAP_PROMPTS = {
  'Individual CBT': {
    subjective: 'Patient-reported thoughts, feelings, and concerns. Cognitive distortions identified. Homework review from last session...',
    objective: 'Affect, engagement level, eye contact, thought process. Beck Depression/Anxiety Inventory scores if administered...',
    assessment: 'Stage of change progression. Cognitive restructuring progress. Therapeutic alliance quality...',
    plan: 'Homework assignments, thought records, behavioral experiments. Next session focus areas...',
  },
  'Group CBT': {
    subjective: 'Patient participation level and topics discussed. Peer interactions observed...',
    objective: 'Group dynamics, patient engagement, body language, contributions to discussion...',
    assessment: 'Social skills development, peer support capacity, group cohesion contribution...',
    plan: 'Topics for next session, individual follow-up needed, peer mentoring opportunities...',
  },
  'Psychoeducation': {
    subjective: 'Patient understanding and questions about educational content. Personal relevance expressed...',
    objective: 'Attendance, engagement, comprehension demonstrated, quiz/worksheet performance...',
    assessment: 'Knowledge retention, ability to apply concepts, areas needing reinforcement...',
    plan: 'Follow-up materials, next module topic, individualized learning needs...',
  },
  'Life Skills': {
    subjective: 'Patient self-assessment of skill development. Challenges faced in practice...',
    objective: 'Skill demonstration, task completion, independence level observed...',
    assessment: 'Progress in anger management, communication, budgeting, time management, etc...',
    plan: 'Skill practice assignments, community outing goals, vocational next steps...',
  },
  'Nursing': {
    subjective: 'Patient-reported symptoms, pain, sleep quality, appetite, medication side effects...',
    objective: 'BP: ___/___, Pulse: ___, Temp: ___C, Weight: ___kg, BMI: ___. Physical exam findings...',
    assessment: 'Vital trends, withdrawal symptom management, medication adherence, nutritional status...',
    plan: 'Medication changes, PRN administered, next vitals check, physician referral if needed...',
  },
  'Pastoral': {
    subjective: 'Spiritual concerns, faith journey reflections, guilt/shame processing, prayer requests...',
    objective: 'Attendance at devotions, Bible study engagement, chapel participation, spiritual practices observed...',
    assessment: 'Spiritual formation progress, forgiveness work, meaning-making, hope indicators...',
    plan: 'Scripture assignments, devotional materials, chaplain follow-up, faith community connections...',
  },
  'Social Work': {
    subjective: 'Family dynamics, community concerns, housing/employment worries, support system status...',
    objective: 'Family contact log, resource referrals made, social support mapping completed...',
    assessment: 'Reintegration readiness, family relationship quality, community resource needs...',
    plan: 'Family sessions scheduled, housing plan, employment referral, aftercare network building...',
  },
  'MDT Review': {
    subjective: 'Team member perspectives on patient progress. Patient self-assessment summary...',
    objective: 'Clinical scores, behavioral record, programme compliance metrics, phase milestones achieved...',
    assessment: 'Readiness for phase transition, risk level, treatment plan modifications needed...',
    plan: 'Phase transition decision, treatment plan updates, specialist referrals, next MDT date...',
  },
  'Admission': {
    subjective: 'Presenting complaint, substance use history, motivation for treatment, patient goals...',
    objective: 'Medical history, current medications, psychiatric history, baseline vitals, urine drug screen...',
    assessment: 'DSM-5 diagnosis, severity level, co-occurring conditions, risk assessment...',
    plan: 'Pathway assignment, initial treatment plan, detox protocol, orientation schedule...',
  },
  'Discharge': {
    subjective: 'Patient reflections on treatment, confidence level, concerns about returning to community...',
    objective: 'Programme completion metrics, final assessment scores, discharge vitals, medication list...',
    assessment: 'Treatment outcomes, relapse risk level, aftercare readiness, support system strength...',
    plan: 'Aftercare plan, support group referral, follow-up appointments, emergency contacts...',
  },
}

const DEFAULT_PROMPTS = {
  subjective: 'What the patient reports — symptoms, feelings, concerns, progress since last visit...',
  objective: 'Observable and measurable data — vitals, behavior, test results, clinical observations...',
  assessment: 'Clinical interpretation — diagnosis, progress evaluation, risk level, treatment response...',
  plan: 'Next steps — interventions, referrals, follow-up schedule, homework, medication changes...',
}

const PATIENTS = [
  { id: 'P001', initials: 'CO' },
  { id: 'P002', initials: 'AN' },
  { id: 'P003', initials: 'KA' },
  { id: 'P004', initials: 'IM' },
]

const MOCK_NOTES = [
  { id: 1, date: '2026-05-07', patient: 'CO', author: 'AI', type: 'Individual CBT', subjective: 'Patient reports improved mood, less preoccupation with alcohol cravings. Acknowledges triggers around family contact.', objective: 'Engaged, good eye contact, affect congruent.', assessment: 'Progressing in contemplation stage. Beginning to identify cognitive distortions.', plan: 'Continue CBT 2x/week. Introduce thought record homework.' },
  { id: 2, date: '2026-05-07', patient: 'AN', author: 'FA', type: 'Nursing', subjective: 'Reports mild nausea this morning. Sleep improved to 6 hours.', objective: 'BP 118/74, Pulse 82, Temp 36.5C. Weight 62kg, stable.', assessment: 'Tramadol withdrawal symptoms decreasing. Day 45 — vitals stabilizing.', plan: 'Continue monitoring. Adjust anti-nausea PRN. Next vitals 0630 tomorrow.' },
  { id: 3, date: '2026-05-06', patient: 'CO', author: 'FA', type: 'Group CBT', subjective: 'Participated actively in group. Shared about family conflict as trigger.', objective: 'Appropriate peer interaction. Offered support to newer resident.', assessment: 'Developing group cohesion. Showing empathy and leadership qualities.', plan: 'Encourage peer mentoring role. Continue group 3x/week.' },
  { id: 4, date: '2026-05-06', patient: 'KA', author: 'AI', type: 'Life Skills', subjective: 'Expressed excitement about vocational assessment results. Interested in carpentry.', objective: 'Completed skills inventory. Strong practical aptitude demonstrated.', assessment: 'Ready for supervised community placement. Reintegration on track.', plan: 'Arrange carpentry apprenticeship visit. Schedule employer meeting.' },
  { id: 5, date: '2026-05-05', patient: 'IM', author: 'HM', type: 'Nursing', subjective: 'Complains of muscle aches and insomnia. Appetite poor.', objective: 'BP 134/88, Pulse 92, Temp 37.1C. Weight 71kg, down 1kg. Mild diaphoresis noted.', assessment: 'Active heroin withdrawal — Day 8. Symptoms expected to peak soon.', plan: 'Continue detox protocol. Clonidine 0.1mg as needed. Electrolyte monitoring. Reassess in 12h.' },
  { id: 6, date: '2026-05-05', patient: 'CO', author: 'PK', type: 'Pastoral', subjective: 'Expressed interest in deeper spiritual engagement. Struggling with guilt about past actions.', objective: 'Attended morning devotion and evening Bible study. Receptive to counsel.', assessment: 'Spiritual growth emerging. Guilt processing needed alongside clinical work.', plan: 'Begin forgiveness workbook. Weekly chaplain sessions.' },
  { id: 7, date: '2026-05-04', patient: 'AN', author: 'SN', type: 'Social Work', subjective: 'Worried about housing post-discharge. Parents in different city.', objective: 'Family mapping shows 1 supportive contact locally. Alumni network contacted.', assessment: 'Housing is primary reintegration barrier. Needs structured plan.', plan: 'Explore transitional housing options. Connect with alumni mentor in city.' },
  { id: 8, date: '2026-05-03', patient: 'KA', author: 'AI', type: 'MDT Review', subjective: 'Team consensus: patient has shown consistent progress across all domains.', objective: 'Mood 5/5, Cravings 1/5, 0 behavioral incidents, 100% session attendance.', assessment: 'Ready for reintegration phase. Low relapse risk with current support plan.', plan: 'Transition to Phase 4. Begin discharge planning. Schedule family meeting.' },
  { id: 9, date: '2026-05-01', patient: 'CO', author: 'SN', type: 'Social Work', subjective: 'Concerned about family dynamics post-discharge. Mother supportive, siblings distant.', objective: 'Family mapping completed. 2 supportive contacts, 3 high-risk contacts identified.', assessment: 'Family reintegration will need structured approach.', plan: 'Schedule family psychoeducation call. Explore alumni network.' },
  { id: 10, date: '2026-04-15', patient: 'CO', author: 'AI', type: 'Admission', subjective: 'Presents voluntarily for alcohol dependency treatment. Reports daily drinking for 7 years. Cannabis use intermittent. Motivated by family pressure and job loss.', objective: 'BP 138/86, Pulse 88, Temp 36.8C. CAGE score 3/4. BAL 0.00 (sober on arrival). No acute withdrawal signs.', assessment: 'Alcohol Use Disorder, moderate-severe. Cannabis Use Disorder, mild. No active suicidal ideation.', plan: 'Admit to Pathway A. Bed A1. Begin stabilization protocol. Baseline labs ordered. Orientation tomorrow 0900.' },
]

export default function ClinicalNotes() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [filterPatient, setFilterPatient] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [expandedNote, setExpandedNote] = useState(null)

  const [form, setForm] = useState({
    patient: '',
    type: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  })

  const prompts = form.type ? (SOAP_PROMPTS[form.type] || DEFAULT_PROMPTS) : DEFAULT_PROMPTS

  const filteredNotes = MOCK_NOTES
    .filter(n => !filterPatient || n.patient === filterPatient)
    .filter(n => !filterType || n.type === filterType)
    .filter(n => !filterDateFrom || n.date >= filterDateFrom)
    .filter(n => !filterDateTo || n.date <= filterDateTo)

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    if (!form.patient || !form.type || !form.subjective) return
    alert('Note saved successfully (demo mode)')
    setForm({ patient: '', type: '', subjective: '', objective: '', assessment: '', plan: '' })
    setShowForm(false)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Clinical Notes</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>{MOCK_NOTES.length} notes across {PATIENTS.length} patients · SOAP format</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Note'}
        </button>
      </div>

      {/* Add Note Form */}
      {showForm && (
        <div className="card" style={{ padding: '22px', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: 16 }}>New Clinical Note</h3>

          <div className="frow">
            <div className="fg">
              <label className="flabel">Patient *</label>
              <select className="fi" value={form.patient} onChange={e => handleFormChange('patient', e.target.value)}>
                <option value="">Select patient...</option>
                {PATIENTS.map(p => (
                  <option key={p.id} value={p.initials}>{p.initials} ({p.id})</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="flabel">Note Type *</label>
              <select className="fi" value={form.type} onChange={e => handleFormChange('type', e.target.value)}>
                <option value="">Select type...</option>
                {NOTE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {form.type && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 14,
              background: (NOTE_TYPE_COLORS[form.type] || 'var(--g500)') + '10',
              borderLeft: `3px solid ${NOTE_TYPE_COLORS[form.type] || 'var(--g500)'}`,
            }}>
              <span style={{ fontSize: '.76rem', fontWeight: 600, color: NOTE_TYPE_COLORS[form.type] || 'var(--g500)' }}>
                {form.type} — prompts will guide your documentation below
              </span>
            </div>
          )}

          <div className="fg">
            <label className="flabel">S — Subjective *</label>
            <textarea
              className="fi" rows={3}
              placeholder={prompts.subjective}
              value={form.subjective}
              onChange={e => handleFormChange('subjective', e.target.value)}
            />
          </div>
          <div className="fg">
            <label className="flabel">O — Objective</label>
            <textarea
              className="fi" rows={3}
              placeholder={prompts.objective}
              value={form.objective}
              onChange={e => handleFormChange('objective', e.target.value)}
            />
          </div>
          <div className="fg">
            <label className="flabel">A — Assessment</label>
            <textarea
              className="fi" rows={3}
              placeholder={prompts.assessment}
              value={form.assessment}
              onChange={e => handleFormChange('assessment', e.target.value)}
            />
          </div>
          <div className="fg">
            <label className="flabel">P — Plan</label>
            <textarea
              className="fi" rows={3}
              placeholder={prompts.plan}
              value={form.plan}
              onChange={e => handleFormChange('plan', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn btn--primary btn--sm" onClick={handleSubmit}>Save Note</button>
            <button className="btn btn--secondary btn--sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Patient</label>
            <select className="fi" value={filterPatient} onChange={e => setFilterPatient(e.target.value)} style={{ fontSize: '.84rem' }}>
              <option value="">All patients</option>
              {PATIENTS.map(p => (
                <option key={p.id} value={p.initials}>{p.initials}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Note Type</label>
            <select className="fi" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ fontSize: '.84rem' }}>
              <option value="">All types</option>
              {NOTE_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>From</label>
            <input className="fi" type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ fontSize: '.84rem' }} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 600, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>To</label>
            <input className="fi" type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={{ fontSize: '.84rem' }} />
          </div>
          {(filterPatient || filterType || filterDateFrom || filterDateTo) && (
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => { setFilterPatient(''); setFilterType(''); setFilterDateFrom(''); setFilterDateTo('') }}
              style={{ alignSelf: 'flex-end' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p style={{ fontSize: '.82rem', color: 'var(--g500)', marginBottom: 12 }}>
        Showing {filteredNotes.length} of {MOCK_NOTES.length} notes
      </p>

      {/* Notes list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredNotes.length === 0 ? (
          <div className="card" style={{ padding: '32px 22px', textAlign: 'center' }}>
            <p style={{ fontSize: '.92rem', color: 'var(--g500)' }}>No notes match the current filters.</p>
          </div>
        ) : (
          filteredNotes.map(note => {
            const typeColor = NOTE_TYPE_COLORS[note.type] || 'var(--g500)'
            const isExpanded = expandedNote === note.id
            return (
              <div
                key={note.id}
                className="card"
                style={{ padding: '16px 20px', borderLeft: `4px solid ${typeColor}`, cursor: 'pointer' }}
                onClick={() => setExpandedNote(isExpanded ? null : note.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--blue), var(--blue-dk))',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.72rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {note.patient}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--charcoal)' }}>
                        {note.patient} — {note.type}
                      </div>
                      <div style={{ fontSize: '.76rem', color: 'var(--g500)' }}>
                        {note.date} · Author: {note.author}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 10, fontSize: '.68rem', fontWeight: 700,
                    background: typeColor + '18', color: typeColor,
                  }}>
                    {note.type}
                  </span>
                </div>

                {/* Excerpt (always visible) */}
                {!isExpanded && (
                  <div style={{ fontSize: '.82rem', color: 'var(--g700)', marginTop: 10, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: 'var(--g500)' }}>S: </span>
                    {note.subjective.length > 120 ? note.subjective.slice(0, 120) + '...' : note.subjective}
                  </div>
                )}

                {/* Full SOAP (expanded) */}
                {isExpanded && (
                  <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                    {[
                      ['S — Subjective', note.subjective],
                      ['O — Objective', note.objective],
                      ['A — Assessment', note.assessment],
                      ['P — Plan', note.plan],
                    ].map(([label, text]) => (
                      <div key={label}>
                        <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: '.84rem', color: 'var(--charcoal)', lineHeight: 1.5 }}>{text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
