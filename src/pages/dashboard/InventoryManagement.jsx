import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../utils/paystack'
import {
  isSupabaseReady,
  getInventoryItems,
  updateInventoryItem,
  getInventoryOrders,
  addInventoryOrder,
} from '../../utils/supabase'

/*
  Inventory Management — 4 categories per SOP:
  1. Medical Supplies & Consumables (PPE, sharps, dressings, first aid)
  2. Medication Stock (pharmacy inventory, controlled substance log)
  3. Equipment & Assets (32 sponsorship items + facility equipment)
  4. Household & Kitchen (food, toiletries, cleaning, laundry)

  Per SOP:
  - Admin Coordinator manages requisitions
  - Monthly requisitions for household supplies, food, maintenance
  - PPE supplies tracked annually (₦480,000/year)
  - Sharps disposal containers (₦60,000/year)
  - Toiletries per resident (₦440,000/year for all)
  - No opioid-containing medications in stock
*/

const CATEGORIES = [
  { key: 'medical', label: 'Medical Supplies', icon: '🏥', color: '#E53E3E' },
  { key: 'medication', label: 'Medication Stock', icon: '💊', color: '#805AD5' },
  { key: 'equipment', label: 'Equipment & Assets', icon: '🔧', color: 'var(--blue)' },
  { key: 'household', label: 'Household & Kitchen', icon: '🏠', color: 'var(--gold)' },
]

const STOCK_STATUS = {
  adequate: { label: 'Adequate', color: '#1A7A4A', bg: 'rgba(26,122,74,.08)' },
  low: { label: 'Low Stock', color: '#DD6B20', bg: 'rgba(221,107,32,.08)' },
  critical: { label: 'Critical', color: '#E53E3E', bg: 'rgba(229,62,62,.08)' },
  ordered: { label: 'On Order', color: 'var(--blue)', bg: 'rgba(26,95,173,.08)' },
  na: { label: 'N/A', color: 'var(--g500)', bg: 'var(--off)' },
}

const REORDER_URGENCY = ['Routine (next monthly order)', 'Urgent (within 48 hours)', 'Emergency (immediate)']

const TODAY = new Date().toISOString().slice(0, 10)

// Derive stock status from quantity vs minimum level
function computeStatus(qty, min) {
  const q = Number(qty) || 0
  const m = Number(min) || 0
  if (q <= m * 0.5) return 'critical'
  if (q < m) return 'low'
  return 'adequate'
}

// Map a DB (snake_case) row to the camelCase shape the JSX expects.
function mapItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    currentQty: row.current_qty,
    minQty: row.min_qty,
    maxQty: row.max_qty,
    status: row.status,
    location: row.location,
    lastRestocked: row.last_restocked,
    expiryDate: row.expiry_date,
    costPerUnit: row.cost_per_unit,
  }
}

export default function InventoryManagement() {
  const { user } = useAuth()
  const [category, setCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showReorder, setShowReorder] = useState(false)
  const [reorderForm, setReorderForm] = useState({ item: '', qty: '', urgency: '', supplier: '', notes: '' })
  const [expanded, setExpanded] = useState(null)
  const [edits, setEdits] = useState({})
  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingId, setSavingId] = useState(null)

  const load = useCallback(async () => {
    if (!isSupabaseReady()) { setLoading(false); return }
    setLoading(true)
    const [{ data: itemRows }, { data: orderRows }] = await Promise.all([getInventoryItems(), getInventoryOrders()])
    setItems((itemRows || []).map(mapItem))
    setOrders(orderRows || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const requesterCode = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'ST'

  const handleSaveEdit = async (item) => {
    const edit = edits[item.id] || {}
    const hasQty = edit.qty !== undefined && edit.qty !== ''
    const newQty = hasQty ? Number(edit.qty) : item.currentQty
    const newStatus = edit.status || computeStatus(newQty, item.minQty)
    setSavingId(item.id)
    const updates = { current_qty: newQty, status: newStatus }
    if (hasQty) updates.last_restocked = TODAY
    const { error } = await updateInventoryItem(item.id, updates)
    setSavingId(null)
    if (error) { alert(`Could not save stock update: ${error.message}`); return }
    setEdits(p => { const n = { ...p }; delete n[item.id]; return n })
    await load()
  }

  const handleSubmitRequisition = async () => {
    if (!reorderForm.item || !reorderForm.qty || !reorderForm.urgency) return
    const selected = items.find(i => i.id === reorderForm.item)
    setSaving(true)
    const { error } = await addInventoryOrder({
      item_id: reorderForm.item,
      item_name: selected?.name || '',
      qty: Number(reorderForm.qty),
      urgency: reorderForm.urgency,
      supplier: reorderForm.supplier,
      notes: reorderForm.notes,
      status: 'requested',
      requested_by_code: requesterCode,
    })
    setSaving(false)
    if (error) { alert(`Could not submit requisition: ${error.message}`); return }
    setReorderForm({ item: '', qty: '', urgency: '', supplier: '', notes: '' })
    setShowReorder(false)
    await load()
  }

  const filtered = items
    .filter(i => category === 'all' || i.category === category)
    .filter(i => statusFilter === 'all' || i.status === statusFilter)

  const criticalCount = items.filter(i => i.status === 'critical').length
  const lowCount = items.filter(i => i.status === 'low').length
  const totalValue = items.reduce((s, i) => s + (i.currentQty * i.costPerUnit), 0)
  const expiringCount = items.filter(i => {
    if (!i.expiryDate) return false
    const exp = new Date(i.expiryDate)
    const now = new Date()
    const diff = (exp - now) / (1000 * 60 * 60 * 24)
    return diff < 90 && diff > 0
  }).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Inventory Management</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>{items.length} items tracked · 4 categories · Monthly requisition cycle</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setShowReorder(!showReorder)}>
          {showReorder ? 'Cancel' : 'New Requisition'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { n: items.length, label: 'Total Items', color: 'var(--blue)' },
          { n: criticalCount, label: 'Critical', color: '#E53E3E' },
          { n: lowCount, label: 'Low Stock', color: '#DD6B20' },
          { n: expiringCount, label: 'Expiring <90d', color: '#D69E2E' },
          { n: fmt(totalValue), label: 'Stock Value', color: 'var(--charcoal)' },
        ].map(kpi => (
          <div key={kpi.label} className="card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', fontWeight: 700, color: kpi.color }}>{kpi.n}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button className={`btn btn--sm ${category === 'all' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setCategory('all')}>
          All ({items.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = items.filter(i => i.category === cat.key).length
          return (
            <button key={cat.key} className={`btn btn--sm ${category === cat.key ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setCategory(cat.key)}>
              {cat.icon} {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setStatusFilter('all')} style={{ padding: '4px 10px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: statusFilter === 'all' ? 'var(--charcoal)' : 'var(--off)', color: statusFilter === 'all' ? 'white' : 'var(--g500)' }}>All</button>
        {Object.entries(STOCK_STATUS).filter(([k]) => k !== 'na').map(([key, cfg]) => (
          <button key={key} onClick={() => setStatusFilter(key)} style={{ padding: '4px 10px', borderRadius: 14, fontSize: '.72rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: statusFilter === key ? cfg.color : cfg.bg, color: statusFilter === key ? 'white' : cfg.color }}>
            {cfg.label} ({items.filter(i => i.status === key).length})
          </button>
        ))}
      </div>

      {/* Reorder form */}
      {showReorder && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 600 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: 14 }}>New Requisition / Reorder</h3>
          <div className="fg"><label className="flabel">Item *</label>
            <select className="fi" value={reorderForm.item} onChange={e => setReorderForm(p => ({ ...p, item: e.target.value }))}>
              <option value="">Select item...</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} (Current: {i.currentQty} {i.unit})</option>)}
            </select>
          </div>
          <div className="frow">
            <div className="fg"><label className="flabel">Quantity to Order *</label>
              <select className="fi" value={reorderForm.qty} onChange={e => setReorderForm(p => ({ ...p, qty: e.target.value }))}>
                <option value="">Select quantity...</option>
                {[5, 10, 20, 25, 50, 100, 200, 500].map(q => <option key={q} value={q}>{q} units</option>)}
              </select>
            </div>
            <div className="fg"><label className="flabel">Urgency *</label>
              <select className="fi" value={reorderForm.urgency} onChange={e => setReorderForm(p => ({ ...p, urgency: e.target.value }))}>
                <option value="">Select urgency...</option>
                {REORDER_URGENCY.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="fg"><label className="flabel">Preferred Supplier</label>
            <select className="fi" value={reorderForm.supplier} onChange={e => setReorderForm(p => ({ ...p, supplier: e.target.value }))}>
              <option value="">Select supplier...</option>
              {['Medplus Pharmacy', 'Chi Pharmaceuticals', 'Lagos Medical Supplies', 'Emzor Pharmaceuticals', 'CookedIndoors (food)', 'General Market', 'Other'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="fg"><label className="flabel">Approval Required By</label>
            <select className="fi" value={reorderForm.notes} onChange={e => setReorderForm(p => ({ ...p, notes: e.target.value }))}>
              <option value="">Select approver...</option>
              {['Program Director', 'Admin Coordinator', 'Head Nurse (medical supplies)', 'Head of Clinical Services (medications)'].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <button className="btn btn--primary btn--sm" disabled={saving} onClick={handleSubmitRequisition}>
            {saving ? 'Submitting…' : 'Submit Requisition'}
          </button>
        </div>
      )}

      {/* Inventory table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--g500)', fontSize: '.88rem' }}>Loading inventory…</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--g500)', fontSize: '.88rem' }}>No inventory items recorded yet.</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--g500)', fontSize: '.88rem' }}>No items match the selected filters.</div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(item => {
          const status = STOCK_STATUS[item.status]
          const stockPct = Math.min((item.currentQty / item.maxQty) * 100, 100)
          const catInfo = CATEGORIES.find(c => c.key === item.category)
          const isExpiringSoon = item.expiryDate && ((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) < 90
          const isOpen = expanded === item.id
          const edit = edits[item.id] || {}

          return (
            <div key={item.id} className="card" style={{ padding: 0, borderLeft: `3px solid ${status.color}`, overflow: 'hidden' }}>
              <div onClick={() => setExpanded(isOpen ? null : item.id)} style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600 }}>{item.id}</span>
                    <span style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--charcoal)' }}>{item.name}</span>
                    <span style={{ fontSize: '.72rem', color: 'var(--g500)', marginLeft: 'auto' }}>{isOpen ? '▾' : '▸'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: '.76rem', color: 'var(--g500)', flexWrap: 'wrap' }}>
                    <span>{catInfo?.icon} {catInfo?.label}</span>
                    <span>📍 {item.location}</span>
                    {item.expiryDate && <span style={{ color: isExpiringSoon ? '#DD6B20' : 'var(--g500)' }}>Exp: {item.expiryDate}</span>}
                    <span>Last stocked: {item.lastRestocked}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', minWidth: 70 }}>
                    <div style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Stock</div>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', fontWeight: 700, color: status.color }}>{item.currentQty}</div>
                    <div style={{ fontSize: '.64rem', color: 'var(--g500)' }}>Min: {item.minQty} {item.unit}</div>
                  </div>
                  <div style={{ width: 80 }}>
                    <div style={{ height: 6, background: 'var(--g100)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${stockPct}%`, background: status.color, borderRadius: 3 }} />
                    </div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: 14, fontSize: '.68rem', fontWeight: 700, background: status.bg, color: status.color }}>
                    {status.label}
                  </span>
                </div>
              </div>

              {/* Expanded detail panel */}
              {isOpen && (
                <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--g100)', background: 'var(--off)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, padding: '16px 0 12px' }}>
                    <div>
                      <div style={{ fontSize: '.7rem', color: 'var(--g500)', marginBottom: 2 }}>Category</div>
                      <div style={{ fontSize: '.86rem', fontWeight: 600 }}>{catInfo?.icon} {catInfo?.label}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '.7rem', color: 'var(--g500)', marginBottom: 2 }}>Location</div>
                      <div style={{ fontSize: '.86rem', fontWeight: 600 }}>{item.location}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '.7rem', color: 'var(--g500)', marginBottom: 2 }}>Cost per Unit</div>
                      <div style={{ fontSize: '.86rem', fontWeight: 600 }}>{fmt(item.costPerUnit)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '.7rem', color: 'var(--g500)', marginBottom: 2 }}>Total Stock Value</div>
                      <div style={{ fontSize: '.86rem', fontWeight: 600 }}>{fmt(item.currentQty * item.costPerUnit)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '.7rem', color: 'var(--g500)', marginBottom: 2 }}>Min / Max Levels</div>
                      <div style={{ fontSize: '.86rem', fontWeight: 600 }}>{item.minQty} / {item.maxQty} {item.unit}</div>
                    </div>
                    {item.expiryDate && <div>
                      <div style={{ fontSize: '.7rem', color: 'var(--g500)', marginBottom: 2 }}>Expiry Date</div>
                      <div style={{ fontSize: '.86rem', fontWeight: 600, color: isExpiringSoon ? '#DD6B20' : 'var(--charcoal)' }}>{item.expiryDate} {isExpiringSoon ? '⚠️ Expiring soon' : ''}</div>
                    </div>}
                  </div>

                  <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: 10, marginTop: 4 }}>Update Stock</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: '.7rem', color: 'var(--g500)', display: 'block', marginBottom: 2 }}>Adjust Quantity</label>
                      <input type="number" value={edit.qty || ''} onChange={e => setEdits(p => ({ ...p, [item.id]: { ...p[item.id], qty: e.target.value } }))} placeholder={`Current: ${item.currentQty}`} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '.7rem', color: 'var(--g500)', display: 'block', marginBottom: 2 }}>Status</label>
                      <select value={edit.status || item.status} onChange={e => setEdits(p => ({ ...p, [item.id]: { ...p[item.id], status: e.target.value } }))} style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }}>
                        {Object.entries(STOCK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '.7rem', color: 'var(--g500)', display: 'block', marginBottom: 2 }}>Notes</label>
                      <input type="text" value={edit.notes || ''} onChange={e => setEdits(p => ({ ...p, [item.id]: { ...p[item.id], notes: e.target.value } }))} placeholder="e.g. Restocked by nurse" style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.82rem' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button className="btn btn--primary btn--sm" style={{ width: '100%' }} disabled={savingId === item.id} onClick={() => handleSaveEdit(item)}>
                        {savingId === item.id ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}

      {/* Recent requisitions */}
      {orders.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: 10 }}>Recent Requisitions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {orders.map(o => (
              <div key={o.id} className="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--charcoal)' }}>
                  {o.item_name} <span style={{ color: 'var(--g500)', fontWeight: 400 }}>× {o.qty}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: '.72rem', color: 'var(--g500)', flexWrap: 'wrap' }}>
                  {o.urgency && <span>{o.urgency}</span>}
                  {o.supplier && <span>📦 {o.supplier}</span>}
                  {o.requested_by_code && <span>By {o.requested_by_code}</span>}
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontWeight: 700, background: 'var(--off)', color: 'var(--blue)' }}>{o.status || 'requested'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No opioid warning */}
      {category === 'medication' && (
        <div style={{ fontSize: '.78rem', padding: '10px 14px', background: 'rgba(229,62,62,.06)', borderRadius: 8, border: '1px solid rgba(229,62,62,.15)', color: '#C53030', marginTop: 16, fontWeight: 600 }}>
          No opioid-containing medications permitted in the facility (SOP 5.6). All medications stored in locked cabinet. Administered by licensed nursing staff only.
        </div>
      )}
    </div>
  )
}
