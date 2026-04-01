import React from 'react'

const BEDS = Array.from({ length: 24 }, (_, i) => {
  const occupied = [
    { bed: 1, name: 'Chidi Okonkwo', day: 23, phase: 'foundation', gender: 'M', substance: 'Alcohol' },
    { bed: 5, name: 'Adaeze Nnamdi', day: 45, phase: 'deepening', gender: 'F', substance: 'Tramadol' },
    { bed: 9, name: 'Kunle Adeyemi', day: 74, phase: 'reintegration', gender: 'M', substance: 'Cannabis' },
    { bed: 13, name: 'Ibrahim Musa', day: 8, phase: 'stabilization', gender: 'M', substance: 'Heroin' },
  ]
  const patient = occupied.find(p => p.bed === i + 1)
  return { number: i + 1, wing: i < 12 ? 'Male' : 'Female', patient }
})

const phaseColors = { stabilization: '#E53E3E', foundation: '#DD6B20', deepening: '#D69E2E', reintegration: '#1A7A4A' }

export default function BedManagement() {
  const occupied = BEDS.filter(b => b.patient).length
  const maleOcc = BEDS.filter(b => b.wing === 'Male' && b.patient).length
  const femaleOcc = BEDS.filter(b => b.wing === 'Female' && b.patient).length

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Bed Management</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>24-bed facility · {occupied} occupied · {24 - occupied} available</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 700, color: 'var(--blue)' }}>{occupied}/24</div>
          <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>Total Occupancy</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 700, color: '#1A7A4A' }}>{24 - occupied}</div>
          <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>Available Beds</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 700, color: 'var(--blue)' }}>{maleOcc}/12</div>
          <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>Male Wing</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 700, color: '#805AD5' }}>{femaleOcc}/12</div>
          <div style={{ fontSize: '.78rem', color: 'var(--g500)' }}>Female Wing</div>
        </div>
      </div>

      {['Male', 'Female'].map(wing => (
        <div key={wing} style={{ marginBottom: 28 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', marginBottom: 14 }}>{wing} Wing (Beds {wing === 'Male' ? '1–12' : '13–24'})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {BEDS.filter(b => b.wing === wing).map(bed => (
              <div key={bed.number} className="card" style={{
                padding: '14px 16px',
                borderLeft: `4px solid ${bed.patient ? phaseColors[bed.patient.phase] || 'var(--blue)' : 'var(--g100)'}`,
                opacity: bed.patient ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Bed {bed.number}</span>
                  <span style={{
                    fontSize: '.64rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: bed.patient ? phaseColors[bed.patient.phase] + '15' : 'var(--g100)',
                    color: bed.patient ? phaseColors[bed.patient.phase] : 'var(--g500)',
                  }}>
                    {bed.patient ? 'Occupied' : 'Available'}
                  </span>
                </div>
                {bed.patient ? (
                  <>
                    <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--charcoal)' }}>{bed.patient.name}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Day {bed.patient.day} · {bed.patient.substance}</div>
                  </>
                ) : (
                  <div style={{ fontSize: '.78rem', color: 'var(--g500)', fontStyle: 'italic' }}>Ready for admission</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
