import React, { useState } from 'react'

/*
  SOP Library — 16 Standard Operating Procedures per Treatment Protocol Section 23
  Provides quick reference, compliance tracking, and staff acknowledgement.
*/

const SOPS = [
  {
    id: 'SOP-001', title: 'Admission', section: '23.2',
    category: 'Admissions & Discharge',
    responsible: 'Program Officer, Program Director, Nursing Staff, House Master',
    steps: 16,
    summary: '16-step admission process from initial contact through detox activation. Covers pre-screening (ASI, ASSIST, URICA), medical review, consent documentation, property inspection, orientation, nursing baseline, clinical assessment, and treatment plan initiation within 72 hours.',
    keyActions: ['Administer ASI, ASSIST, URICA at pre-screening', 'All 8 consent forms signed', 'Belongings inventory completed', 'CIWA-Ar or COWS scored at admission', 'C-SSRS, PHQ-9, GAD-7, ACE within 24 hours', 'Columbia Model treatment plan within 72 hours'],
  },
  {
    id: 'SOP-002', title: 'Detoxification Monitoring', section: '23.3',
    category: 'Clinical Operations',
    responsible: 'Physician, Nursing Staff',
    steps: 10,
    summary: 'Substance-specific detox monitoring: Alcohol (CIWA-Ar guided, symptom-triggered benzodiazepine, thiamine protocol) and Opioid (COWS guided, clonidine protocol, adjunctive medications). Includes escalation thresholds, seizure precautions, and completion criteria.',
    keyActions: ['CIWA-Ar q4h (q2h if >15, q1h if >20)', 'Benzodiazepine when CIWA-Ar > 8', 'COWS scoring per schedule', 'Clonidine when COWS 13-24 (monitor BP)', 'Thiamine 100mg IM/IV x 3-5 days', 'Completion: CIWA-Ar < 8 or COWS < 5 for 24hrs'],
  },
  {
    id: 'SOP-003', title: 'Medication Administration', section: '23.4',
    category: 'Clinical Operations',
    responsible: 'Nursing Staff, Physician',
    steps: 10,
    summary: '5 Rights verification, observed swallowing, MAR documentation, controlled medication counts at shift change, weekly stock reconciliation, expiry monitoring, and adverse reaction protocol.',
    keyActions: ['5 Rights check every round', 'Observe swallowing (no hoarding)', 'Controlled count at each shift change', 'Weekly stock reconciliation (Monday)', 'Expiry flagged at 90 days', 'Rounds: 6:00 AM, 12:00 PM, 6:00 PM, 10:30 PM'],
  },
  {
    id: 'SOP-004', title: 'Shift Handover', section: '23.5',
    category: 'Residential Operations',
    responsible: 'Outgoing and incoming shift staff',
    steps: 6,
    summary: 'Structured handover at each shift change: written summary, face-to-face verbal walkthrough per client, controlled medication count (nursing), outstanding tasks, incoming sign-off, and headcount within 30 minutes.',
    keyActions: ['Handover summary prepared 15 min before shift end', 'Face-to-face verbal handover per client', 'Joint controlled medication count', 'Incoming staff signs Handover Book', 'Headcount within 30 minutes of takeover'],
  },
  {
    id: 'SOP-005', title: 'Emergency Response — Medical Emergency', section: '23.6',
    category: 'Clinical Operations',
    responsible: 'All staff (first responder), Nursing Staff, Physician',
    steps: 10,
    summary: 'ABC assessment, emergency kit response within 2 minutes, physician notification within 5 minutes, stabilisation, hospital transfer decision, family notification within 30 minutes, incident documentation within 2 hours, post-incident debrief within 24 hours.',
    keyActions: ['Stay with client, call for help', 'ABC assessment, CPR if needed', 'Nurse with emergency kit within 2 minutes', 'Physician notified within 5 minutes', 'Family notified within 30 minutes', 'Incident Report within 2 hours'],
  },
  {
    id: 'SOP-006', title: 'Emergency Response — Suicide Risk', section: '23.7',
    category: 'Clinical Operations',
    responsible: 'All staff, Clinical Staff, Physician',
    steps: 10,
    summary: 'C-SSRS administration within 15 minutes of concern. Four-tier response: Low (weekly monitoring), Moderate (q1h checks, Risk Register), High (1-to-1 supervision, family contact), Critical (emergency psychiatric referral). Daily C-SSRS until Low for 7 consecutive days.',
    keyActions: ['Active attempt → treat as medical emergency (SOP-005)', 'C-SSRS within 15 minutes', 'High risk → 1-to-1 continuous supervision', 'Critical → Yaba Psychiatric Hospital referral', 'Treatment plan updated within 24 hours', 'Daily C-SSRS until Low for 7 days'],
  },
  {
    id: 'SOP-007', title: 'Emergency Response — Drug-Induced Psychosis', section: '23.8',
    category: 'Clinical Operations',
    responsible: 'All staff, Nursing Staff, Physician',
    steps: 11,
    summary: 'Stay calm, do not argue with delusions, ensure safety, clear area, 1-to-1 in low-stimulus environment, physician assessment within 30 minutes, psychiatric referral if symptoms persist, family notification, post-incident debrief.',
    keyActions: ['Do NOT argue with delusions', 'Clear area of other residents', 'Nurse + Program Director notified within 2 minutes', '1-to-1 in low-stimulus environment', 'Physician assessment within 30 minutes', 'Referral to Yaba Psychiatric Hospital if unresolved'],
  },
  {
    id: 'SOP-008', title: 'Emergency Response — Abscondment', section: '23.9',
    category: 'Residential Operations',
    responsible: 'House Master, Program Director',
    steps: 10,
    summary: 'Confirm within 15 minutes, notify Program Director, contact client and family, assess risk level (detox? suicidal? medically unstable?), secure belongings for 14 days, MI-based re-engagement if client returns, classify as AMA after 48 hours.',
    keyActions: ['Headcount and facility search within 15 minutes', 'Program Director notified immediately', 'Family notified within 1 hour', 'If on detox: advise family to seek medical attention', 'Belongings secured for 14 days', '48 hours no return → Self-Discharge (AMA)'],
  },
  {
    id: 'SOP-009', title: 'MDT Meeting', section: '23.10',
    category: 'Clinical Operations',
    responsible: 'Program Director (Chair), all MDT members',
    steps: 10,
    summary: 'Weekly structured meeting: agenda 24 hours before, each discipline prepares per-client updates, new admissions reviewed with pathway assignments, active client progress reviews, Week 4/8 formal treatment plan reviews, pre-discharge graduation assessment, risk register review, actions documented and distributed within 24 hours.',
    keyActions: ['Agenda prepared 24 hours before', 'Quorum: Program Director + Clinical Lead + 1 other', 'Review all new admissions with pathway assignment', 'Week 4 / Week 8 formal treatment plan reviews', 'Pre-discharge: assess against 6 graduation criteria', 'Minutes distributed within 24 hours'],
  },
  {
    id: 'SOP-010', title: 'Discharge & Graduation', section: '23.11',
    category: 'Admissions & Discharge',
    responsible: 'Program Director, Clinical Lead, Counsellor, Social Worker, House Master',
    steps: 12,
    summary: 'Type 1 (Graduation): MDT confirms 6 criteria, pre-discharge family meeting, PRPP finalised, aftercare plan completed, discharge assessments (AUDIT, DAST-10, PHQ-9, GAD-7, URICA, C-SSRS), discharge summary, medication supply, property return, Alumni Programme enrolment, graduation ceremony. Type 4 (AMA): MI engagement, AMA form, harm reduction counselling, safety plan, 72-hour follow-up.',
    keyActions: ['6 graduation criteria confirmed by MDT', 'PRPP finalised and printed', 'Aftercare plan: first follow-up within 7 days', 'All discharge assessments completed', 'AMA: harm reduction counselling + safety plan', 'Every client leaves with safety plan'],
  },
  {
    id: 'SOP-011', title: 'Family Visitation', section: '23.12',
    category: 'Residential Operations',
    responsible: 'House Master, Program Officer, Security',
    steps: 10,
    summary: 'Sunday 12:00-6:00 PM. Visitor registration and ID check, briefing on rules, bag/parcel inspection, designated areas only, children supervised at all times, intoxicated visitors removed, post-visit client observation.',
    keyActions: ['Register: name, relationship, ID checked', 'Bag/parcel inspection in visitor presence', 'No dormitory access', 'Children supervised by parent/guardian at all times', 'Intoxicated/disruptive visitors escorted out', 'Post-visit client check-in'],
  },
  {
    id: 'SOP-012', title: 'Urine Drug Screening (UDS)', section: '23.13',
    category: 'Clinical Operations',
    responsible: 'Nursing Staff',
    steps: 10,
    summary: 'Monthly for all residents, ad-hoc if clinical suspicion or post-pass. Refusal treated as positive. Indirect observation collection, rapid immunoassay, results documented immediately. Positive result: Clinical Lead notified within 1 hour, compassionate interview, treatment plan update.',
    keyActions: ['Monthly for all; ad-hoc if clinical suspicion', 'Refusal = positive result', 'Indirect observation collection', 'Positive: Clinical Lead notified within 1 hour', 'Compassionate interview within 24 hours', 'Treatment plan updated'],
  },
  {
    id: 'SOP-013', title: 'Outpatient Engagement Pathway', section: '23.14',
    category: 'Admissions & Discharge',
    responsible: 'Counsellor, Program Director',
    steps: 11,
    summary: 'For pre-contemplative/contemplative clients. Weekly MI sessions (45-60 min), psychoeducation, family counselling (with consent), harm reduction, voluntary spiritual engagement, URICA re-assessment every 2-4 weeks. When Action stage reached: fast-track residential admission. Maximum 6 months duration.',
    keyActions: ['First MI session within 7 days of enrolment', 'Weekly individual MI sessions (OARS)', 'URICA re-assessment every 2-4 weeks', 'When Preparation/Action stage: offer residential', 'Disengagement: 3 follow-up attempts over 2 weeks', 'Maximum 6 months; review if no progress'],
  },
  {
    id: 'SOP-014', title: 'Incident Reporting', section: '23.15',
    category: 'M&E & Compliance',
    responsible: 'All staff (reporting), Program Director (review)',
    steps: 11,
    summary: 'All incidents (medical, behavioural, falls, injuries, near-misses, safeguarding, property damage, complaints, deaths). Incident Report within 2 hours, Program Director review within 24 hours, severity categorisation, serious/critical: Board notification within 24 hours and investigation within 48 hours, quarterly trend analysis.',
    keyActions: ['Incident Report Form within 2 hours', 'Program Director review within 24 hours', 'Serious/Critical: Board notification within 24 hours', 'Investigation within 48 hours', 'Reviewed at next MDT', 'Quarterly trend analysis to Board'],
  },
  {
    id: 'SOP-015', title: 'Aftercare Contact', section: '23.16',
    category: 'M&E & Compliance',
    responsible: 'Assigned Aftercare Counsellor',
    steps: 12,
    summary: '24-month structured monitoring. First contact within 7 days. Months 1-3: weekly. Months 4-6: bi-weekly. Months 7-12: monthly. Year 2: monthly with bi-monthly visits. Outcome Snapshots at 3, 6, 12, 24 months. Relapse response within 48 hours. Lost to follow-up after 6 failed attempts over 4 weeks.',
    keyActions: ['First contact within 7 days of discharge', 'Months 1-3: weekly phone contact', 'Outcome Snapshots at 3, 6, 12, 24 months', 'Relapse detected: compassionate outreach within 48 hours', 'All contacts documented in Aftercare Contact Log', 'Case closure at Month 24 if stable'],
  },
  {
    id: 'SOP-016', title: 'Pass Management', section: '23.17',
    category: 'Residential Operations',
    responsible: 'Program Director, Counsellor, House Master',
    steps: 11,
    summary: 'Client requests through counsellor, eligibility assessed, Program Director approves/denies, Pass Form completed (destination, contact, times), pre-pass briefing, sign-out/sign-in register, mid-pass check-in call, post-return assessment for substance use (UDS if suspicion), late return escalation (2 hours → Program Director, 6 hours → Abscondment SOP).',
    keyActions: ['Counsellor assesses eligibility and recommends', 'Program Director approves or denies', 'Pass Form: destination, contact, departure/return times', 'Pre-pass briefing on expectations', 'Post-return behavioural assessment', '2 hours late → Program Director; 6 hours → SOP-008'],
  },
]

const CATEGORIES = [...new Set(SOPS.map(s => s.category))]

export default function SOPLibrary() {
  const [selectedSOP, setSelectedSOP] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [acknowledgements, setAcknowledgements] = useState({})

  const filtered = categoryFilter === 'all' ? SOPS : SOPS.filter(s => s.category === categoryFilter)

  const handleAcknowledge = (sopId) => {
    setAcknowledgements(prev => ({
      ...prev,
      [sopId]: { acknowledgedAt: new Date().toISOString(), acknowledgedBy: 'Current User' }
    }))
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Standard Operating Procedures</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
          {SOPS.length} SOPs per Treatment Protocol Section 23 · {Object.keys(acknowledgements).length}/{SOPS.length} acknowledged
        </p>
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`btn btn--sm ${categoryFilter === 'all' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setCategoryFilter('all')}>
          All ({SOPS.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = SOPS.filter(s => s.category === cat).length
          return (
            <button key={cat} className={`btn btn--sm ${categoryFilter === cat ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setCategoryFilter(cat)}>
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {/* SOP List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(sop => {
          const isAcknowledged = !!acknowledgements[sop.id]
          const isExpanded = selectedSOP === sop.id

          return (
            <div key={sop.id} className="card" style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 200, cursor: 'pointer' }} onClick={() => setSelectedSOP(isExpanded ? null : sop.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 36, height: 36, borderRadius: 8,
                      background: isAcknowledged ? 'rgba(26,122,74,.1)' : 'rgba(26,95,173,.08)',
                      color: isAcknowledged ? '#1A7A4A' : 'var(--blue)',
                      fontSize: '.72rem', fontWeight: 800, flexShrink: 0,
                    }}>
                      {sop.id.replace('SOP-', '')}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--charcoal)' }}>{sop.title}</div>
                      <div style={{ fontSize: '.74rem', color: 'var(--g500)' }}>
                        Section {sop.section} · {sop.steps} steps · {sop.responsible.split(',')[0]}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    padding: '3px 9px', borderRadius: 12, fontSize: '.68rem', fontWeight: 700,
                    background: isAcknowledged ? 'rgba(26,122,74,.1)' : 'rgba(229,62,62,.08)',
                    color: isAcknowledged ? '#1A7A4A' : '#E53E3E',
                  }}>
                    {isAcknowledged ? 'Acknowledged' : 'Pending'}
                  </span>
                  <span style={{
                    padding: '3px 9px', borderRadius: 12, fontSize: '.68rem', fontWeight: 600,
                    background: 'rgba(26,95,173,.06)', color: 'var(--blue)',
                  }}>
                    {sop.category}
                  </span>
                </div>
              </div>

              {/* Expanded view */}
              {isExpanded && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--g200)' }}>
                  <p style={{ fontSize: '.85rem', color: 'var(--g700)', lineHeight: 1.6, marginBottom: 14 }}>{sop.summary}</p>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: '.76rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>Key Actions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {sop.keyActions.map((action, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '.82rem', color: 'var(--g700)' }}>
                          <span style={{ color: 'var(--blue)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: '.78rem', color: 'var(--g500)', marginBottom: 14 }}>
                    <strong>Responsible:</strong> {sop.responsible}
                  </div>

                  {!isAcknowledged ? (
                    <button className="btn btn--primary btn--sm" onClick={() => handleAcknowledge(sop.id)}>
                      Acknowledge SOP
                    </button>
                  ) : (
                    <div style={{ fontSize: '.76rem', color: '#1A7A4A', fontWeight: 600 }}>
                      Acknowledged on {new Date(acknowledgements[sop.id].acknowledgedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
