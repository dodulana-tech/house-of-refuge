// Shared helpers for turning a Supabase `patients` row into the shape the
// dashboard roster/detail screens render. Keeps day/phase/initials/age
// derivation in one place so every screen agrees.

import { SUBSTANCE_PATHWAYS } from '../data/clinicalConstants'

export const PROGRAMME_DAYS = 84 // 12 weeks

// Day 1..84 derived from admission date (falls back to stored day_in_programme).
export function dayInProgramme(row) {
  if (row?.admitted_at) {
    const ms = Date.now() - new Date(row.admitted_at).getTime()
    const d = Math.floor(ms / 86400000) + 1
    if (Number.isFinite(d) && d > 0) return d
  }
  return row?.day_in_programme || 1
}

// Phase from day-in-programme: stab 1–14, foundation 15–42, deepening 43–70, reintegration 71+.
export function phaseForDay(day) {
  if (day <= 14) return 'stabilization'
  if (day <= 42) return 'foundation'
  if (day <= 70) return 'deepening'
  return 'reintegration'
}

export function initialsFromName(name) {
  if (!name) return '—'
  const parts = String(name).trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '—'
}

export function ageFromDob(dob) {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (365.25 * 86400000))
}

// Brief {id, initials, full_name} list of active residents — for pickers.
export function activeBriefs(rows) {
  return (rows || [])
    .filter(p => ['admitted', 'on-pass', 'suspended'].includes(p.status))
    .map(p => ({ id: p.id, initials: initialsFromName(p.full_name), full_name: p.full_name }))
}

// Map a patients row (+ optional latest checkin) to the roster card shape.
export function mapPatientRow(row, checkin) {
  const day = dayInProgramme(row)
  const phase = row.current_phase && row.current_phase !== 'stabilization'
    ? row.current_phase
    : phaseForDay(day)
  return {
    id: row.id,
    initials: initialsFromName(row.full_name),
    fullName: row.full_name,
    gender: row.gender === 'Male' ? 'M' : row.gender === 'Female' ? 'F' : (row.gender || ''),
    age: row.age ?? ageFromDob(row.date_of_birth) ?? '',
    day,
    phase,
    substance: row.primary_substance || '—',
    substancePathway: row.substance_pathway || SUBSTANCE_PATHWAYS[row.primary_substance] || '',
    careLevel: row.care_level || 'residential',
    populationPathway: row.population_pathway || 'standard',
    pathway: row.pathway || '',
    insight: row.insight_level || '',
    mood: checkin?.mood ?? null,
    cravings: checkin?.cravings ?? null,
    counselor: row.counselor_code || '—',
    bed: row.bed || '',
    status: row.status || 'admitted',
    admittedAt: row.admitted_at,
  }
}
