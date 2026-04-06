import React, { useState } from 'react'

/*
  Programme KPIs Dashboard — Treatment Protocol Section 18.3
  Quarterly board-level reporting. 10 KPIs tracking programme outcomes.
  No patient-level data — programme-level metrics only.
*/

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const YEARS = [2025, 2026, 2027]

const STATUS_CONFIG = {
  'On Target': {
    color: '#38A169',
    bg: '#F0FFF4',
    border: '#C6F6D5',
  },
  'Below Target': {
    color: '#D69E2E',
    bg: '#FFFFF0',
    border: '#FEFCBF',
  },
  Critical: {
    color: '#E53E3E',
    bg: '#FFF5F5',
    border: '#FED7D7',
  },
  Tracking: {
    color: '#2B6CB0',
    bg: '#EBF8FF',
    border: '#BEE3F8',
  },
}

const KPI_DATA = {
  'Q1-2026': [
    {
      id: 1,
      name: 'Graduation Rate',
      value: 78,
      displayValue: '78%',
      target: 75,
      targetLabel: '>75%',
      status: 'On Target',
      evidence: 'TC retention benchmarks (De Leon)',
      unit: '%',
    },
    {
      id: 2,
      name: '12-Month Abstinence Rate',
      value: 62,
      displayValue: '62%',
      target: 60,
      targetLabel: '>60%',
      status: 'On Target',
      evidence: 'UNODC outcome standards; alumni monitoring data',
      unit: '%',
    },
    {
      id: 3,
      name: 'Employment at 6 Months',
      value: 45,
      displayValue: '45%',
      target: 50,
      targetLabel: '>50%',
      status: 'Below Target',
      evidence: 'WHO mhGAP vocational outcomes',
      unit: '%',
    },
    {
      id: 4,
      name: 'Church Attendance at 6 Months',
      value: 72,
      displayValue: '72%',
      target: 70,
      targetLabel: '>70%',
      status: 'On Target',
      evidence: 'Faith-integrated recovery model (HOR)',
      unit: '%',
    },
    {
      id: 5,
      name: 'Family Reunification Rate',
      value: 55,
      displayValue: '55%',
      target: 60,
      targetLabel: '>60%',
      status: 'Below Target',
      evidence: 'Family therapy outcome snapshots',
      unit: '%',
    },
    {
      id: 6,
      name: 'PHQ-9 Improvement (Admission to Discharge)',
      value: 6.2,
      displayValue: '-6.2',
      target: null,
      targetLabel: 'Clinically significant reduction',
      status: 'On Target',
      evidence: 'PHQ-9 validated instrument; mean score change',
      unit: 'pts',
      isScoreChange: true,
    },
    {
      id: 7,
      name: 'GAD-7 Improvement (Admission to Discharge)',
      value: 4.8,
      displayValue: '-4.8',
      target: null,
      targetLabel: 'Clinically significant reduction',
      status: 'On Target',
      evidence: 'GAD-7 validated instrument; mean score change',
      unit: 'pts',
      isScoreChange: true,
    },
    {
      id: 8,
      name: 'Re-admission Rate',
      value: 12,
      displayValue: '12%',
      target: null,
      targetLabel: 'Track (not punitive)',
      status: 'Tracking',
      evidence: 'Re-admission / total graduates; continuous monitoring',
      unit: '%',
      isTracking: true,
    },
    {
      id: 9,
      name: 'Adverse Events',
      value: 0,
      displayValue: '0',
      target: 0,
      targetLabel: 'Zero',
      status: 'On Target',
      evidence: 'Incident reports; safety protocol compliance',
      unit: 'events',
      isZeroTarget: true,
    },
    {
      id: 10,
      name: 'Aftercare Engagement at 3 Months',
      value: 85,
      displayValue: '85%',
      target: 80,
      targetLabel: '>80%',
      status: 'On Target',
      evidence: 'Contact logs; aftercare programme records',
      unit: '%',
    },
  ],
}

function getProgressPercent(kpi) {
  if (kpi.isScoreChange) return Math.min((kpi.value / 8) * 100, 100)
  if (kpi.isZeroTarget) return kpi.value === 0 ? 100 : 0
  if (kpi.isTracking) return kpi.value
  if (kpi.target) return Math.min((kpi.value / kpi.target) * 100, 100)
  return 50
}

export default function ProgrammeKPIs() {
  const [selectedQuarter, setSelectedQuarter] = useState('Q1')
  const [selectedYear, setSelectedYear] = useState(2026)

  const dataKey = `${selectedQuarter}-${selectedYear}`
  const kpis = KPI_DATA[dataKey] || null

  const onTargetCount = kpis ? kpis.filter((k) => k.status === 'On Target').length : 0
  const totalKpis = kpis ? kpis.length : 10
  const boardReady = kpis && onTargetCount >= 7

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A202C', margin: 0 }}>
            Programme KPIs
          </h1>
          <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
            Treatment Protocol Section 18.3 — Quarterly Board Report
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Quarter:</label>
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E0',
              fontSize: 14,
              fontWeight: 600,
              background: '#fff',
            }}
          >
            {QUARTERS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#4A5568' }}>Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E0',
              fontSize: 14,
              fontWeight: 600,
              background: '#fff',
            }}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Banner */}
      {kpis && (
        <div
          style={{
            padding: 16,
            marginBottom: 20,
            borderRadius: 12,
            background: boardReady ? '#F0FFF4' : '#FFFFF0',
            border: `1px solid ${boardReady ? '#C6F6D5' : '#FEFCBF'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: boardReady ? '#38A169' : '#D69E2E',
                color: '#fff',
                fontWeight: 700,
                fontSize: 20,
              }}
            >
              {onTargetCount}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#2D3748' }}>
                {onTargetCount}/{totalKpis} KPIs on target this quarter
              </div>
              <div style={{ fontSize: 13, color: '#718096', marginTop: 2 }}>
                {selectedQuarter} {selectedYear} — Programme Performance Summary
              </div>
            </div>
          </div>
          <div
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
              color: boardReady ? '#38A169' : '#D69E2E',
              background: boardReady ? '#C6F6D5' : '#FEFCBF',
            }}
          >
            {boardReady ? 'Board Report Ready' : 'Review Required'}
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!kpis && (
        <div
          className="card"
          style={{
            padding: 40,
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            background: '#fff',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#A0AEC0', fontSize: 16, margin: 0 }}>
            No KPI data available for {selectedQuarter} {selectedYear}. Data is currently available for Q1 2026.
          </p>
        </div>
      )}

      {/* KPI Cards Grid */}
      {kpis && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: 16,
          }}
        >
          {kpis.map((kpi) => {
            const config = STATUS_CONFIG[kpi.status] || STATUS_CONFIG['On Target']
            const progressPercent = getProgressPercent(kpi)

            return (
              <div
                key={kpi.id}
                className="card"
                style={{
                  padding: 20,
                  borderRadius: 12,
                  border: `1px solid ${config.border}`,
                  background: '#fff',
                }}
              >
                {/* KPI Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ flex: 1, marginRight: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#2D3748', marginBottom: 4 }}>
                      {kpi.id}. {kpi.name}
                    </div>
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      color: config.color,
                      background: config.bg,
                      border: `1px solid ${config.border}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {kpi.status.toUpperCase()}
                  </span>
                </div>

                {/* Value */}
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: config.color }}>
                    {kpi.displayValue}
                  </span>
                  {kpi.isScoreChange && (
                    <span style={{ fontSize: 14, color: '#718096', marginLeft: 6 }}>mean change</span>
                  )}
                </div>

                {/* Target */}
                <div style={{ fontSize: 13, color: '#4A5568', marginBottom: 12 }}>
                  <strong>Target:</strong> {kpi.targetLabel}
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    width: '100%',
                    height: 8,
                    borderRadius: 4,
                    background: '#EDF2F7',
                    marginBottom: 12,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(progressPercent, 100)}%`,
                      height: '100%',
                      borderRadius: 4,
                      background: config.color,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                {/* Target line indicator for percentage KPIs */}
                {kpi.target && !kpi.isZeroTarget && (
                  <div style={{ fontSize: 11, color: '#A0AEC0', marginBottom: 8 }}>
                    {kpi.value}/{kpi.target}{kpi.unit === '%' ? '%' : ` ${kpi.unit}`} of target
                  </div>
                )}

                {/* Evidence Basis */}
                <div
                  style={{
                    fontSize: 11,
                    color: '#A0AEC0',
                    fontStyle: 'italic',
                    borderTop: '1px solid #EDF2F7',
                    paddingTop: 8,
                  }}
                >
                  Evidence: {kpi.evidence}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer Note */}
      {kpis && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            background: '#fff',
            fontSize: 13,
            color: '#718096',
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: '#2D3748' }}>Reporting Notes:</strong> KPIs are reported quarterly to the Board
          per Treatment Protocol Section 18.3. Targets are benchmarked against TC retention standards (De Leon),
          UNODC outcome frameworks, and WHO mhGAP guidelines. PHQ-9 and GAD-7 improvements are assessed as
          clinically significant reductions from admission to discharge scores. Re-admission rate is tracked
          for continuous improvement purposes and is not used punitively.
        </div>
      )}
    </div>
  )
}
