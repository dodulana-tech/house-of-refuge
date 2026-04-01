import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Patient Timeline — unified chronological view of all events for a patient.
  Single-pane-of-glass view across all disciplines. Initials only (HIPAA).
  All fields are structured selects/checkboxes — zero free text.
*/

const PATIENTS = [
  { id: 'P001', initials: 'CO' },
  { id: 'P002', initials: 'AN' },
  { id: 'P003', initials: 'KA' },
  { id: 'P004', initials: 'IM' },
]

const ENTRY_TYPES = [
  'Admission',
  'Medication',
  'Clinical Note',
  'Check-in',
  'Behavioral Incident',
  'Pass',
  'Visitation',
  'MDT Review',
  'Spiritual Note',
  'Family Session',
  'Discharge',
]

const TYPE_COLORS = {
  'Admission': '#1A7A4A',
  'Medication': '#9F580A',
  'Clinical Note': '#2B6CB0',
  'Check-in': '#319795',
  'Behavioral Incident': '#E53E3E',
  'Pass': '#718096',
  'Visitation': '#805AD5',
  'MDT Review': '#C53030',
  'Spiritual Note': '#8B5CF6',
  'Family Session': '#D69E2E',
  'Discharge': '#4A5568',
}

const TIMELINE_DATA = {
  CO: [
    {
      id: 1,
      date: '2026-03-08',
      time: '09:00',
      type: 'Admission',
      author: 'FA',
      fields: {
        pathway: 'Pathway A',
        primarySubstance: 'Alcohol',
        secondarySubstance: 'Cannabis',
        ciwaScore: '18',
        ciwaLevel: 'Severe',
        admissionType: 'Voluntary',
        bedAssignment: 'A1',
      },
    },
    {
      id: 2,
      date: '2026-03-08',
      time: '10:30',
      type: 'Medication',
      author: 'FA',
      fields: {
        action: 'Started',
        medication1: 'Diazepam 10mg',
        route1: 'Oral',
        frequency1: 'TDS (3x daily)',
        medication2: 'Thiamine 100mg',
        route2: 'Oral',
        frequency2: 'OD (once daily)',
        protocol: 'CIWA-based detox',
      },
    },
    {
      id: 3,
      date: '2026-03-09',
      time: '07:00',
      type: 'Clinical Note',
      author: 'FA',
      fields: {
        noteType: 'Nursing Assessment',
        category: 'CIWA Assessment',
        ciwaScore: '14',
        ciwaLevel: 'Moderate',
        vitalsBP: '132/84',
        vitalsPulse: '86',
        tremor: 'Mild',
        diaphoresis: 'Present',
        orientation: 'Oriented x3',
      },
    },
    {
      id: 4,
      date: '2026-03-10',
      time: '07:00',
      type: 'Clinical Note',
      author: 'FA',
      fields: {
        noteType: 'Nursing Assessment',
        category: 'CIWA Assessment',
        ciwaScore: '8',
        ciwaLevel: 'Mild',
        vitalsBP: '126/80',
        vitalsPulse: '78',
        tremor: 'None',
        diaphoresis: 'Resolved',
        orientation: 'Oriented x3',
      },
    },
    {
      id: 5,
      date: '2026-03-12',
      time: '14:00',
      type: 'Clinical Note',
      author: 'AI',
      fields: {
        noteType: 'Individual CBT',
        sessionNumber: '1',
        engagement: 'Good',
        stageOfChange: 'Contemplation',
        topicsCovered: 'Triggers identification',
        homeworkAssigned: 'Thought record',
        nextSessionDate: '2026-03-14',
      },
    },
    {
      id: 6,
      date: '2026-03-14',
      time: '08:00',
      type: 'Clinical Note',
      author: 'FA',
      fields: {
        noteType: 'Nursing Review',
        category: 'Week 1 Review',
        vitalsBP: '122/78',
        vitalsPulse: '74',
        vitalsTemp: '36.6',
        weight: '73kg',
        vitalsStatus: 'Stable',
        appetiteStatus: 'Improving',
        sleepQuality: 'Fair',
      },
    },
    {
      id: 7,
      date: '2026-03-15',
      time: '19:45',
      type: 'Behavioral Incident',
      author: 'MO',
      fields: {
        tier: 'Tier 1',
        category: 'Dormitory cleanliness',
        location: 'Dormitory A',
        response: 'Verbal reminder',
        escalated: 'No',
        patientResponse: 'Compliant',
        followUp: 'Counsellor notification',
      },
    },
    {
      id: 8,
      date: '2026-03-17',
      time: '06:30',
      type: 'Spiritual Note',
      author: 'PK',
      fields: {
        activity: 'Morning prayer',
        engagement: 'Active participation',
        spiritualInterest: 'Asked faith questions',
        devotionAttendance: 'Present',
        bibleStudy: 'Not yet started',
        chaplainFollowUp: 'Scheduled',
      },
    },
    {
      id: 9,
      date: '2026-03-19',
      time: '10:00',
      type: 'Check-in',
      author: 'AI',
      fields: {
        mood: '3/5',
        cravings: '3/5',
        sleep: 'Fair',
        appetite: 'Good',
        programmeEngagement: 'Moderate',
        peerRelationships: 'Developing',
        concerns: 'Family contact',
      },
    },
    {
      id: 10,
      date: '2026-03-21',
      time: '09:00',
      type: 'Clinical Note',
      author: 'FA',
      fields: {
        noteType: 'Nursing Assessment',
        category: 'Phase Transition',
        detoxStatus: 'Complete',
        ciwaScore: '2',
        ciwaLevel: 'Negligible',
        medicationChange: 'Diazepam tapered off',
        newPhase: 'Phase 2 — Active Treatment',
        vitalsBP: '120/76',
      },
    },
    {
      id: 11,
      date: '2026-03-22',
      time: '11:00',
      type: 'Clinical Note',
      author: 'AI',
      fields: {
        noteType: 'Treatment Planning',
        model: 'Columbia Model',
        planDuration: '72hrs initial',
        goalsSet: '3',
        primaryGoal: 'Alcohol abstinence maintenance',
        secondaryGoal: 'Trigger management',
        tertiaryGoal: 'Family relationship repair',
      },
    },
    {
      id: 12,
      date: '2026-03-24',
      time: '14:00',
      type: 'Clinical Note',
      author: 'AI',
      fields: {
        noteType: 'Group CBT',
        sessionTopic: 'Cognitive distortions',
        participation: 'Active',
        peerInteraction: 'Supportive',
        skillDemonstrated: 'Identifying distortions',
        groupRole: 'Contributor',
      },
    },
    {
      id: 13,
      date: '2026-03-25',
      time: '14:00',
      type: 'Family Session',
      author: 'SN',
      fields: {
        sessionNumber: '1',
        pathway: 'Pathway A',
        pfspPresent: 'Yes',
        pfspInitials: 'AO',
        pfspRelationship: 'Mother',
        focusArea: 'Initial assessment & expectations',
        familyEngagement: 'Cooperative',
        nextSessionPlanned: 'Yes',
      },
    },
    {
      id: 14,
      date: '2026-03-27',
      time: '10:00',
      type: 'Check-in',
      author: 'AI',
      fields: {
        mood: '4/5',
        cravings: '2/5',
        sleep: 'Good',
        appetite: 'Good',
        programmeEngagement: 'High',
        peerRelationships: 'Good',
        concerns: 'None reported',
      },
    },
    {
      id: 15,
      date: '2026-03-29',
      time: '09:00',
      type: 'MDT Review',
      author: 'AI',
      fields: {
        reviewType: 'Week 3 Approaching',
        attendees: 'AI, FA, PK, SN, MO',
        overallProgress: 'On track',
        phaseStatus: 'Phase 2 — Active Treatment',
        riskLevel: 'Low',
        treatmentPlanAdherence: 'Good',
        nextReviewDate: '2026-04-05',
      },
    },
    {
      id: 16,
      date: '2026-03-30',
      time: '10:00',
      type: 'Check-in',
      author: 'AI',
      fields: {
        mood: '4/5',
        cravings: '2/5',
        sleep: 'Good',
        appetite: 'Good',
        programmeEngagement: 'High',
        peerRelationships: 'Strong',
        concerns: 'Bible study "powerful"',
      },
    },
  ],
  AN: [
    {
      id: 101,
      date: '2026-02-20',
      time: '10:00',
      type: 'Admission',
      author: 'FA',
      fields: {
        pathway: 'Pathway A',
        primarySubstance: 'Tramadol',
        secondarySubstance: 'Codeine',
        ciwaScore: 'N/A — Opioid protocol',
        admissionType: 'Voluntary',
        bedAssignment: 'A3',
      },
    },
    {
      id: 102,
      date: '2026-03-15',
      time: '14:00',
      type: 'Clinical Note',
      author: 'AI',
      fields: {
        noteType: 'Individual CBT',
        sessionNumber: '4',
        engagement: 'Good',
        stageOfChange: 'Preparation',
        topicsCovered: 'Relapse prevention',
      },
    },
    {
      id: 103,
      date: '2026-03-28',
      time: '10:00',
      type: 'Check-in',
      author: 'FA',
      fields: {
        mood: '4/5',
        cravings: '1/5',
        sleep: 'Good',
        appetite: 'Good',
        programmeEngagement: 'High',
      },
    },
  ],
  KA: [
    {
      id: 201,
      date: '2026-01-15',
      time: '09:00',
      type: 'Admission',
      author: 'FA',
      fields: {
        pathway: 'Pathway B',
        primarySubstance: 'Cannabis',
        secondarySubstance: 'None',
        admissionType: 'Community referral',
        bedAssignment: 'B2',
      },
    },
    {
      id: 202,
      date: '2026-03-20',
      time: '11:00',
      type: 'Clinical Note',
      author: 'AI',
      fields: {
        noteType: 'Life Skills',
        category: 'Vocational assessment',
        skillArea: 'Carpentry',
        aptitude: 'Strong',
        recommendation: 'Community placement',
      },
    },
  ],
  IM: [
    {
      id: 301,
      date: '2026-03-23',
      time: '08:00',
      type: 'Admission',
      author: 'FA',
      fields: {
        pathway: 'Pathway A',
        primarySubstance: 'Heroin',
        secondarySubstance: 'Benzodiazepines',
        admissionType: 'Voluntary',
        bedAssignment: 'A4',
      },
    },
    {
      id: 302,
      date: '2026-03-28',
      time: '07:00',
      type: 'Clinical Note',
      author: 'FA',
      fields: {
        noteType: 'Nursing Assessment',
        category: 'Withdrawal monitoring',
        vitalsBP: '134/88',
        vitalsPulse: '92',
        withdrawalPhase: 'Active',
        symptoms: 'Muscle aches, insomnia',
      },
    },
  ],
}

const badgeStyle = (type) => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 700,
  color: '#fff',
  background: TYPE_COLORS[type] || '#718096',
  letterSpacing: 0.3,
  whiteSpace: 'nowrap',
})

export default function PatientTimeline() {
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState('CO')
  const [visibleTypes, setVisibleTypes] = useState(
    ENTRY_TYPES.reduce((acc, t) => ({ ...acc, [t]: true }), {})
  )

  const entries = (TIMELINE_DATA[selectedPatient] || [])
    .filter((e) => visibleTypes[e.type])
    .sort((a, b) => {
      const dateComp = b.date.localeCompare(a.date)
      if (dateComp !== 0) return dateComp
      return b.time.localeCompare(a.time)
    })

  const toggleType = (type) => {
    setVisibleTypes((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  const selectAll = () =>
    setVisibleTypes(ENTRY_TYPES.reduce((acc, t) => ({ ...acc, [t]: true }), {}))
  const selectNone = () =>
    setVisibleTypes(ENTRY_TYPES.reduce((acc, t) => ({ ...acc, [t]: false }), {}))

  const renderFields = (fields) =>
    Object.entries(fields).map(([key, value]) => (
      <span
        key={key}
        style={{
          display: 'inline-block',
          marginRight: 12,
          marginBottom: 2,
          fontSize: 13,
          color: '#4A5568',
        }}
      >
        <span style={{ fontWeight: 600, color: '#2D3748', textTransform: 'capitalize' }}>
          {key.replace(/([A-Z])/g, ' $1').trim()}:
        </span>{' '}
        {value}
      </span>
    ))

  const getDayLabel = (dateStr) => {
    const allDates = (TIMELINE_DATA[selectedPatient] || []).map((e) => e.date).sort()
    if (allDates.length === 0) return ''
    const admissionDate = allDates[0]
    const diff = Math.floor(
      (new Date(dateStr) - new Date(admissionDate)) / (1000 * 60 * 60 * 24)
    )
    return `Day ${diff + 1}`
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            Patient Timeline
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            Unified chronological view across all disciplines
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Patient:</label>
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E0',
              fontSize: 14,
              fontWeight: 600,
              background: '#fff',
            }}
          >
            {PATIENTS.map((p) => (
              <option key={p.id} value={p.initials}>
                {p.initials}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Type Filters */}
      <div
        className="card"
        style={{
          padding: 16,
          marginBottom: 20,
          background: '#F7FAFC',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#2D3748' }}>
            Filter by Type
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={selectAll}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #CBD5E0',
                background: '#fff',
                cursor: 'pointer',
                color: '#2D3748',
              }}
            >
              Select All
            </button>
            <button
              onClick={selectNone}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #CBD5E0',
                background: '#fff',
                cursor: 'pointer',
                color: '#2D3748',
              }}
            >
              Clear All
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {ENTRY_TYPES.map((type) => (
            <label
              key={type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontSize: 13,
                color: '#4A5568',
              }}
            >
              <input
                type="checkbox"
                checked={visibleTypes[type]}
                onChange={() => toggleType(type)}
                style={{ accentColor: TYPE_COLORS[type] }}
              />
              <span style={badgeStyle(type)}>{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 16, fontSize: 13, color: '#718096' }}>
        Showing {entries.length} of {(TIMELINE_DATA[selectedPatient] || []).length} entries for{' '}
        <strong>{selectedPatient}</strong>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 28 }}>
        {/* Vertical line */}
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: 0,
            bottom: 0,
            width: 2,
            background: '#CBD5E0',
            borderRadius: 1,
          }}
        />

        {entries.length === 0 && (
          <div
            className="card"
            style={{
              padding: 32,
              textAlign: 'center',
              color: '#A0AEC0',
              borderRadius: 12,
              border: '1px solid #E2E8F0',
              background: '#fff',
            }}
          >
            No timeline entries match the selected filters.
          </div>
        )}

        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{ position: 'relative', marginBottom: 12 }}
          >
            {/* Timeline dot */}
            <div
              style={{
                position: 'absolute',
                left: -22,
                top: 16,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: TYPE_COLORS[entry.type] || '#718096',
                border: '2px solid #fff',
                boxShadow: '0 0 0 2px ' + (TYPE_COLORS[entry.type] || '#718096'),
              }}
            />

            <div
              className="card"
              style={{
                padding: '14px 18px',
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#2D3748',
                    minWidth: 65,
                  }}
                >
                  {getDayLabel(entry.date)}
                </span>
                <span style={{ fontSize: 12, color: '#718096' }}>
                  {entry.date} {entry.time}
                </span>
                <span style={badgeStyle(entry.type)}>{entry.type}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#4A5568',
                    background: '#EDF2F7',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  {entry.author}
                </span>
              </div>
              <div style={{ lineHeight: 1.7 }}>{renderFields(entry.fields)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
