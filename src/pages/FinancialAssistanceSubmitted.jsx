import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useParams } from 'react-router-dom'
import { getFAByReference, FA_STATUSES } from '../utils/financialAssistance'

export default function FinancialAssistanceSubmitted() {
  const { ref } = useParams()
  const nav = useNavigate()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await getFAByReference(ref)
      if (mounted) {
        setApp(data)
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [ref])

  const statusInfo = app ? FA_STATUSES.find(s => s.key === app.status) : null

  return (
    <>
      <Helmet>
        <title>Application Submitted | House of Refuge</title>
      </Helmet>

      <div className="ph">
        <div className="container">
          <div className="ph__badge"><span className="badge">Application received</span></div>
          <h1>Thank you. Your application is with us.</h1>
          <p>The Freedom Foundation Financial Assistance Committee will review your file at the next quarterly cycle.</p>
        </div>
      </div>

      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          {loading ? (
            <p>Loading reference…</p>
          ) : (
            <>
              <div className="card" style={{ padding: '28px 32px', marginBottom: 24 }}>
                <div className="sh__lbl">Your reference</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--blue)', margin: '8px 0 4px' }}>{ref}</div>
                <p style={{ fontSize: '.92rem', color: 'var(--g700)', margin: 0 }}>Save this reference. You can use it to check the status of your application.</p>
                {statusInfo && (
                  <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '.86rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusInfo.color }} />
                    <strong>{statusInfo.label}</strong>
                  </div>
                )}
              </div>

              <h2 style={{ fontSize: '1.3rem', marginBottom: 12 }}>What happens next</h2>
              <ol style={{ paddingLeft: 22, lineHeight: 1.8, color: 'var(--charcoal)' }}>
                <li>Your application has been routed in confidence to the <strong>Freedom Foundation Financial Assistance Committee</strong>. HOR clinical staff do not see your financial details.</li>
                <li>The Committee reviews applications on a <strong>quarterly cycle</strong>. You will receive a written notification within <strong>30 days of cycle close</strong>.</li>
                <li>If your application is approved on financial grounds, the standard clinical pathway begins: psychiatrist assessment, then admission scheduling.</li>
                <li>If more information is needed, the Committee will reach out by phone or email.</li>
              </ol>

              <div className="card" style={{ background: '#FFF8EC', border: '1px solid rgba(192,138,48,.25)', padding: '20px 24px', marginTop: 24 }}>
                <div className="sh__lbl" style={{ color: 'var(--gold)' }}>If circumstances change</div>
                <p style={{ fontSize: '.95rem', lineHeight: 1.65, margin: '6px 0 0' }}>
                  If your loved one's clinical situation becomes urgent before the review cycle closes, please call <strong>0901 127 7600</strong>. We may be able to route you to an alternative resource immediately.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
                <button className="btn btn--secondary" onClick={() => nav('/')}>Back to home</button>
                <button className="btn btn--primary" onClick={() => nav('/assistance')}>Read more about HOR</button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
