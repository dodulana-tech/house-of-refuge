/*
  Shared clinical constants used across dashboard pages.
  Single source of truth for substance pathways, care levels, and population pathways
  per Treatment Protocol Sections 20-22.
*/

// Substance → Clinical Pathway mapping (Section 20)
export const SUBSTANCE_PATHWAYS = {
  'Alcohol': 'AUD',
  'Cannabis': 'CUD',
  'Cocaine': 'Stimulant',
  'Heroin': 'OUD',
  'Tramadol': 'OUD',
  'Codeine Syrup': 'OUD',
  'Methamphetamine': 'Stimulant',
  'Benzodiazepines': 'AUD',
  'Multiple': 'Polysubstance',
}

// Clinical pathway metadata — label + color
export const SUBSTANCE_PATHWAY_META = {
  AUD: { label: 'Alcohol Use Disorder', color: '#805AD5' },
  OUD: { label: 'Opioid Use Disorder', color: '#DD6B20' },
  CUD: { label: 'Cannabis Use Disorder', color: '#38A169' },
  Stimulant: { label: 'Stimulant Use Disorder', color: '#E53E3E' },
  Polysubstance: { label: 'Polysubstance Use', color: '#2B6CB0' },
}

// Level of Care (Section 21)
export const CARE_LEVELS = [
  { key: 'residential', label: 'Residential (Level 3.5)', color: '#1A7A4A' },
  { key: 'iop', label: 'Intensive Outpatient (Level 2.1)', color: '#DD6B20' },
  { key: 'outpatient', label: 'Outpatient (Level 1)', color: '#2B6CB0' },
]

// Population Pathways (Section 22)
export const POPULATION_PATHWAYS = [
  { key: 'standard', label: 'Standard' },
  { key: 'womens', label: "Women's Pathway" },
  { key: 'adolescent', label: 'Adolescent/Young Adult (16-24)' },
  { key: 'dual-diagnosis', label: 'Dual-Diagnosis' },
]

// Lookup helper for population pathway labels
export const POPULATION_PATHWAY_LABELS = Object.fromEntries(
  POPULATION_PATHWAYS.map(p => [p.key, p.label])
)

// Insight levels and colors (used across admissions, patient records)
export const INSIGHT_COLORS = {
  denial: '#E53E3E',
  precontemplation: '#DD6B20',
  contemplation: '#D69E2E',
  preparation: '#38A169',
  action: '#2B6CB0',
}
