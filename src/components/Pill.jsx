import React from 'react'

// Small status chip. Colour is passed in from the status tables in
// utils/outpatient.js and utils/outpatientClinical.js so one status has one
// colour everywhere it appears.
export default function Pill({ text, color = '#7A8090', small }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: small ? '2px 8px' : '4px 12px',
      borderRadius: 999,
      fontSize: small ? '.7rem' : '.76rem',
      fontWeight: 700,
      color,
      background: color + '18',
      border: `1px solid ${color}33`,
      whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}
