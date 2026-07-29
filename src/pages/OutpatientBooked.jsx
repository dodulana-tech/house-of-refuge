import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams, useNavigate } from 'react-router-dom'
import { getBookingByReference } from '../utils/outpatient'

export default function OutpatientBooked() {
  const { ref } = useParams()
  const nav = useNavigate()
  const [b, setB] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    ;(async () => {
      const { data } = await getBookingByReference(ref)
      if (live) { setB(data); setLoading(false) }
    })()
    return () => { live = false }
  }, [ref])

  const fmtDT = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' }) : '—'

  return (
    <>
      <Helmet><title>Booking received | House of Refuge</title></Helmet>
      <div className="ph">
        <div className="container">
          <div className="ph__badge"><span className="badge">Request received</span></div>
          <h1>Thank you — your request is with us.</h1>
          <p>An admissions counsellor will follow up within one working day to confirm the appointment and the fee.</p>
        </div>
      </div>

      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          {loading ? <p>Loading…</p> : (
            <>
              <div className="card" style={{ padding: '28px 32px', marginBottom: 24 }}>
                <div className="sh__lbl">Your reference</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-.02em', color: 'var(--blue)', margin: '8px 0 4px' }}>{ref}</div>
                <p style={{ fontSize: '.92rem', color: 'var(--g700)', margin: 0 }}>Quote this reference when you call or email us.</p>
              </div>

              {b && (
                <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
                  <h2 style={{ fontSize: '1.15rem', marginBottom: 14 }}>Request summary</h2>
                  <KV k="Service" v={b.outpatient_services?.name} />
                  <KV k="Requested slot" v={fmtDT(b.scheduled_at)} />
                  <KV k="Practitioner" v={b.outpatient_practitioners?.full_name || 'Next available'} />
                  <KV k="Patient" v={b.patient_name} />
                  <KV k="Fee" v="Confirmed with you by our team" />
                </div>
              )}

              <h2 style={{ fontSize: '1.2rem', marginBottom: 12 }}>What happens next</h2>
              <ol style={{ paddingLeft: 22, lineHeight: 1.8, color: 'var(--charcoal)' }}>
                <li>You will receive an acknowledgement email shortly.</li>
                <li>An admissions counsellor contacts you within one working day to confirm the slot and give you the fee for this session in writing.</li>
                <li>If you wish to proceed, they send a secure payment link or bank transfer details. Nothing is charged before then.</li>
                <li>Once payment is received, the appointment moves from "pending" to <strong>confirmed</strong>.</li>
                <li>Pre-appointment intake form will be sent 48 hours before your session.</li>
                <li>Need to reschedule or have questions? Call <strong>0911 277 7600</strong>.</li>
              </ol>

              <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
                <button className="btn btn--secondary" onClick={() => nav('/outpatient')}>Browse more services</button>
                <button className="btn btn--primary" onClick={() => nav('/')}>Back to home</button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}

function KV({ k, v }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, padding: '8px 0', borderBottom: '1px solid #EDF1F5' }}>
      <div style={{ fontSize: '.78rem', color: 'var(--g500)', letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 700 }} dangerouslySetInnerHTML={{ __html: k }} />
      <div style={{ fontSize: '.94rem', color: 'var(--charcoal)' }}>{v}</div>
    </div>
  )
}
