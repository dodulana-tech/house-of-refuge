import React from 'react'

export default function ComingSoon({ title, description, features }) {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>{title}</h1>
      <p style={{ fontSize: '.88rem', color: 'var(--g500)', marginBottom: 28 }}>{description}</p>

      <div className="card" style={{ maxWidth: 600 }}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚧</div>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', marginBottom: 8 }}>Under Development</h3>
          <p style={{ fontSize: '.88rem', color: 'var(--g700)', marginBottom: 20 }}>
            This module is being built. It will include:
          </p>
          {features && (
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400, margin: '0 auto' }}>
              {features.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '.84rem', color: 'var(--g700)' }}>
                  <span style={{ color: 'var(--blue)', fontWeight: 700, flexShrink: 0 }}>•</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
