import React, { useState } from 'react'
import { fmt } from '../../utils/paystack'

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

const INVENTORY = [
  // Medical Supplies
  { id: 'M001', name: 'Disposable gloves (box/100)', category: 'medical', unit: 'Box', currentQty: 12, minQty: 10, maxQty: 50, status: 'adequate', location: 'Nursing Station', lastRestocked: '2026-03-25', expiryDate: '2027-06-01', costPerUnit: 3500 },
  { id: 'M002', name: 'Face masks (box/50)', category: 'medical', unit: 'Box', currentQty: 4, minQty: 8, maxQty: 30, status: 'low', location: 'Nursing Station', lastRestocked: '2026-03-15', expiryDate: '2027-12-01', costPerUnit: 2500 },
  { id: 'M003', name: 'Sharps disposal containers', category: 'medical', unit: 'Unit', currentQty: 8, minQty: 12, maxQty: 24, status: 'low', location: 'Clinical Room', lastRestocked: '2026-03-01', expiryDate: null, costPerUnit: 5000 },
  { id: 'M004', name: 'Sterile wound dressing packs', category: 'medical', unit: 'Pack', currentQty: 25, minQty: 15, maxQty: 60, status: 'adequate', location: 'Dressing Drums', lastRestocked: '2026-03-20', expiryDate: '2027-03-01', costPerUnit: 1200 },
  { id: 'M005', name: 'Clinical aprons', category: 'medical', unit: 'Pack/10', currentQty: 2, minQty: 5, maxQty: 15, status: 'critical', location: 'Nursing Station', lastRestocked: '2026-02-10', expiryDate: null, costPerUnit: 4000 },
  { id: 'M006', name: 'First Aid Kit refill', category: 'medical', unit: 'Kit', currentQty: 4, minQty: 4, maxQty: 8, status: 'adequate', location: 'Common Areas (4 locations)', lastRestocked: '2026-03-10', expiryDate: '2027-03-10', costPerUnit: 15000 },

  // Medication Stock
  { id: 'RX01', name: 'Diazepam 10mg (detox)', category: 'medication', unit: 'Tab', currentQty: 120, minQty: 60, maxQty: 300, status: 'adequate', location: 'Locked Cabinet', lastRestocked: '2026-03-28', expiryDate: '2027-09-01', costPerUnit: 150 },
  { id: 'RX02', name: 'Thiamine 100mg', category: 'medication', unit: 'Tab', currentQty: 200, minQty: 100, maxQty: 500, status: 'adequate', location: 'Locked Cabinet', lastRestocked: '2026-03-20', expiryDate: '2028-01-01', costPerUnit: 50 },
  { id: 'RX03', name: 'Paracetamol 500mg', category: 'medication', unit: 'Tab', currentQty: 80, minQty: 100, maxQty: 500, status: 'low', location: 'Locked Cabinet', lastRestocked: '2026-03-15', expiryDate: '2028-06-01', costPerUnit: 20 },
  { id: 'RX04', name: 'Chlordiazepoxide 25mg (detox)', category: 'medication', unit: 'Tab', currentQty: 30, minQty: 40, maxQty: 200, status: 'critical', location: 'Locked Cabinet', lastRestocked: '2026-03-10', expiryDate: '2027-05-01', costPerUnit: 200 },
  { id: 'RX05', name: 'Multivitamin tablets', category: 'medication', unit: 'Tab', currentQty: 350, minQty: 200, maxQty: 1000, status: 'adequate', location: 'Locked Cabinet', lastRestocked: '2026-03-25', expiryDate: '2028-12-01', costPerUnit: 30 },
  { id: 'RX06', name: 'Metoclopramide 10mg (antiemetic)', category: 'medication', unit: 'Tab', currentQty: 60, minQty: 40, maxQty: 200, status: 'adequate', location: 'Locked Cabinet', lastRestocked: '2026-03-20', expiryDate: '2027-08-01', costPerUnit: 80 },

  // Equipment & Assets (from 32 sponsorship items)
  { id: 'E001', name: 'Patient Monitor (multi-parameter)', category: 'equipment', unit: 'Unit', currentQty: 1, minQty: 2, maxQty: 2, status: 'low', location: 'Clinical Room', lastRestocked: '2026-01-15', expiryDate: null, costPerUnit: 680000 },
  { id: 'E002', name: 'Digital Sphygmomanometer', category: 'equipment', unit: 'Unit', currentQty: 3, minQty: 3, maxQty: 5, status: 'adequate', location: 'Nursing Station', lastRestocked: '2026-02-01', expiryDate: null, costPerUnit: 35000 },
  { id: 'E003', name: 'Pulse Oximeters', category: 'equipment', unit: 'Unit', currentQty: 4, minQty: 5, maxQty: 8, status: 'low', location: 'Nursing Station', lastRestocked: '2026-02-01', expiryDate: null, costPerUnit: 12000 },
  { id: 'E004', name: 'Stethoscopes', category: 'equipment', unit: 'Unit', currentQty: 5, minQty: 7, maxQty: 10, status: 'low', location: 'Clinical Room', lastRestocked: '2026-01-20', expiryDate: null, costPerUnit: 18000 },
  { id: 'E005', name: 'Drip Stands (IV poles)', category: 'equipment', unit: 'Unit', currentQty: 3, minQty: 5, maxQty: 8, status: 'low', location: 'Detox Ward', lastRestocked: '2026-02-15', expiryDate: null, costPerUnit: 18000 },

  // Household & Kitchen
  { id: 'H001', name: 'Toiletry packs (per resident)', category: 'household', unit: 'Pack', currentQty: 18, minQty: 24, maxQty: 48, status: 'low', location: 'Store Room', lastRestocked: '2026-03-20', expiryDate: null, costPerUnit: 1500 },
  { id: 'H002', name: 'Bed linen sets', category: 'household', unit: 'Set', currentQty: 30, minQty: 24, maxQty: 48, status: 'adequate', location: 'Laundry', lastRestocked: '2026-03-01', expiryDate: null, costPerUnit: 8000 },
  { id: 'H003', name: 'Cleaning supplies (monthly)', category: 'household', unit: 'Kit', currentQty: 2, minQty: 3, maxQty: 6, status: 'low', location: 'Janitor Closet', lastRestocked: '2026-03-15', expiryDate: null, costPerUnit: 25000 },
  { id: 'H004', name: 'Cooking gas (kg)', category: 'household', unit: 'Kg', currentQty: 25, minQty: 20, maxQty: 100, status: 'adequate', location: 'Kitchen', lastRestocked: '2026-03-28', expiryDate: null, costPerUnit: 1200 },
  { id: 'H005', name: 'Drinking water (20L dispensers)', category: 'household', unit: 'Unit', currentQty: 6, minQty: 10, maxQty: 30, status: 'low', location: 'Kitchen / Common Areas', lastRestocked: '2026-03-30', expiryDate: null, costPerUnit: 500 },
]

export default function InventoryManagement() {
  const [category, setCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showReorder, setShowReorder] = useState(false)
  const [reorderForm, setReorderForm] = useState({ item: '', qty: '', urgency: '', supplier: '', notes: '' })
  const [expanded, setExpanded] = useState(null)
  const [edits, setEdits] = useState({})

  const filtered = INVENTORY
    .filter(i => category === 'all' || i.category === category)
    .filter(i => statusFilter === 'all' || i.status === statusFilter)

  const criticalCount = INVENTORY.filter(i => i.status === 'critical').length
  const lowCount = INVENTORY.filter(i => i.status === 'low').length
  const totalValue = INVENTORY.reduce((s, i) => s + (i.currentQty * i.costPerUnit), 0)
  const expiringCount = INVENTORY.filter(i => {
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
          <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>{INVENTORY.length} items tracked · 4 categories · Monthly requisition cycle</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setShowReorder(!showReorder)}>
          {showReorder ? 'Cancel' : 'New Requisition'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { n: INVENTORY.length, label: 'Total Items', color: 'var(--blue)' },
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
          All ({INVENTORY.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = INVENTORY.filter(i => i.category === cat.key).length
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
            {cfg.label} ({INVENTORY.filter(i => i.status === key).length})
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
              {INVENTORY.map(i => <option key={i.id} value={i.id}>{i.name} (Current: {i.currentQty} {i.unit})</option>)}
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
          <button className="btn btn--primary btn--sm" onClick={() => {
            if (!reorderForm.item || !reorderForm.qty || !reorderForm.urgency) return
            alert('Requisition submitted successfully. Awaiting approval.')
            setReorderForm({ item: '', qty: '', urgency: '', supplier: '', notes: '' })
            setShowReorder(false)
          }}>Submit Requisition</button>
        </div>
      )}

      {/* Inventory table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(item => {
          const status = STOCK_STATUS[item.status]
          const stockPct = Math.min((item.currentQty / item.maxQty) * 100, 100)
          const catInfo = CATEGORIES.find(c => c.key === item.category)
          const isExpiringSoon = item.expiryDate && ((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) < 90

          return (
            <div key={item.id} className="card" style={{ padding: '14px 18px', borderLeft: `3px solid ${status.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '.68rem', color: 'var(--g500)', fontWeight: 600 }}>{item.id}</span>
                    <span style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--charcoal)' }}>{item.name}</span>
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
            </div>
          )
        })}
      </div>

      {/* No opioid warning */}
      {category === 'medication' && (
        <div style={{ fontSize: '.78rem', padding: '10px 14px', background: 'rgba(229,62,62,.06)', borderRadius: 8, border: '1px solid rgba(229,62,62,.15)', color: '#C53030', marginTop: 16, fontWeight: 600 }}>
          No opioid-containing medications permitted in the facility (SOP 5.6). All medications stored in locked cabinet. Administered by licensed nursing staff only.
        </div>
      )}
    </div>
  )
}
