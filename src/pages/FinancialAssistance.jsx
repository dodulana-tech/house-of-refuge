import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import styles from './FinancialAssistance.module.css'

export default function FinancialAssistance() {
  const nav = useNavigate()

  return (
    <>
      <Helmet>
        <title>Financial Assistance | House of Refuge</title>
        <meta name="description" content="Need-based admission to House of Refuge. Two donor-funded beds reviewed independently by Freedom Foundation. Apply for financial assistance for residential drug rehabilitation in Lekki, Lagos." />
      </Helmet>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>Need-based admission · A Freedom Foundation Programme</div>
          <h1 className={styles.title}>When recovery should not depend on <em>means.</em></h1>
          <p className={styles.sub}>
            Need-based admission is fully donor-funded and reserved for families experiencing genuine financial hardship — independently reviewed by the Freedom Foundation Financial Assistance Committee. <strong>The clinical standard does not change.</strong> Placements operate on a separate waitlist with unpredictable wait times; capacity is extremely limited and dependent on funding availability.
          </p>
          <div className={styles.acts}>
            <button className="btn btn--gold" onClick={() => nav('/assistance/apply')}>Begin application</button>
            <a className="btn btn--outline-white" href="tel:+2349112777600">Call 0911 277 7600</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sh" style={{ textAlign: 'left', marginBottom: 28 }}>
            <div className="sh__lbl">Section One · Eligibility</div>
            <h2 style={{ maxWidth: 640 }}>Who can apply.</h2>
            <div className="dv" />
          </div>
          <p className={styles.lead}>
            All three conditions must be met. Clinical fit and financial need are assessed separately — by different teams — to protect both the integrity of the clinical decision and the dignity of the applicant.
          </p>
          <div className={styles.eligGrid}>
            <div className={styles.eligCard}>
              <span className={styles.eligNum}>1</span><span className={styles.eligTitle}>Clinical fit</span>
              <p className={styles.eligDesc}>Your loved one meets HOR's five inclusion criteria: willingness, SUD diagnosis, medical stability, functional capacity, no immediate risk. The clinical bar is the same as for paying admissions.</p>
            </div>
            <div className={styles.eligCard}>
              <span className={styles.eligNum}>2</span><span className={styles.eligTitle}>Verified hardship</span>
              <p className={styles.eligDesc}>Demonstrated inability to afford private treatment, with documentation (income, dependants, prior medical bills, household context). Reviewed only by Freedom Foundation — not HOR clinical.</p>
            </div>
            <div className={styles.eligCard}>
              <span className={styles.eligNum}>3</span><span className={styles.eligTitle}>Community endorsement</span>
              <p className={styles.eligDesc}>A pastor, NGO, or recognised community body endorses the application and commits to supporting the family through admission and reintegration.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <div className="sh" style={{ textAlign: 'left', marginBottom: 28 }}>
            <div className="sh__lbl">Section Two · What is covered</div>
            <h2 style={{ maxWidth: 640 }}>Same clinical standard. Different amenity profile.</h2>
            <div className="dv" />
          </div>
          <p className={styles.lead}>
            Need-based residents receive the same medicine as paying residents. The clinical core is identical; what differs is the amenity and the one-to-one cadence.
          </p>
          <div className={styles.coverGrid}>
            <ul className={styles.coverList}>
              <li>On-site consultant psychiatrist (5 days/week)</li>
              <li>24/7 nursing and supervised detox</li>
              <li>WHO/UNODC clinical protocols</li>
              <li>Daily group therapy (CBT, 12-step, faith)</li>
              <li>Daily MDT case reviews</li>
              <li>Full discharge &amp; aftercare plan</li>
            </ul>
            <ul className={styles.coverList}>
              <li>En-suite shared accommodation</li>
              <li>1:1 counselling — 2 sessions per week</li>
              <li>1 family session per month</li>
              <li>Group chaplaincy — daily</li>
              <li>Daily fitness programme</li>
              <li>Standard admissions process</li>
            </ul>
          </div>
          <p className={styles.note}>
            Differences from paying tiers are matters of amenity and cadence — not clinical standard. There is no concierge admission, no private transport, and no a la carte add-ons. Family-session frequency is lighter (1/month vs. 2–4/month). None of this changes the medicine.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sh" style={{ textAlign: 'left', marginBottom: 28 }}>
            <div className="sh__lbl">Section Three · How to apply</div>
            <h2 style={{ maxWidth: 640 }}>A separate process — by design.</h2>
            <div className="dv" />
          </div>
          <p className={styles.lead}>
            Financial fit and clinical fit are decided independently — financial fit by Freedom Foundation, clinical fit by HOR's psychiatrist. The two never see each other's notes.
          </p>
          <div className={styles.flowList}>
            {[
              { n: 1, t: 'Begin online', m: 'Free · About 20 minutes', d: 'Start the Financial Support Form. No deposit required at this stage.' },
              { n: 2, t: 'Submit form + documents', m: 'Income, household, pastoral referral letter', d: 'Routed directly to Freedom Foundation. HOR clinical does not see financial details.' },
              { n: 3, t: 'Foundation review', m: 'Quarterly cycle', d: 'Independent committee. Notification within 30 days of cycle close, by phone and email.' },
              { n: 4, t: 'Clinical assessment', m: 'If financially approved', d: 'The same clinical pathway as paying admissions begins. Psychiatrist consult and decision in writing.' },
              { n: 5, t: 'Pastoral interview', m: 'Pastor Tony Rapu · Patient and family', d: 'A mandatory discernment conversation with Pastor Tony Rapu, founder of Freedom Foundation. Patient and family attend together. Booked by admissions; required for every admission regardless of pathway.' },
              { n: 6, t: 'Admission', m: 'On full clearance and bed availability', d: 'Phase One — Medical Stabilization — begins. Treatment plan, family touchpoints, and aftercare are identical to paying admissions.' },
            ].map(s => (
              <div key={s.n} className={styles.flowStep}>
                <div className={styles.flowN}>{s.n}</div>
                <div>
                  <div className={styles.flowTitle}>{s.t}</div>
                  <div className={styles.flowMeta}>{s.m}</div>
                  <p className={styles.flowDesc}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.confidBox}>
            <div className={styles.confidLbl}>Confidentiality</div>
            <p>Financial Support Forms are reviewed <strong>only by Freedom Foundation</strong>. HOR's clinical team does not have access to financial details. Sponsored residents are <strong>not identifiable</strong> to other residents or staff outside the admissions process. The clinical relationship begins on equal footing with every paying admission.</p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <h2>Begin the Financial Support Form.</h2>
          <p>Free to begin. About 20 minutes. Routed in confidence to the Freedom Foundation Financial Assistance Committee.</p>
          <div className="cta__acts">
            <button className="btn btn--white" onClick={() => nav('/assistance/apply')}>Begin application</button>
            <a className="btn btn--outline-white" href="tel:+2349112777600">Call 0911 277 7600</a>
          </div>
        </div>
      </section>
    </>
  )
}
