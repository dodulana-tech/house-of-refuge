import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useNotif } from '../App'
import { pay, ref, fmt } from '../utils/paystack'
import { supabase, isSupabaseReady, recordPayment, getDepositApplication } from '../utils/supabase'
import { DEPOSIT_AMOUNT_NAIRA, DEFAULT_ASSESSMENT_LINE_ITEMS } from '../data/depositEmailTemplate'

/*
  Public-facing page reached from the deposit-request email link.
  URL: /deposit/:appId
  Behaviour:
    - Looks up the application by id (Supabase, anon read of own row) to
      pre-fill name/email and verify the deposit hasn't been paid.
    - Restates the refundable + conditional terms.
    - Initiates Paystack for the ₦1,000,000 deposit.
*/

export default function DepositPay() {
  const { appId } = useParams()
  const showNotif = useNotif()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!isSupabaseReady() || !appId) {
        setLoading(false)
        return
      }
      const { data, error } = await getDepositApplication(appId)
      if (!cancelled) {
        if (error || !data || data.error) {
          showNotif('Application not found', 'We could not find this application. Please contact admissions.', 'err')
          setApp(null)
        } else {
          setApp(data)
        }
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [appId])

  function handlePay() {
    if (!app) return
    if (!acknowledged) {
      showNotif('Please acknowledge', 'Please confirm you have read and understood the deposit terms.')
      return
    }
    setPaying(true)
    pay({
      email: app.email,
      amount: DEPOSIT_AMOUNT_NAIRA * 100,
      ref: ref('HOR_DEP'),
      fields: [
        { display_name: 'Patient', variable_name: 'patient', value: app.first_name || 'Applicant' },
        { display_name: 'Type', variable_name: 'type', value: 'Refundable Admission Deposit' },
        { display_name: 'Application', variable_name: 'application_id', value: app.id },
        { display_name: 'Pathway', variable_name: 'pathway', value: `Pathway ${app.pathway}` },
      ],
      onSuccess: async (r) => {
        if (isSupabaseReady()) {
          await supabase.from('applications')
            .update({ deposit_paid: true, payment_ref: r.reference })
            .eq('id', app.id)
          await recordPayment({
            application_id: app.id,
            amount: DEPOSIT_AMOUNT_NAIRA * 100, // kobo
            currency: 'NGN',
            type: 'deposit',
            description: 'Refundable admission booking deposit',
            paystack_ref: r.reference,
            paystack_status: 'success',
            verified: false,
            status: 'paid',
          })
          setApp(prev => prev ? { ...prev, deposit_paid: true } : prev)
        }
        setPaying(false)
        showNotif('Deposit received', `Thank you. Your refundable deposit has been received. Ref: ${r.reference}. Our team will be in touch within 24 hours to schedule your clinical assessment.`, 'ok')
      },
      onClose: () => setPaying(false),
      onError: (msg) => {
        setPaying(false)
        showNotif('Payment Error', msg)
      },
    })
  }

  return (
    <>
      <Helmet>
        <title>Refundable Admission Deposit | House of Refuge</title>
        <meta name="description" content="Pay your fully refundable House of Refuge admission booking deposit." />
      </Helmet>

      <div className="ph"><div className="container">
        <h1>Refundable Admission Deposit</h1>
        <p>Reserve your clinical assessment slot — fully refundable</p>
      </div></div>

      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          {loading ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <span className="spin" /> <span style={{ marginLeft: 10 }}>Loading your application…</span>
            </div>
          ) : !app ? (
            <div className="card" style={{ padding: 32 }}>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', marginBottom: 8 }}>Application not found</h2>
              <p style={{ color: 'var(--g700)', fontSize: '.9rem' }}>
                We could not find an application matching this link. Please call us on{' '}
                <a href="tel:09112777600" style={{ color: 'var(--blue)', fontWeight: 600 }}>09112777600</a>{' '}
                or email{' '}
                <a href="mailto:e.abutu@freedomfoundationng.org" style={{ color: 'var(--blue)', fontWeight: 600 }}>e.abutu@freedomfoundationng.org</a>.
              </p>
              <Link to="/apply" className="btn btn--primary btn--sm" style={{ marginTop: 16 }}>Start a new application</Link>
            </div>
          ) : app.deposit_paid ? (
            <div className="card" style={{ padding: 32 }}>
              <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#1A7A4A', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
                Deposit received
              </div>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', marginBottom: 8 }}>Thank you, {app.first_name}</h2>
              <p style={{ color: 'var(--g700)', fontSize: '.95rem', lineHeight: 1.7 }}>
                Your refundable deposit has been received and your clinical assessment slot is reserved. Our admissions team will contact you within 24 hours to schedule your assessment. The deposit remains held in trust on your behalf — no costs will be billed against it without your written consent.
              </p>
            </div>
          ) : (
            <>
              <div className="card" style={{ padding: 28, marginBottom: 16 }}>
                <div style={{ fontSize: '.74rem', fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
                  Application {app.id?.toString().slice(0, 8)} &middot; Pathway {app.pathway}
                </div>
                <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', marginBottom: 4 }}>
                  Hello {app.first_name},
                </h2>
                <p style={{ color: 'var(--g700)', fontSize: '.95rem', lineHeight: 1.7, marginBottom: 0 }}>
                  Your application has been reviewed and we are inviting you to proceed to the clinical assessment stage. To reserve your slot please pay the <strong>fully refundable booking deposit of {fmt(DEPOSIT_AMOUNT_NAIRA)}</strong> below. <strong>The clinical assessment cannot begin until this deposit is received.</strong> Read the terms first — they are designed to protect you.
                </p>
              </div>

              <div className="card" style={{ padding: 24, marginBottom: 16, background: 'rgba(26,95,173,.04)', border: '1px solid rgba(26,95,173,.15)' }}>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', color: 'var(--blue)', marginBottom: 12 }}>How the deposit works</h3>
                <ol style={{ paddingLeft: 18, fontSize: '.92rem', lineHeight: 1.75, color: 'var(--g700)', margin: 0 }}>
                  <li><strong>The deposit is fully refundable.</strong> It does not commit you to anything beyond the assessment stage. You may withdraw at any time and receive a full refund.</li>
                  <li><strong>Admission is not yet confirmed.</strong> Final admission is conditional on the completion <em>and</em> the results of the clinical assessments and diagnostic investigations.</li>
                  <li><strong>Assessment costs are only billed against the deposit with your written consent</strong> — and only after you have been selected for admission and confirmed you wish to proceed. Until then, the full deposit remains held in trust on your behalf.</li>
                  <li><strong>If you are not selected, or you choose not to proceed, the unused balance is refunded in full</strong> within 7 working days.</li>
                </ol>
              </div>

              <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 8 }}>Indicative assessment & investigation costs</h3>
                <p style={{ fontSize: '.82rem', color: 'var(--g500)', marginBottom: 12, lineHeight: 1.6 }}>
                  For full transparency. The actual list depends on your clinical profile and is agreed with you in writing before anything is billed.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 14px', fontSize: '.86rem' }}>
                  {DEFAULT_ASSESSMENT_LINE_ITEMS.map(item => (
                    <React.Fragment key={item.label}>
                      <div style={{ color: 'var(--g700)', borderBottom: '1px solid var(--g100)', padding: '6px 0' }}>{item.label}</div>
                      <div style={{ color: 'var(--g500)', borderBottom: '1px solid var(--g100)', padding: '6px 0', whiteSpace: 'nowrap' }}>{item.range}</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 24, background: 'var(--gold-lt, #FEF7E6)', border: '1px solid #F0D77A', marginBottom: 16 }}>
                <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#7A5A15', marginBottom: 6 }}>Your refund right</div>
                <p style={{ fontSize: '.86rem', color: '#7A5A15', lineHeight: 1.6, margin: 0 }}>
                  You may request a refund of any unused balance at any point before you have given written consent for assessment costs to be billed. Refunds are processed within 7 working days to the same account from which the deposit was paid.
                </p>
              </div>

              <div className="card" style={{ padding: 24 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16, cursor: 'pointer' }}>
                  <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} style={{ marginTop: 4 }} />
                  <span style={{ fontSize: '.88rem', color: 'var(--g700)', lineHeight: 1.6 }}>
                    I have read and understood the deposit terms above. I understand the deposit is fully refundable, that admission is conditional on assessment results, and that no costs will be billed against my deposit without my written consent.
                  </span>
                </label>
                <button
                  className="btn btn--primary btn--full"
                  onClick={handlePay}
                  disabled={paying || !acknowledged}
                >
                  {paying ? <span className="spin" /> : `Pay refundable deposit (${fmt(DEPOSIT_AMOUNT_NAIRA)})`}
                </button>
                <p style={{ fontSize: '.74rem', color: 'var(--g500)', textAlign: 'center', marginTop: 10 }}>
                  Secured by Paystack &middot; Bank transfer? Call <a href="tel:09112777600" style={{ color: 'var(--blue)' }}>09112777600</a>
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
