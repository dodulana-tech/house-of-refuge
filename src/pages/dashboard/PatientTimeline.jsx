import React, { useState, useEffect, useCallback } from 'react'
import {
  isSupabaseReady,
  getPatients,
  getCheckins,
  getClinicalNotes,
  getUdsTests,
  getMedications,
  getLabTests,
  getDetoxRecords,
  getAssessments,
  getIncidents,
  getVisitations,
} from '../../utils/supabase'
import { activeBriefs } from '../../utils/patients'

/*
  Patient Timeline — unified chronological view of all events for a patient.
  Single-pane-of-glass view across all disciplines. Initials only (HIPAA).
  Aggregated live from the clinical/residential domain tables. Read-only.
*/

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

// Split a timestamptz / date string into { date: 'YYYY-MM-DD', time: 'HH:MM' }.
const splitDateTime = (ts) => {
  if (!ts) return { date: '', time: '' }
  const s = String(ts)
  const date = s.slice(0, 10)
  const clock = s.slice(11, 16)
  return { date, time: /^\d{2}:\d{2}$/.test(clock) ? clock : '' }
}

// Drop null/undefined/'' values so renderFields only shows populated fields.
const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
  )

// Normalise every live source into the timeline event shape the JSX renders:
// { id, date, time, type, author, fields }. Never fabricates rows.
function normaliseEvents({
  checkins,
  notes,
  uds,
  meds,
  labs,
  detox,
  assessments,
  incidents,
  visits,
}) {
  const events = []

  for (const c of checkins || []) {
    const { date, time } = splitDateTime(c.created_at)
    events.push({
      id: `checkin-${c.id}`,
      date,
      time,
      type: 'Check-in',
      author: 'Resident',
      fields: compact({
        mood: c.mood != null ? `${c.mood}/5` : '',
        cravings: c.cravings != null ? `${c.cravings}/5` : '',
        anxiety: c.anxiety != null ? `${c.anxiety}/5` : '',
      }),
    })
  }

  for (const n of notes || []) {
    const { date, time } = splitDateTime(n.created_at)
    events.push({
      id: `note-${n.id}`,
      date,
      time,
      type: 'Clinical Note',
      author: n.author_code || '—',
      fields: compact({
        noteType: n.type,
        subjective: n.subjective,
        objective: n.objective,
        assessment: n.assessment,
        plan: n.plan,
      }),
    })
  }

  for (const u of uds || []) {
    const { date, time } = splitDateTime(u.test_date)
    const substances =
      u.substances && typeof u.substances === 'object' ? u.substances : {}
    events.push({
      id: `uds-${u.id}`,
      date,
      time,
      type: 'Clinical Note',
      author: u.ordered_by_code || '—',
      fields: compact({ test: 'Urine Drug Screen', reason: u.reason, ...substances }),
    })
  }

  for (const m of meds || []) {
    const { date, time } = splitDateTime(m.start_date)
    events.push({
      id: `med-${m.id}`,
      date,
      time,
      type: 'Medication',
      author: m.prescriber_code || '—',
      fields: compact({
        medication: m.name,
        dose: m.dose,
        route: m.route,
        frequency: m.frequency,
        status: m.status,
      }),
    })
  }

  for (const l of labs || []) {
    const { date, time } = splitDateTime(l.ordered_date)
    events.push({
      id: `lab-${l.id}`,
      date,
      time,
      type: 'Medication',
      author: l.ordered_by_code || '—',
      fields: compact({ labPanel: l.panel, status: l.status }),
    })
  }

  for (const d of detox || []) {
    const { date, time } = splitDateTime(d.created_at)
    events.push({
      id: `detox-${d.id}`,
      date,
      time,
      type: 'Medication',
      author: d.recorded_by_code || '—',
      fields: compact({
        detoxScale: d.scale,
        score: d.score != null ? String(d.score) : '',
        day: d.day != null ? String(d.day) : '',
        medsGiven: d.meds_given,
      }),
    })
  }

  for (const a of assessments || []) {
    const { date, time } = splitDateTime(a.created_at)
    events.push({
      id: `assessment-${a.id}`,
      date,
      time,
      type: 'Clinical Note',
      author: a.assessed_by_code || '—',
      fields: compact({
        assessment: a.type,
        score: a.score != null ? String(a.score) : '',
        level: a.level,
      }),
    })
  }

  for (const i of incidents || []) {
    const { date, time } = splitDateTime(i.created_at)
    events.push({
      id: `incident-${i.id}`,
      date,
      time,
      type: 'Behavioral Incident',
      author: '—',
      fields: compact({
        tier: i.tier != null ? `Tier ${i.tier}` : '',
        category: i.type,
        description: i.description,
        response: i.response,
        status: i.status,
      }),
    })
  }

  for (const v of visits || []) {
    const { date, time } = splitDateTime(v.visit_date)
    events.push({
      id: `visit-${v.id}`,
      date,
      time: time || v.visit_time || '',
      type: 'Visitation',
      author: v.requested_by_name || '—',
      fields: compact({
        visitors: v.visitors,
        status: v.status,
        notes: v.notes,
      }),
    })
  }

  return events.sort((a, b) => {
    const dateComp = (b.date || '').localeCompare(a.date || '')
    if (dateComp !== 0) return dateComp
    return (b.time || '').localeCompare(a.time || '')
  })
}

export default function PatientTimeline() {
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [events, setEvents] = useState([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [visibleTypes, setVisibleTypes] = useState(
    ENTRY_TYPES.reduce((acc, t) => ({ ...acc, [t]: true }), {})
  )

  const initialsById = Object.fromEntries(patients.map((p) => [p.id, p.initials]))

  // Load the active-resident roster for the selector.
  useEffect(() => {
    let cancelled = false
    const loadRoster = async () => {
      if (!isSupabaseReady()) {
        if (!cancelled) setLoadingPatients(false)
        return
      }
      setLoadingPatients(true)
      const { data: rows } = await getPatients()
      if (cancelled) return
      const briefs = activeBriefs(rows)
      setPatients(briefs)
      setSelectedPatient((prev) => prev || (briefs[0]?.id ?? ''))
      setLoadingPatients(false)
    }
    loadRoster()
    return () => { cancelled = true }
  }, [])

  // Aggregate the timeline for the selected resident across all live sources.
  const loadTimeline = useCallback(async (patientId) => {
    if (!patientId || !isSupabaseReady()) {
      setEvents([])
      return
    }
    setLoadingEvents(true)
    const [
      checkins,
      notes,
      uds,
      meds,
      labs,
      detox,
      assessments,
      incidents,
      visits,
    ] = await Promise.all([
      getCheckins(patientId),
      getClinicalNotes(),
      getUdsTests(patientId),
      getMedications(patientId),
      getLabTests(patientId),
      getDetoxRecords(patientId),
      getAssessments(patientId),
      getIncidents(),
      getVisitations(patientId),
    ])
    setEvents(
      normaliseEvents({
        checkins: checkins.data,
        notes: (notes.data || []).filter((n) => n.patient_id === patientId),
        uds: uds.data,
        meds: meds.data,
        labs: labs.data,
        detox: detox.data,
        assessments: assessments.data,
        incidents: (incidents.data || []).filter((i) => i.patient_id === patientId),
        visits: visits.data,
      })
    )
    setLoadingEvents(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!selectedPatient) return
    loadTimeline(selectedPatient).catch(() => {
      if (!cancelled) setLoadingEvents(false)
    })
    return () => { cancelled = true }
  }, [selectedPatient, loadTimeline])

  const entries = events.filter((e) => visibleTypes[e.type])

  const toggleType = (type) =>
    setVisibleTypes((prev) => ({ ...prev, [type]: !prev[type] }))
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
        {String(value)}
      </span>
    ))

  const getDayLabel = (dateStr) => {
    const allDates = events.map((e) => e.date).filter(Boolean).sort()
    if (allDates.length === 0 || !dateStr) return ''
    const admissionDate = allDates[0]
    const diff = Math.floor(
      (new Date(dateStr) - new Date(admissionDate)) / (1000 * 60 * 60 * 24)
    )
    return `Day ${diff + 1}`
  }

  const selectedInitials = initialsById[selectedPatient] || '—'

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
            disabled={loadingPatients || patients.length === 0}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E0',
              fontSize: 14,
              fontWeight: 600,
              background: '#fff',
            }}
          >
            {patients.length === 0 && <option value="">—</option>}
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.initials}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isSupabaseReady() && (
        <div
          className="card"
          style={{
            padding: 16,
            marginBottom: 20,
            borderRadius: 12,
            border: '1px solid #FEB2B2',
            background: '#FFF5F5',
            color: '#C53030',
            fontSize: 14,
          }}
        >
          Live data is unavailable — Supabase is not configured.
        </div>
      )}

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
        Showing {entries.length} of {events.length} entries for{' '}
        <strong>{selectedInitials}</strong>
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

        {loadingEvents && (
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
            Loading timeline…
          </div>
        )}

        {!loadingEvents && events.length === 0 && (
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
            No events recorded yet for this resident.
          </div>
        )}

        {!loadingEvents && events.length > 0 && entries.length === 0 && (
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

        {!loadingEvents &&
          entries.map((entry) => (
            <div key={entry.id} style={{ position: 'relative', marginBottom: 12 }}>
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
