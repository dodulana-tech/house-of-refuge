/**
 * LocalStorage-backed data store for MVP.
 * In production, replace with API calls.
 */

const PREFIX = 'hor_'

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

export function save(key, data) {
  localStorage.setItem(PREFIX + key, JSON.stringify(data))
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key)
}

// ── Application store ──
export function getApplications() { return load('applications', []) }

export function saveApplication(app) {
  const apps = getApplications()
  const existing = apps.findIndex(a => a.id === app.id)
  if (existing >= 0) apps[existing] = app
  else apps.push(app)
  save('applications', apps)
  return app
}

export function getApplication(id) {
  return getApplications().find(a => a.id === id) || null
}

// ── Check-ins ──
export function getCheckins(patientId) { return load(`checkins_${patientId}`, []) }

export function saveCheckin(patientId, checkin) {
  const list = getCheckins(patientId)
  list.push({ ...checkin, id: Date.now(), date: new Date().toISOString() })
  save(`checkins_${patientId}`, list)
  return list
}

// ── Payments ──
export function getPayments(userId) { return load(`payments_${userId}`, []) }

export function addPayment(userId, payment) {
  const list = getPayments(userId)
  list.push({ ...payment, id: Date.now(), date: new Date().toISOString() })
  save(`payments_${userId}`, list)
  return list
}

// ── Meal orders ──
export function getMealOrders(patientId) { return load(`meals_${patientId}`, []) }

export function saveMealOrder(patientId, order) {
  const list = getMealOrders(patientId)
  list.push({ ...order, id: Date.now(), date: new Date().toISOString() })
  save(`meals_${patientId}`, list)
  return list
}

// ── Visitation requests ──
export function getVisitations(patientId) { return load(`visits_${patientId}`, []) }

export function saveVisitation(patientId, visit) {
  const list = getVisitations(patientId)
  list.push({ ...visit, id: Date.now(), date: new Date().toISOString() })
  save(`visits_${patientId}`, list)
  return list
}
