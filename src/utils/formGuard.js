/*
  Required-field guards for the dashboard data-entry forms.

  Every module used to bail out of its save handler with a bare `return` when
  something required was missing. From the desk that reads as the Save button
  doing nothing at all: no message, no saved record, no clue which field is at
  fault. Staff reasonably reported it as "the form is not saving".

  These helpers make the form say what it needs instead of failing silently.
*/

const isEmpty = v =>
  v === null ||
  v === undefined ||
  v === false ||
  (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.length === 0) ||
  (v instanceof Set && v.size === 0)

// fields: [[value, 'Label'], ...]
export function missingFields(fields) {
  return fields.filter(([value]) => isEmpty(value)).map(([, label]) => label)
}

/*
  True when every required field is present. Otherwise names what is missing and
  returns false, so call sites stay a single line:

    if (!requireFields([[form.patient, 'Patient'], [form.type, 'Note type']])) return
*/
export function requireFields(fields, notify = (m) => window.alert(m)) {
  const missing = missingFields(fields)
  if (missing.length === 0) return true
  notify(
    missing.length === 1
      ? `${missing[0]} is required.`
      : `Please complete these fields: ${missing.join(', ')}.`
  )
  return false
}
