import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import styles from './Prospectus.module.css'

export default function Prospectus() {
  const nav = useNavigate()

  return (
    <>
      <Helmet>
        <title>Family Prospectus | House of Refuge — Drug Rehabilitation, Lekki</title>
        <meta name="description" content="A complete family guide to House of Refuge: a 24-bed faith-integrated, clinically-governed residential drug rehabilitation programme in Lekki, Lagos. Admissions, the 12-week pathway, fees, and what families should expect." />
      </Helmet>

      {/* ── Section 1: Hero ─────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={`${styles.eyebrow} fu fu1`}>For Families · A Prospectus</div>
          <h1 className={`${styles.heroTitle} fu fu1`}>
            When your family needs <em>more than hope.</em>
          </h1>
          <p className={`${styles.heroSub} fu fu2`}>
            House of Refuge is a 24-bed residential drug rehabilitation centre in Lekki, Lagos — where international clinical standards and faith-integrated recovery are not in tension, but in partnership. Twelve weeks. A clinically-led programme. A son or daughter who comes home whole.
          </p>
          <div className={`${styles.trustRow} fu fu2`}>
            <span className={styles.trustPill}>Lagos MOH licensed</span>
            <span className={styles.trustPill}>NDLEA registered</span>
            <span className={styles.trustPill}>WHO / UNODC protocols</span>
            <span className={styles.trustPill}>Freedom Foundation Initiative</span>
          </div>
          <div className={`${styles.heroActs} fu fu3`}>
            <button className="btn btn--gold" onClick={() => nav('/apply')}>Begin Admission</button>
            <a className="btn btn--outline-white" href="tel:+2349112777600">Call 0911 277 7600</a>
          </div>
          <div className={`${styles.callout} fu fu4`}>
            <div className={styles.calloutLead}>Every resident receives the same clinical standard.</div>
            <div className={styles.calloutSub}>The same psychiatrist, the same protocols, the same nursing care. What you pay for is privacy and amenity — never better medicine.</div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Is HOR Right for Your Loved One? ─────── */}
      <section className="section">
        <div className="container">
          <div className="sh" style={{ textAlign: 'left', marginBottom: 28 }}>
            <div className="sh__lbl">Section One · Suitability</div>
            <h2 style={{ maxWidth: 640 }}>Is House of Refuge right for your loved one?</h2>
            <div className="dv" />
          </div>

          <p className={styles.lead}>
            We do not admit every applicant. Recovery is not something that can be done <em>to</em> a person — it is something we walk through <em>with</em> them. The willingness of the person seeking treatment is the single most important factor in long-term recovery, and it is the very first thing we assess.
          </p>

          <div className={styles.gateBox}>
            <div className={styles.gateLbl}>The Willingness Gateway</div>
            <h3 className={styles.gateTitle}>Voluntary willingness is non-negotiable.</h3>
            <p className={styles.gateBody}>
              Before any clinical assessment, our team holds a structured conversation with your loved one — assessing readiness for change using the URICA framework and motivational interviewing. <strong>If they are not yet willing, we do not force admission.</strong> Instead, we offer an <strong>Outpatient Engagement Pathway</strong> to meet them where they are. We never simply turn a family away.
            </p>
          </div>

          <h3 style={{ fontSize: '1.2rem', marginBottom: 6 }}>Five Inclusion Criteria</h3>
          <p style={{ fontSize: '.95rem', color: 'var(--g700)', marginBottom: 22 }}>All five must be met for residential admission.</p>
          <div className={styles.critGrid}>
            <div className={styles.critItem}>
              <div><span className={styles.critN}>1</span><span className={styles.critTitle}>Voluntary Willingness</span></div>
              <p className={styles.critDesc}>Your loved one personally consents to treatment and demonstrates readiness for change.</p>
            </div>
            <div className={styles.critItem}>
              <div><span className={styles.critN}>2</span><span className={styles.critTitle}>SUD Diagnosis</span></div>
              <p className={styles.critDesc}>A clinically confirmed substance use disorder, established through ASI/ASSIST screening.</p>
            </div>
            <div className={styles.critItem}>
              <div><span className={styles.critN}>3</span><span className={styles.critTitle}>Medical Stability</span></div>
              <p className={styles.critDesc}>Cleared on the nine pre-admission medical tests; safe to undergo supervised detox.</p>
            </div>
            <div className={styles.critItem}>
              <div><span className={styles.critN}>4</span><span className={styles.critTitle}>Functional Capacity</span></div>
              <p className={styles.critDesc}>Able to participate in daily therapy, group sessions, and structured residential life.</p>
            </div>
            <div className={styles.critItem}>
              <div><span className={styles.critN}>5</span><span className={styles.critTitle}>No Immediate Risk</span></div>
              <p className={styles.critDesc}>No active threat of harm to self or others requiring acute psychiatric containment.</p>
            </div>
          </div>

          <div className={styles.exclFooter} style={{ borderTop: '1px solid #E5E9EE', paddingTop: 28, marginTop: 32 }}>
            <h3 className={styles.exclTitle}>Conditions we cannot safely treat in residence</h3>
            <p className={styles.exclLead}>
              We are honest with families about our limits. The following presentations require an acute psychiatric or specialist setting, not a residential rehabilitation programme. If your loved one falls into these categories, we will help you find appropriate care.
            </p>
            <div className={styles.exclList}>
              <span className={styles.exclTag}>Active psychosis</span>
              <span className={styles.exclTag}>Severe suicidal or homicidal risk</span>
              <span className={styles.exclTag}>Drug-induced psychosis</span>
              <span className={styles.exclTag}>Active antipsychotic medication need</span>
              <span className={styles.exclTag}>Severe cognitive impairment</span>
              <span className={styles.exclTag}>Active legal detention</span>
              <span className={styles.exclTag}>Dependent children requiring co-habitation</span>
            </div>
            <p style={{ fontSize: '.9rem', color: 'var(--g700)', marginTop: 16, lineHeight: 1.7 }}>
              We are an inpatient rehabilitation centre — not an acute psychiatric hospital, a court-mandated facility, or a family residence. These boundaries exist to keep every resident safe.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 3: The 12-Week Pathway ──────────────────── */}
      <section className="section section--alt">
        <div className="container">
          <div className="sh" style={{ textAlign: 'left', marginBottom: 28 }}>
            <div className="sh__lbl">Section Two · The Pathway</div>
            <h2 style={{ maxWidth: 640 }}>Twelve weeks. Four phases. One clinically-led pathway.</h2>
            <div className="dv" />
          </div>

          <p className={styles.lead}>
            The HOR programme is delivered across four clinical phases over twelve weeks. Each phase has defined goals, weekly clinical reviews, and clear family touchpoints — so you are never wondering where your loved one is in their recovery, or what comes next.
          </p>

          <div className={styles.timeline}>
            <div className={styles.timelineRail} />
            <div className={styles.weekMarks}>
              <div className={styles.weekMark}>
                <div className={styles.weekDot}>1–2</div>
                <div className={styles.weekRange}>Stabilization</div>
              </div>
              <div className={styles.weekMark}>
                <div className={styles.weekDot}>3–6</div>
                <div className={styles.weekRange}>Foundation</div>
              </div>
              <div className={styles.weekMark}>
                <div className={styles.weekDot}>7–10</div>
                <div className={styles.weekRange}>Deepening</div>
              </div>
              <div className={styles.weekMark}>
                <div className={styles.weekDot}>11–12</div>
                <div className={styles.weekRange}>Reintegration</div>
              </div>
            </div>
          </div>

          <div className={styles.phases}>
            <div className={styles.phase}>
              <div className={styles.phaseLbl}>Phase One</div>
              <div className={styles.phaseTitle}>Medical Stabilization</div>
              <div className={styles.phaseWeeks}>Weeks 1–2</div>
              <ul className={styles.phaseList}>
                <li>Supervised medical detox with 24/7 nursing</li>
                <li>Vitals, nutrition, and sleep stabilization</li>
                <li>Full programme orientation</li>
                <li>Initial spiritual care + chaplaincy</li>
              </ul>
              <div className={styles.phaseFamily}>
                <span className={styles.phaseFamilyLbl}>Family Touchpoint</span>
                Welcome call within 72 hours. Orientation pack delivered. Visitation begins from Week 2.
              </div>
            </div>

            <div className={styles.phase}>
              <div className={styles.phaseLbl}>Phase Two</div>
              <div className={styles.phaseTitle}>Therapeutic Foundation</div>
              <div className={styles.phaseWeeks}>Weeks 3–6</div>
              <ul className={styles.phaseList}>
                <li>Group CBT and relapse-prevention work</li>
                <li>Weekly 1:1 counselling (daily on Signature)</li>
                <li>Psychoeducation, life skills, fitness</li>
                <li>Week 4 multidisciplinary treatment review</li>
              </ul>
              <div className={styles.phaseFamily}>
                <span className={styles.phaseFamilyLbl}>Family Touchpoint</span>
                First family therapy session by Week 4. Sunday visitation each week. Treatment review report shared.
              </div>
            </div>

            <div className={styles.phase}>
              <div className={styles.phaseLbl}>Phase Three</div>
              <div className={styles.phaseTitle}>Deepening &amp; Skills</div>
              <div className={styles.phaseWeeks}>Weeks 7–10</div>
              <ul className={styles.phaseList}>
                <li>Trauma processing and family-systems work</li>
                <li>Vocational assessment and planning</li>
                <li>Personal Relapse Prevention Plan (PRPP)</li>
                <li>Week 8 progress review with MDT</li>
              </ul>
              <div className={styles.phaseFamily}>
                <span className={styles.phaseFamilyLbl}>Family Touchpoint</span>
                Family-systems sessions deepen. 24-hour and 48-hour passes become available based on conduct.
              </div>
            </div>

            <div className={styles.phase}>
              <div className={styles.phaseLbl}>Phase Four</div>
              <div className={styles.phaseTitle}>Reintegration</div>
              <div className={styles.phaseWeeks}>Weeks 11–12</div>
              <ul className={styles.phaseList}>
                <li>Pre-discharge clinical assessment</li>
                <li>Aftercare and reintegration plan</li>
                <li>Graduation ceremony</li>
                <li>Alumni Programme enrolment</li>
              </ul>
              <div className={styles.phaseFamily}>
                <span className={styles.phaseFamilyLbl}>Family Touchpoint</span>
                Pre-discharge family meeting. Graduation ceremony. Year-one aftercare schedule confirmed.
              </div>
            </div>
          </div>

          <p className={styles.extension}>
            Where clinically indicated, the programme is extendable to six months at the same monthly tier rate. Extension is recommended by the multidisciplinary team — never sold.
          </p>
        </div>
      </section>

      {/* ── Section 4: Joining the programme ───────────────── */}
      <section className="section">
        <div className="container">
          <div className="sh" style={{ textAlign: 'left', marginBottom: 28 }}>
            <div className="sh__lbl">Section Three · Joining HOR</div>
            <h2 style={{ maxWidth: 720 }}>Programme fees, admission flow, and exactly how your money is held.</h2>
            <div className="dv" />
          </div>

          <p className={styles.lead}>
            A clinical decision and a financial decision happen together. Below is exactly how both work — what you pay, when, what each part of the deposit covers, and what protects you at every step.
          </p>

          {/* 4a — Tier pricing */}
          <h3 className={styles.subhead}>Programme fees — two tiers</h3>
          <p className={styles.subleadShort}>
            Both tiers receive the same clinical standard. The difference is privacy, amenity, and the rhythm of one-to-one contact — not the medicine.
          </p>
          <div className={styles.tierGrid}>
            <div className={`${styles.tierCard} ${styles.tierSignature}`}>
              <div className={styles.tierBadge}>Signature</div>
              <div className={styles.tierBeds}>3 beds · always limited</div>
              <div className={styles.tierPrice}>NGN 4,500,000<span className={styles.tierPer}>/month</span></div>
              <div className={styles.tierTotal}>3-month total: NGN 13,500,000</div>
              <ul className={styles.tierList}>
                <li>Private en-suite room — single occupancy</li>
                <li>Daily 1:1 therapy with a clinical psychologist</li>
                <li>4 family sessions per month</li>
                <li>Personal chaplain — weekly</li>
                <li>Concierge admissions with private transport</li>
                <li>Signature menu — broader, with premium options</li>
                <li>Vocational planning + structured aftercare</li>
              </ul>
            </div>
            <div className={`${styles.tierCard} ${styles.tierPremium}`}>
              <div className={styles.tierBadge}>Premium</div>
              <div className={styles.tierBeds}>19 beds</div>
              <div className={styles.tierPrice}>NGN 2,800,000<span className={styles.tierPer}>/month</span></div>
              <div className={styles.tierTotal}>3-month total: NGN 8,400,000</div>
              <ul className={styles.tierList}>
                <li>En-suite room — 2-bed shared</li>
                <li>1:1 counselling — 3 sessions per week</li>
                <li>2 family sessions per month</li>
                <li>Group chaplaincy — daily</li>
                <li>Concierge admissions + dedicated keyworker</li>
                <li>Premium menu (Signature menu add-on available)</li>
                <li>Reintegration plan + structured aftercare</li>
              </ul>
            </div>
          </div>
          <p className={styles.tierFooter}>
            <strong>Both tiers include:</strong> on-site consultant psychiatrist (5 days/week), 24/7 nursing, supervised detox, daily group therapy, daily fitness, full aftercare planning, and the same WHO/UNODC clinical protocols. Three-month programme may be paid in three monthly instalments — admission confirmed on receipt of Month 1.
          </p>

          {/* 4b — 6-stage admission flow */}
          <h3 className={styles.subhead} style={{ marginTop: 64 }}>The admission flow</h3>
          <p className={styles.subleadShort}>
            Six stages between your first call and your loved one's first day. Each is documented; nothing happens behind closed doors.
          </p>
          <div className={styles.flowList}>
            <div className={styles.flowStep}>
              <div className={styles.flowN}>1</div>
              <div>
                <div className={styles.flowTitle}>Self-assessment</div>
                <div className={styles.flowMeta}>Free · About 30 minutes online</div>
                <p className={styles.flowDesc}>You complete a structured intake form online — substance history, medical history, family context, willingness for treatment. This becomes the working file for the clinical team.</p>
              </div>
            </div>
            <div className={styles.flowStep}>
              <div className={styles.flowN}>2</div>
              <div>
                <div className={styles.flowTitle}>Deposit</div>
                <div className={styles.flowMeta}>NGN 1,000,000 · After self-assessment review</div>
                <p className={styles.flowDesc}>Once the file passes initial review, you're invited to pay the 1M deposit. This unlocks the psychiatrist's clinical assessment and reserves your place. The deposit is split — 400k assessment fee plus 600k held toward Month 1 (full breakdown below).</p>
              </div>
            </div>
            <div className={styles.flowStep}>
              <div className={styles.flowN}>3</div>
              <div>
                <div className={styles.flowTitle}>Clinical assessment</div>
                <div className={styles.flowMeta}>Within 7–14 days of deposit</div>
                <p className={styles.flowDesc}>Our consultant psychiatrist completes the clinical assessment — diagnostics, structured interview, and case review with the multidisciplinary team. The decision (accept, decline, or refer) is shared with the family within 5 working days, with written reasoning either way.</p>
              </div>
            </div>
            <div className={styles.flowStep}>
              <div className={styles.flowN}>4</div>
              <div>
                <div className={styles.flowTitle}>Pastoral interview</div>
                <div className={styles.flowMeta}>Pastor Tony Rapu · Patient and family · Booked by admissions</div>
                <p className={styles.flowDesc}>A mandatory discernment conversation with <strong>Pastor Tony Rapu</strong>, founder of the Freedom Foundation (HOR's parent organisation). The patient and family attend together. This step follows the psychiatrist's clinical decision and completes the admission gate — both clinical and pastoral clearance are required before a bed is allocated.</p>
              </div>
            </div>
            <div className={styles.flowStep}>
              <div className={styles.flowN}>5</div>
              <div>
                <div className={styles.flowTitle}>Active waitlist (if needed)</div>
                <div className={styles.flowMeta}>Up to 6 months · Monthly check-in · Renewable</div>
                <p className={styles.flowDesc}>Beds are limited (24 in total), so accepted families may need to wait. While you wait, your 600k is held — this is what reserves your place. The admissions team checks in monthly. You can withdraw at any time and receive your 600k in full.</p>
              </div>
            </div>
            <div className={styles.flowStep}>
              <div className={styles.flowN}>6</div>
              <div>
                <div className={styles.flowTitle}>Admission</div>
                <div className={styles.flowMeta}>Bed offered, family confirms, admission scheduled</div>
                <p className={styles.flowDesc}>The 600k is applied to Month 1 fees. The remaining balance (3.9M for Signature, 2.2M for Premium) is settled before admission day. Your loved one arrives, is welcomed, and begins Phase One — Medical Stabilization.</p>
              </div>
            </div>
          </div>

          {/* 4c — Deposit breakdown */}
          <div className={styles.depBox}>
            <div className={styles.depHead}>
              <div className={styles.depHeadLbl}>The 1M deposit, plain</div>
              <h3 className={styles.depTitle}>Where every Naira goes.</h3>
            </div>
            <div className={styles.depSplit}>
              <div className={styles.depPart}>
                <div className={styles.depAmt}>NGN 400,000</div>
                <div className={styles.depRole}>Clinical assessment fee · itemised</div>
                <ul>
                  <li><strong>Psychiatrist consultation</strong> (structured clinical interview)</li>
                  <li><strong>Nine pre-admission lab tests</strong>: HIV, Hep A &amp; B, urine drug screen, full blood count, liver function, malaria, Widal, chest X-ray, blood glucose</li>
                  <li><strong>Multidisciplinary case review</strong> + written admission decision</li>
                  <li><strong>Referral</strong> to an appropriate setting if admission is declined</li>
                </ul>
                <div className={styles.depTag}>Consumed once the psychiatrist begins your file.</div>
              </div>
              <div className={styles.depDivider} />
              <div className={styles.depPart}>
                <div className={styles.depAmt}>NGN 600,000</div>
                <div className={styles.depRole}>Held toward Month 1</div>
                <ul>
                  <li>Reserves your place on the active waitlist</li>
                  <li>Applied directly to Month 1 fees on admission</li>
                  <li>Refundable in full if you withdraw or we decline</li>
                  <li>Refundable if no bed opens within the hold period</li>
                </ul>
                <div className={styles.depTag}>Held — never consumed unless you admit.</div>
              </div>
            </div>
          </div>

          {/* 4d — Refund policy */}
          <h3 className={styles.subhead} style={{ marginTop: 56 }}>Refund policy in plain language</h3>
          <p className={styles.subleadShort}>
            We refund every Naira we haven't earned. The full table is below — published, not in the small print.
          </p>
          <div className={styles.refundTable}>
            <div className={styles.refundRow}>
              <div className={styles.refundCond}>Within 48 hours of paying the deposit, you change your mind</div>
              <div className={styles.refundOut}>Full <strong>NGN 1,000,000</strong> refunded</div>
            </div>
            <div className={styles.refundRow}>
              <div className={styles.refundCond}>You withdraw between 48 hours and the psychiatrist consult</div>
              <div className={styles.refundOut}><strong>600k refunded</strong>; 400k retained for clinical work</div>
            </div>
            <div className={styles.refundRow}>
              <div className={styles.refundCond}>Our psychiatrist clinically declines admission</div>
              <div className={styles.refundOut}><strong>600k refunded</strong> + written referral; 400k retained</div>
            </div>
            <div className={styles.refundRow}>
              <div className={styles.refundCond}>You withdraw more than 14 days before admission day</div>
              <div className={styles.refundOut}><strong>600k refunded</strong></div>
            </div>
            <div className={styles.refundRow}>
              <div className={styles.refundCond}>You withdraw within 14 days of admission day</div>
              <div className={styles.refundOut}>50% of 600k refunded; 50% retained as bed-hold cancellation</div>
            </div>
            <div className={styles.refundRow}>
              <div className={styles.refundCond}>We cannot offer a bed within your active waitlist hold</div>
              <div className={styles.refundOut}><strong>600k refunded</strong>; 400k retained</div>
            </div>
            <div className={styles.refundRow}>
              <div className={styles.refundCond}>You withdraw voluntarily during the waitlist hold</div>
              <div className={styles.refundOut}><strong>600k refunded</strong> in full, anytime</div>
            </div>
            <div className={styles.refundRow}>
              <div className={styles.refundCond}>You decline a slot offer once it's made</div>
              <div className={styles.refundOut}><strong>600k refunded</strong>; place released, no haggling</div>
            </div>
            <div className={styles.refundRow}>
              <div className={styles.refundCond}>Within 72 hours of admission, your loved one withdraws</div>
              <div className={styles.refundOut}><strong>80%</strong> of total Month 1 paid refunded; 400k not refundable</div>
            </div>
            <div className={styles.refundRow}>
              <div className={styles.refundCond}>Withdrawal after 72 hours of admission</div>
              <div className={styles.refundOut}>No refund (no exceptions)</div>
            </div>
            <div className={styles.refundRow}>
              <div className={styles.refundCond}>Medical discharge after Month 1 (clinical reasons)</div>
              <div className={styles.refundOut}>Months 2+ refunded pro-rata</div>
            </div>
          </div>

          {/* 4e — Waitlist mechanics */}
          <div className={styles.waitBox}>
            <div className={styles.waitHead}>How the waitlist actually works</div>
            <ul className={styles.waitList}>
              <li><strong>Active hold lasts 6 months</strong> — renewable on confirmation if you wish to keep waiting.</li>
              <li><strong>Monthly check-in.</strong> The admissions team contacts you each month to confirm continued interest. Two missed monthly contacts and we release the hold and refund the 600k.</li>
              <li><strong>Withdraw whenever you need to.</strong> You can leave the waitlist at any time — by phone, email, or in person. 600k refunded in full.</li>
              <li><strong>One decline is a clean exit.</strong> If a slot is offered and you decline it, we treat that as your decision and refund the 600k. No haggling.</li>
              <li><strong>Re-assessment after 6 months.</strong> Clinical assessments age. If you wait beyond six months, a brief re-assessment (NGN 100,000) updates the clinical file before admission.</li>
            </ul>
          </div>

          <p className={styles.closingNote}>
            The Pricing One-Pager (PDF) is available on request and provides this same information in printed form. If anything in this section is unclear, or you'd like to talk through your specific situation, the admissions team responds in confidence within one working day.
          </p>
        </div>
      </section>

      {/* ── Section 5: A Day in the Life (meals first) ─────── */}
      <section className="section section--alt">
        <div className="container">
          <div className="sh" style={{ textAlign: 'left', marginBottom: 28 }}>
            <div className="sh__lbl">Section Four · A Day in the Life</div>
            <h2 style={{ maxWidth: 720 }}>The rhythm of recovery, plate by plate, hour by hour.</h2>
            <div className="dv" />
          </div>

          <h3 className={styles.subhead}>Meals as part of the medicine</h3>
          <p className={styles.mealsLead}>
            Detox is exhausting work for the body. Sleep, hydration, blood sugar, and basic nutrition all suffer through addiction — and recovery is partly the slow business of putting them back together. Three meals and two light snacks each day are the steady, daily way that work gets done.
          </p>
          <p className={styles.mealsLead}>
            Our catering partner <strong>CookedIndoors</strong> prepares every meal fresh, with menus shaped alongside the clinical team. The food is warm, varied, and deliberately familiar — meals residents recognise from home, not the bland institutional cooking that defines too many rehabilitation centres. Snacks are kept light and designed to be shared: a small daily ritual of community, taken at the longer gaps between sessions.
          </p>

          <div className={styles.mealRhythm}>
            <div className={styles.mealRhythmHead}>The daily rhythm</div>
            <div className={styles.mealList}>
              <div className={styles.mealItem}><strong>8:00 AM</strong><span>Breakfast, after morning prayer</span></div>
              <div className={styles.mealItem}><strong>10:30 AM</strong><span>Mid-morning snack</span></div>
              <div className={styles.mealItem}><strong>12:30 PM</strong><span>Lunch</span></div>
              <div className={styles.mealItem}><strong>3:30 PM</strong><span>Afternoon snack</span></div>
              <div className={styles.mealItem}><strong>6:00 PM</strong><span>Dinner, before evening chapel</span></div>
            </div>
          </div>

          <p className={styles.mealsLead}>
            <strong>Every dietary need is accommodated</strong> — halal, vegetarian, diabetic, hypertensive, allergy-led — without families needing to negotiate it. The clinical and catering teams agree the resident's plan at intake, and adjust it through the programme as recovery progresses.
          </p>

          <div className={styles.mealsTierNote}>
            <strong>A note on tiers.</strong> Signature residents eat off the <strong>Signature menu</strong> — broader, with additional protein options and weekend specials routed through the CookedIndoors platform. Premium residents eat off the <strong>Premium menu</strong>, fresh and varied, with the option to upgrade to full Signature menu access for any month at NGN 30,000. The clinical team reviews every plate; every dietary need is met regardless of tier. The medicine doesn't change.
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="cta">
        <div className="container">
          <h2>Ready to begin?</h2>
          <p>An admissions counsellor will respond within one working day, in confidence.</p>
          <div className="cta__acts">
            <button className="btn btn--white" onClick={() => nav('/apply')}>Begin Admission</button>
            <a className="btn btn--outline-white" href="tel:+2349112777600">Call 0911 277 7600</a>
          </div>
        </div>
      </section>
    </>
  )
}
