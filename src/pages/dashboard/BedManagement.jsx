import React, { useState, useEffect } from 'react'
import { getPatients, isSupabaseReady } from '../../utils/supabase'
import { mapPatientRow } from '../../utils/patients'

/*
  Bed Management — 19 beds across 4 wings (A·B·C: 5 beds, D: 4 beds)
  Wing assignment is flexible: default 3 Male : 1 Female
  Can be reconfigured to 2:2 or 1:3 based on pipeline demand
  Occupancy is driven by the live `patients` table (patients.bed).
*/

const TOTAL_BEDS = 19

// Per-wing bed counts (sum = 19)
const WING_PLAN = [
  { name: 'A', beds: 5 },
  { name: 'B', beds: 5 },
  { name: 'C', beds: 5 },
  { name: 'D', beds: 4 },
]

const WING_CONFIGS = [
  { label: '3M : 1F', male: 3, female: 1 },
  { label: '2M : 2F', male: 2, female: 2 },
  { label: '1M : 3F', male: 1, female: 3 },
]

const phaseColors = { stabilization: '#E53E3E', foundation: '#DD6B20', deepening: '#D69E2E', reintegration: '#1A7A4A' }
const phaseLabels = { stabilization: 'Stab', foundation: 'Found', deepening: 'Deep', reintegration: 'Reint' }

export default function BedManagement() {
  const [configIdx, setConfigIdx] = useState(0)
  const config = WING_CONFIGS[configIdx]
  const [PATIENTS, setPatients] = useState([])

  useEffect(() => {
    let active = true
    async function load() {
      if (!isSupabaseReady()) return
      const { data } = await getPatients()
      if (!active) return
      const active_residents = (data || [])
        .filter(p => p.bed && ['admitted', 'on-pass', 'suspended'].includes(p.status))
        .map(p => mapPatientRow(p))
      setPatients(active_residents)
    }
    load()
    return () => { active = false }
  }, [])

  // Build wings dynamically
  const wings = WING_PLAN.map((plan, i) => {
    const gender = i < config.male ? 'Male' : 'Female'
    const beds = Array.from({ length: plan.beds }, (_, j) => {
      const bedId = `${plan.name}${j + 1}`
      const patient = PATIENTS.find(p => p.bed === bedId)
      return { id: bedId, number: j + 1, patient }
    })
    return { name: plan.name, gender, beds }
  })

  const totalOccupied = PATIENTS.length
  const maleOcc = PATIENTS.filter(p => p.gender === 'M').length
  const femaleOcc = PATIENTS.filter(p => p.gender === 'F').length
  const maleWings = config.male
  const femaleWings = config.female
  const maleCap = wings.filter(w => w.gender === 'Male').reduce((s, w) => s + w.beds.length, 0)
  const femaleCap = wings.filter(w => w.gender === 'Female').reduce((s, w) => s + w.beds.length, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Bed Management</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>4 wings · {TOTAL_BEDS} beds · {totalOccupied} occupied · {TOTAL_BEDS - totalOccupied} available</p>
        </div>
        {/* Wing config selector */}
        <div className="card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)' }}>Wing Config:</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {WING_CONFIGS.map((cfg, i) => (
              <button key={i} className={`btn btn--sm ${configIdx === i ? 'btn--primary' : 'btn--secondary'}`}
                style={{ padding: '6px 12px', fontSize: '.76rem' }}
                onClick={() => setConfigIdx(i)}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--blue)' }}>{totalOccupied}/{TOTAL_BEDS}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Occupancy</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: '#1A7A4A' }}>{TOTAL_BEDS - totalOccupied}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Available</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--blue)' }}>{maleOcc}/{maleCap}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Male ({maleWings} wings)</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: '#805AD5' }}>{femaleOcc}/{femaleCap}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Female ({femaleWings} wings)</div>
        </div>
      </div>

      {/* Wings grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {wings.map(wing => (
          <div key={wing.name} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: 2 }}>Wing {wing.name}</h3>
                <span style={{
                  fontSize: '.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: wing.gender === 'Male' ? 'rgba(26,95,173,.08)' : 'rgba(128,90,213,.08)',
                  color: wing.gender === 'Male' ? 'var(--blue)' : '#805AD5',
                }}>{wing.gender}</span>
              </div>
              <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--g500)' }}>
                {wing.beds.filter(b => b.patient).length}/{wing.beds.length}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {wing.beds.map(bed => (
                <div key={bed.id} style={{
                  padding: '10px 12px', borderRadius: 10,
                  background: bed.patient ? phaseColors[bed.patient.phase] + '08' : 'var(--off)',
                  border: `1.5px solid ${bed.patient ? phaseColors[bed.patient.phase] + '30' : 'var(--g100)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '.78rem', color: 'var(--charcoal)' }}>{bed.id}</span>
                    {bed.patient && (
                      <span style={{
                        fontSize: '.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                        background: phaseColors[bed.patient.phase] + '20', color: phaseColors[bed.patient.phase],
                      }}>{phaseLabels[bed.patient.phase]}</span>
                    )}
                  </div>
                  {bed.patient ? (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--charcoal)' }}>{bed.patient.initials}</div>
                      <div style={{ fontSize: '.68rem', color: 'var(--g500)' }}>D{bed.patient.day} · {bed.patient.substance}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '.72rem', color: 'var(--g300)', marginTop: 4, fontStyle: 'italic' }}>—</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
        {Object.entries(phaseColors).map(([phase, color]) => (
          <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.72rem', color: 'var(--g500)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            <span style={{ textTransform: 'capitalize' }}>{phase}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
