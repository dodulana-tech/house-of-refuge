import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Personal Relapse Prevention Plan (PRPP) Builder —
  Graduation requirement per Treatment Protocol Section 8.4.
  Every client must develop a written PRPP before completing the programme.
  Graduation Criterion #4: Relapse Prevention Competence.
  Initials only (HIPAA). All fields are selects/checkboxes — zero free text.
*/

const PATIENTS = [
  { id: 'P001', initials: 'CO' },
  { id: 'P002', initials: 'AN' },
  { id: 'P003', initials: 'KA' },
  { id: 'P004', initials: 'IM' },
]

const STAFF_OPTIONS = [
  { value: 'AI', label: 'AI — Clinical Lead' },
  { value: 'FA', label: 'FA — Nurse' },
  { value: 'PK', label: 'PK — Chaplain' },
  { value: 'SN', label: 'SN — Social Worker' },
  { value: 'MO', label: 'MO — Support Staff' },
  { value: 'TA', label: 'TA — Counsellor' },
  { value: 'HM', label: 'HM — Nurse' },
]

const TRIGGER_CATEGORIES = [
  {
    key: 'people',
    label: 'People Triggers',
    options: [
      'Former using friends',
      'Dealers',
      'Romantic partner associated with use',
      'Family members who enable',
      'Work colleagues who use',
      'Other',
    ],
  },
  {
    key: 'places',
    label: 'Places Triggers',
    options: [
      'Bars/clubs',
      'Former neighbourhood',
      'Specific routes',
      'Dealer locations',
      'Social venues',
      'Work environment',
      'Other',
    ],
  },
  {
    key: 'feelings',
    label: 'Feelings Triggers',
    options: [
      'Anger',
      'Loneliness',
      'Boredom',
      'Anxiety',
      'Shame',
      'Sadness',
      'Frustration',
      'Excitement',
      'Stress',
      'Other',
    ],
  },
  {
    key: 'situations',
    label: 'Situations Triggers',
    options: [
      'Financial pressure',
      'Arguments',
      'Celebrations',
      'Paydays',
      'Relationship conflict',
      'Job loss',
      'Peer pressure',
      'Being alone',
      'Other',
    ],
  },
  {
    key: 'times',
    label: 'Times Triggers',
    options: [
      'Evenings',
      'Weekends',
      'Holidays',
      'Paydays',
      'Seasonal (rainy season)',
      'After work',
      'Friday nights',
      'Other',
    ],
  },
]

const COPING_STRATEGIES = [
  'Deep breathing exercises',
  'Call sponsor/accountability partner',
  'Attend NA/AA or church-based recovery group',
  'Physical exercise',
  'Prayer and meditation on Scripture',
  'Journaling',
  'Contact crisis helpline (09011277600)',
  'Remove self from triggering environment',
  'Grounding techniques (5-4-3-2-1)',
  'Engage in hobby or creative activity',
  'Talk to trusted family member',
  'Read Bible / devotional material',
]

const SUPPORT_ROLES = [
  { key: 'sponsor', label: 'Sponsor / accountability partner' },
  { key: 'familyOrSocial', label: 'Primary Family Support Person (Pathway A) / Social Worker (Pathway B)' },
  { key: 'pastor', label: 'Church pastor or Life Centre leader' },
  { key: 'fellowship', label: 'NA/AA home group or recovery fellowship' },
]

const HOSPITAL_OPTIONS = [
  'Yaba Psychiatric Hospital',
  'Lagos University Teaching Hospital',
  'General Hospital Lagos',
  'Other',
]

// Demo data
const INITIAL_PRPP_DATA = {
  CO: {
    triggers: {
      people: ['Former using friends', 'Dealers', 'Work colleagues who use'],
      places: ['Bars/clubs', 'Former neighbourhood', 'Dealer locations'],
      feelings: ['Anger', 'Loneliness', 'Boredom', 'Stress'],
      situations: ['Financial pressure', 'Peer pressure', 'Being alone'],
      times: ['Evenings', 'Friday nights', 'Paydays'],
    },
    copingStrategies: [
      'Deep breathing exercises',
      'Call sponsor/accountability partner',
      'Attend NA/AA or church-based recovery group',
      'Physical exercise',
      'Prayer and meditation on Scripture',
      'Grounding techniques (5-4-3-2-1)',
    ],
    supportNetwork: {
      sponsor: 'Identified',
      familyOrSocial: 'Identified',
      pastor: 'Identified',
      fellowship: 'Identified',
    },
    emergency: {
      hospital: 'Yaba Psychiatric Hospital',
      emergencyContact: 'Identified',
    },
    lastUpdated: '2026-03-28T14:30:00',
    updatedBy: 'TA',
  },
  AN: {
    triggers: {
      people: ['Former using friends', 'Romantic partner associated with use'],
      places: ['Bars/clubs', 'Social venues'],
      feelings: ['Loneliness', 'Anxiety', 'Sadness'],
      situations: ['Arguments', 'Relationship conflict'],
      times: ['Evenings', 'Weekends'],
    },
    copingStrategies: [
      'Journaling',
      'Physical exercise',
      'Talk to trusted family member',
    ],
    supportNetwork: {
      sponsor: 'Not yet identified',
      familyOrSocial: 'Identified',
      pastor: 'Not yet identified',
      fellowship: 'Not yet identified',
    },
    emergency: {
      hospital: '',
      emergencyContact: 'Not yet identified',
    },
    lastUpdated: '2026-03-20T10:15:00',
    updatedBy: 'TA',
  },
  KA: {
    triggers: {
      people: [],
      places: [],
      feelings: [],
      situations: [],
      times: [],
    },
    copingStrategies: [],
    supportNetwork: {
      sponsor: 'Not yet identified',
      familyOrSocial: 'Not yet identified',
      pastor: 'Not yet identified',
      fellowship: 'Not yet identified',
    },
    emergency: {
      hospital: '',
      emergencyContact: 'Not yet identified',
    },
    lastUpdated: null,
    updatedBy: null,
  },
  IM: {
    triggers: {
      people: ['Former using friends', 'Dealers'],
      places: ['Bars/clubs', 'Former neighbourhood', 'Dealer locations'],
      feelings: ['Anger', 'Boredom', 'Frustration', 'Stress'],
      situations: ['Financial pressure', 'Paydays', 'Peer pressure'],
      times: ['Evenings', 'Weekends', 'Friday nights'],
    },
    copingStrategies: [
      'Deep breathing exercises',
      'Physical exercise',
      'Remove self from triggering environment',
    ],
    supportNetwork: {
      sponsor: 'Not yet identified',
      familyOrSocial: 'Not yet identified',
      pastor: 'Not yet identified',
      fellowship: 'Not yet identified',
    },
    emergency: {
      hospital: '',
      emergencyContact: 'Not yet identified',
    },
    lastUpdated: '2026-03-25T09:45:00',
    updatedBy: 'SN',
  },
}

function calculateCompletionStatus(data) {
  if (!data) return 'Not Started'

  const triggersComplete = TRIGGER_CATEGORIES.every(
    (cat) => data.triggers[cat.key] && data.triggers[cat.key].length > 0
  )
  const copingComplete = data.copingStrategies.length >= 5
  const supportComplete = SUPPORT_ROLES.every(
    (role) => data.supportNetwork[role.key] === 'Identified'
  )
  const emergencyComplete =
    data.emergency.hospital !== '' &&
    data.emergency.emergencyContact === 'Identified'

  const hasAnyData =
    TRIGGER_CATEGORIES.some((cat) => data.triggers[cat.key] && data.triggers[cat.key].length > 0) ||
    data.copingStrategies.length > 0 ||
    SUPPORT_ROLES.some((role) => data.supportNetwork[role.key] === 'Identified') ||
    data.emergency.hospital !== '' ||
    data.emergency.emergencyContact === 'Identified'

  if (triggersComplete && copingComplete && supportComplete && emergencyComplete) {
    return 'Complete'
  }
  if (hasAnyData) {
    return 'In Progress'
  }
  return 'Not Started'
}

function getStatusBadgeStyle(status) {
  if (status === 'Complete') {
    return {
      display: 'inline-block',
      padding: '4px 14px',
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 700,
      color: '#276749',
      background: '#F0FFF4',
      border: '1px solid #C6F6D5',
    }
  }
  if (status === 'In Progress') {
    return {
      display: 'inline-block',
      padding: '4px 14px',
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 700,
      color: '#C05621',
      background: '#FFFAF0',
      border: '1px solid #FEEBC8',
    }
  }
  return {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    color: '#C53030',
    background: '#FFF5F5',
    border: '1px solid #FED7D7',
  }
}

function getGraduationBadge(status) {
  if (status === 'Complete') {
    return {
      text: 'PRPP Complete — Graduation Criterion #4 Met',
      color: '#276749',
      bg: '#F0FFF4',
      border: '#C6F6D5',
    }
  }
  if (status === 'In Progress') {
    return {
      text: 'PRPP In Progress',
      color: '#C05621',
      bg: '#FFFAF0',
      border: '#FEEBC8',
    }
  }
  return {
    text: 'PRPP Not Started',
    color: '#C53030',
    bg: '#FFF5F5',
    border: '#FED7D7',
  }
}

export default function PRPPBuilder() {
  const { user } = useAuth()
  const [selectedPatient, setSelectedPatient] = useState('CO')
  const [prppData, setPrppData] = useState(INITIAL_PRPP_DATA)
  const [expandedSections, setExpandedSections] = useState({
    triggers: true,
    coping: false,
    support: false,
    emergency: false,
  })

  const data = prppData[selectedPatient]
  const completionStatus = calculateCompletionStatus(data)
  const gradBadge = getGraduationBadge(completionStatus)

  const triggersFilledCount = TRIGGER_CATEGORIES.filter(
    (cat) => data.triggers[cat.key] && data.triggers[cat.key].length > 0
  ).length
  const copingCount = data.copingStrategies.length

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const toggleTrigger = (categoryKey, option) => {
    setPrppData((prev) => {
      const current = prev[selectedPatient].triggers[categoryKey] || []
      const updated = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
      return {
        ...prev,
        [selectedPatient]: {
          ...prev[selectedPatient],
          triggers: {
            ...prev[selectedPatient].triggers,
            [categoryKey]: updated,
          },
          lastUpdated: new Date().toISOString(),
          updatedBy: 'AI',
        },
      }
    })
  }

  const toggleCoping = (strategy) => {
    setPrppData((prev) => {
      const current = prev[selectedPatient].copingStrategies
      const updated = current.includes(strategy)
        ? current.filter((s) => s !== strategy)
        : [...current, strategy]
      return {
        ...prev,
        [selectedPatient]: {
          ...prev[selectedPatient],
          copingStrategies: updated,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'AI',
        },
      }
    })
  }

  const updateSupportNetwork = (roleKey, value) => {
    setPrppData((prev) => ({
      ...prev,
      [selectedPatient]: {
        ...prev[selectedPatient],
        supportNetwork: {
          ...prev[selectedPatient].supportNetwork,
          [roleKey]: value,
        },
        lastUpdated: new Date().toISOString(),
        updatedBy: 'AI',
      },
    }))
  }

  const updateEmergency = (field, value) => {
    setPrppData((prev) => ({
      ...prev,
      [selectedPatient]: {
        ...prev[selectedPatient],
        emergency: {
          ...prev[selectedPatient].emergency,
          [field]: value,
        },
        lastUpdated: new Date().toISOString(),
        updatedBy: 'AI',
      },
    }))
  }

  const sectionHeaderStyle = (isExpanded) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    cursor: 'pointer',
    userSelect: 'none',
    borderRadius: isExpanded ? '12px 12px 0 0' : 12,
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderBottom: isExpanded ? '1px solid #E2E8F0' : '1px solid #E2E8F0',
  })

  const sectionBodyStyle = {
    padding: 20,
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderTop: 'none',
    borderRadius: '0 0 12px 12px',
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header + Patient Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            Personal Relapse Prevention Plan
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            PRPP Builder — Treatment Protocol Section 8.4 (Graduation Requirement)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={getStatusBadgeStyle(completionStatus)}>{completionStatus}</span>
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
              <option key={p.id} value={p.initials}>{p.initials}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Graduation Readiness Card */}
      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 20,
          borderRadius: 12,
          background: gradBadge.bg,
          border: `2px solid ${gradBadge.border}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: gradBadge.color, margin: '0 0 6px' }}>
              Graduation Criterion #4: Relapse Prevention Competence
            </h2>
            <p style={{ fontSize: 13, color: '#4A5568', margin: 0 }}>
              Every client must develop a written Personal Relapse Prevention Plan before programme completion.
            </p>
          </div>
          <span
            style={{
              display: 'inline-block',
              padding: '8px 18px',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 700,
              color: gradBadge.color,
              background: '#fff',
              border: `2px solid ${gradBadge.border}`,
              whiteSpace: 'nowrap',
            }}
          >
            {gradBadge.text}
          </span>
        </div>

        {/* Completion checklist */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16, fontSize: 13 }}>
          <span style={{ color: triggersFilledCount === 5 ? '#276749' : '#A0AEC0', fontWeight: 600 }}>
            {triggersFilledCount === 5 ? '[done]' : '[  ]'} Triggers: {triggersFilledCount}/5 categories
          </span>
          <span style={{ color: copingCount >= 5 ? '#276749' : '#A0AEC0', fontWeight: 600 }}>
            {copingCount >= 5 ? '[done]' : '[  ]'} Coping Strategies: {copingCount}/5 minimum
          </span>
          <span
            style={{
              color: SUPPORT_ROLES.every((r) => data.supportNetwork[r.key] === 'Identified') ? '#276749' : '#A0AEC0',
              fontWeight: 600,
            }}
          >
            {SUPPORT_ROLES.every((r) => data.supportNetwork[r.key] === 'Identified') ? '[done]' : '[  ]'} Support Network
          </span>
          <span
            style={{
              color: data.emergency.hospital && data.emergency.emergencyContact === 'Identified' ? '#276749' : '#A0AEC0',
              fontWeight: 600,
            }}
          >
            {data.emergency.hospital && data.emergency.emergencyContact === 'Identified' ? '[done]' : '[  ]'} Emergency Plan
          </span>
        </div>

        {data.lastUpdated && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#718096' }}>
            Last updated: {new Date(data.lastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' at '}
            {new Date(data.lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            {data.updatedBy && (
              <span> by {STAFF_OPTIONS.find((s) => s.value === data.updatedBy)?.label || data.updatedBy}</span>
            )}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* SECTION 1: TRIGGER IDENTIFICATION */}
      {/* ================================================================ */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={sectionHeaderStyle(expandedSections.triggers)}
          onClick={() => toggleSection('triggers')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#2D3748' }}>
              Section 1: Trigger Identification
            </span>
            <span
              style={{
                ...getStatusBadgeStyle(triggersFilledCount === 5 ? 'Complete' : triggersFilledCount > 0 ? 'In Progress' : 'Not Started'),
                fontSize: 11,
                padding: '2px 10px',
              }}
            >
              {triggersFilledCount}/5 categories
            </span>
          </div>
          <span style={{ fontSize: 20, color: '#718096', transform: expandedSections.triggers ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            V
          </span>
        </div>
        {expandedSections.triggers && (
          <div style={sectionBodyStyle}>
            <p style={{ fontSize: 13, color: '#718096', margin: '0 0 16px' }}>
              Identify personal triggers across 5 categories. Select all that apply in each category.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {TRIGGER_CATEGORIES.map((cat) => {
                const selected = data.triggers[cat.key] || []
                const isFilled = selected.length > 0
                return (
                  <div
                    key={cat.key}
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      border: `1px solid ${isFilled ? '#C6F6D5' : '#E2E8F0'}`,
                      background: isFilled ? '#F0FFF4' : '#FAFAFA',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: '#2D3748', margin: 0 }}>
                        {cat.label}
                      </h4>
                      <span style={{ fontSize: 11, color: isFilled ? '#276749' : '#A0AEC0', fontWeight: 600 }}>
                        {selected.length} selected
                      </span>
                    </div>
                    {cat.options.map((option) => (
                      <label
                        key={option}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          color: '#4A5568',
                          marginBottom: 8,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(option)}
                          onChange={() => toggleTrigger(cat.key, option)}
                          style={{ accentColor: '#2B6CB0' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* SECTION 2: COPING STRATEGIES */}
      {/* ================================================================ */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={sectionHeaderStyle(expandedSections.coping)}
          onClick={() => toggleSection('coping')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#2D3748' }}>
              Section 2: Coping Strategies
            </span>
            <span
              style={{
                ...getStatusBadgeStyle(copingCount >= 5 ? 'Complete' : copingCount > 0 ? 'In Progress' : 'Not Started'),
                fontSize: 11,
                padding: '2px 10px',
              }}
            >
              {copingCount} selected {copingCount < 5 ? `(min 5)` : ''}
            </span>
          </div>
          <span style={{ fontSize: 20, color: '#718096', transform: expandedSections.coping ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            V
          </span>
        </div>
        {expandedSections.coping && (
          <div style={sectionBodyStyle}>
            <p style={{ fontSize: 13, color: '#718096', margin: '0 0 8px' }}>
              Select a minimum of 5 evidence-based coping strategies. These will form your personal toolkit for managing cravings and high-risk situations.
            </p>
            {copingCount < 5 && (
              <div
                style={{
                  padding: '8px 14px',
                  marginBottom: 16,
                  borderRadius: 8,
                  background: '#FFFAF0',
                  border: '1px solid #FEEBC8',
                  fontSize: 13,
                  color: '#C05621',
                  fontWeight: 600,
                }}
              >
                {5 - copingCount} more strateg{5 - copingCount === 1 ? 'y' : 'ies'} needed to meet minimum requirement
              </div>
            )}
            {copingCount >= 5 && (
              <div
                style={{
                  padding: '8px 14px',
                  marginBottom: 16,
                  borderRadius: 8,
                  background: '#F0FFF4',
                  border: '1px solid #C6F6D5',
                  fontSize: 13,
                  color: '#276749',
                  fontWeight: 600,
                }}
              >
                Minimum requirement met ({copingCount} strategies selected)
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {COPING_STRATEGIES.map((strategy) => {
                const isSelected = data.copingStrategies.includes(strategy)
                return (
                  <label
                    key={strategy}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? '#BEE3F8' : '#E2E8F0'}`,
                      background: isSelected ? '#EBF8FF' : '#FAFAFA',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: isSelected ? '#2B6CB0' : '#4A5568',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCoping(strategy)}
                      style={{ accentColor: '#2B6CB0' }}
                    />
                    {strategy}
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* SECTION 3: RECOVERY SUPPORT NETWORK */}
      {/* ================================================================ */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={sectionHeaderStyle(expandedSections.support)}
          onClick={() => toggleSection('support')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#2D3748' }}>
              Section 3: Recovery Support Network
            </span>
            <span
              style={{
                ...getStatusBadgeStyle(
                  SUPPORT_ROLES.every((r) => data.supportNetwork[r.key] === 'Identified')
                    ? 'Complete'
                    : SUPPORT_ROLES.some((r) => data.supportNetwork[r.key] === 'Identified')
                    ? 'In Progress'
                    : 'Not Started'
                ),
                fontSize: 11,
                padding: '2px 10px',
              }}
            >
              {SUPPORT_ROLES.filter((r) => data.supportNetwork[r.key] === 'Identified').length}/{SUPPORT_ROLES.length} identified
            </span>
          </div>
          <span style={{ fontSize: 20, color: '#718096', transform: expandedSections.support ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            V
          </span>
        </div>
        {expandedSections.support && (
          <div style={sectionBodyStyle}>
            <p style={{ fontSize: 13, color: '#718096', margin: '0 0 16px' }}>
              All 4 support network roles must be identified before the PRPP is considered complete.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {SUPPORT_ROLES.map((role) => {
                const value = data.supportNetwork[role.key]
                const isIdentified = value === 'Identified'
                return (
                  <div
                    key={role.key}
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      border: `1px solid ${isIdentified ? '#C6F6D5' : '#FEEBC8'}`,
                      background: isIdentified ? '#F0FFF4' : '#FFFAF0',
                    }}
                  >
                    <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 10 }}>
                      {role.label}
                    </label>
                    <select
                      value={value}
                      onChange={(e) => updateSupportNetwork(role.key, e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E0',
                        fontSize: 14,
                        width: '100%',
                        background: '#fff',
                        color: isIdentified ? '#276749' : '#C05621',
                        fontWeight: 600,
                      }}
                    >
                      <option value="Not yet identified">Not yet identified</option>
                      <option value="Identified">Identified</option>
                    </select>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* SECTION 4: EMERGENCY PLAN */}
      {/* ================================================================ */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={sectionHeaderStyle(expandedSections.emergency)}
          onClick={() => toggleSection('emergency')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#2D3748' }}>
              Section 4: Emergency Plan
            </span>
            <span
              style={{
                ...getStatusBadgeStyle(
                  data.emergency.hospital && data.emergency.emergencyContact === 'Identified'
                    ? 'Complete'
                    : data.emergency.hospital || data.emergency.emergencyContact === 'Identified'
                    ? 'In Progress'
                    : 'Not Started'
                ),
                fontSize: 11,
                padding: '2px 10px',
              }}
            >
              {(data.emergency.hospital ? 1 : 0) + (data.emergency.emergencyContact === 'Identified' ? 1 : 0)}/2 complete
            </span>
          </div>
          <span style={{ fontSize: 20, color: '#718096', transform: expandedSections.emergency ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            V
          </span>
        </div>
        {expandedSections.emergency && (
          <div style={sectionBodyStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {/* Crisis Helpline (display only) */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: '1px solid #BEE3F8',
                  background: '#EBF8FF',
                }}
              >
                <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 10 }}>
                  Crisis Helpline Number
                </label>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#fff',
                    border: '1px solid #BEE3F8',
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#2B6CB0',
                    letterSpacing: 1,
                  }}
                >
                  09011277600
                </div>
                <p style={{ fontSize: 11, color: '#718096', margin: '6px 0 0' }}>
                  Pre-configured — available 24/7
                </p>
              </div>

              {/* Nearest Hospital */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: `1px solid ${data.emergency.hospital ? '#C6F6D5' : '#E2E8F0'}`,
                  background: data.emergency.hospital ? '#F0FFF4' : '#FAFAFA',
                }}
              >
                <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 10 }}>
                  Nearest Hospital / A&E
                </label>
                <select
                  value={data.emergency.hospital}
                  onChange={(e) => updateEmergency('hospital', e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E0',
                    fontSize: 14,
                    width: '100%',
                    background: '#fff',
                  }}
                >
                  <option value="">-- Select Hospital --</option>
                  {HOSPITAL_OPTIONS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Emergency Contact */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: `1px solid ${data.emergency.emergencyContact === 'Identified' ? '#C6F6D5' : '#FEEBC8'}`,
                  background: data.emergency.emergencyContact === 'Identified' ? '#F0FFF4' : '#FFFAF0',
                }}
              >
                <label style={{ fontWeight: 600, fontSize: 14, color: '#2D3748', display: 'block', marginBottom: 10 }}>
                  Emergency Contact Person
                </label>
                <select
                  value={data.emergency.emergencyContact}
                  onChange={(e) => updateEmergency('emergencyContact', e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E0',
                    fontSize: 14,
                    width: '100%',
                    background: '#fff',
                    color: data.emergency.emergencyContact === 'Identified' ? '#276749' : '#C05621',
                    fontWeight: 600,
                  }}
                >
                  <option value="Not yet identified">Not yet identified</option>
                  <option value="Identified">Identified</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
