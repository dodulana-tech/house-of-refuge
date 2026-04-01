import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Family Resources — Educational Resource Library (SOP Chapter 11)
  Display-only content for families with SOP-based resources.
  No free text fields.
*/

const RESOURCES = [
  {
    title: 'Understanding Addiction',
    desc: 'A comprehensive guide to understanding substance use disorder as a chronic brain condition, not a moral failing.',
    readTime: '12 min',
    takeaways: [
      'Addiction is classified as a chronic, relapsing brain disorder by the WHO and medical community',
      'Genetic, environmental, and psychological factors all contribute to substance use disorders',
      'Recovery is possible with the right combination of clinical treatment, support, and sustained effort',
      'Enabling behaviours (covering up, providing money, minimising) can prolong the cycle of addiction',
      'Understanding the neuroscience of addiction helps reduce stigma and blame',
    ],
  },
  {
    title: 'Setting Boundaries',
    desc: 'Learn how to establish and maintain healthy boundaries that support your loved one without enabling destructive behaviour.',
    readTime: '10 min',
    takeaways: [
      'Boundaries protect both you and your loved one during the recovery process',
      'Saying "no" to harmful requests is an act of love, not rejection',
      'Consistent boundaries reduce manipulation and codependency patterns',
      'Boundaries should be communicated clearly, calmly, and without ultimatums where possible',
    ],
  },
  {
    title: 'Preparing for Re-entry',
    desc: 'Practical guidance for families on how to prepare the home environment and family dynamics for a loved one returning from treatment.',
    readTime: '15 min',
    takeaways: [
      'Remove all alcohol and substances from the home before discharge day',
      'Establish a structured daily routine that supports recovery habits',
      'Identify and address potential triggers in the home environment',
      'Plan for continued outpatient support, meetings, and accountability',
      'Have realistic expectations — recovery is a journey, not a destination',
    ],
  },
  {
    title: 'Family Therapy Guide',
    desc: 'Understanding the role of family therapy in addiction recovery and how to get the most from your sessions.',
    readTime: '8 min',
    takeaways: [
      'Family therapy addresses relationship patterns that may contribute to substance use',
      'Sessions are a safe space to express feelings and rebuild trust',
      'Active participation from all family members improves treatment outcomes',
      'Therapists facilitate difficult conversations — honesty is essential',
    ],
  },
  {
    title: 'Self-Care for Families',
    desc: 'Caring for yourself is not selfish — it is essential. Learn strategies to maintain your own wellbeing while supporting recovery.',
    readTime: '7 min',
    takeaways: [
      'Caregiver burnout is real and common among families of those with addiction',
      'Regular self-care practices reduce stress, anxiety, and resentment',
      'Seeking your own therapy or support group is strongly recommended',
      'You cannot pour from an empty cup — prioritise sleep, nutrition, and boundaries',
    ],
  },
  {
    title: 'Support Groups',
    desc: 'Connecting with others who understand your experience can be transformative. Learn about family support networks available to you.',
    readTime: '6 min',
    takeaways: [
      'Al-Anon and Nar-Anon provide free, confidential support for families of addicts',
      'Sharing experiences in a group setting reduces isolation and shame',
      'Support groups offer practical coping strategies from people who have been through it',
      'Online meetings are available for those who cannot attend in person',
      'HOR facilitates a monthly family support group on the last Saturday of each month',
    ],
  },
]

const PHASE_RECOMMENDATIONS = {
  1: ['Understanding Addiction', 'Self-Care for Families'],
  2: ['Setting Boundaries', 'Family Therapy Guide', 'Understanding Addiction'],
  3: ['Preparing for Re-entry', 'Support Groups', 'Setting Boundaries'],
  4: ['Preparing for Re-entry', 'Support Groups', 'Self-Care for Families'],
}

const EXTERNAL_LINKS = [
  { name: 'Al-Anon Family Groups', desc: 'Support for families and friends of alcoholics', url: 'https://al-anon.org' },
  { name: 'Nar-Anon Family Groups', desc: 'Support for families affected by drug addiction', url: 'https://nar-anon.org' },
  { name: 'NDLEA Helpline', desc: 'National Drug Law Enforcement Agency — Nigeria', url: 'tel:+2348023420575' },
  { name: 'Mental Health Foundation (Nigeria)', desc: 'Resources and helplines for mental health support', url: 'https://mentalhealthng.com' },
]

const FAQ = [
  { q: 'When can I visit my loved one?', a: 'Visiting hours are Sundays from 12:00 PM to 6:00 PM. During the first two weeks (Medical Stabilisation phase), visits may be restricted to allow the resident to settle in and complete detox safely.' },
  { q: 'How long is the treatment programme?', a: 'The standard programme is 12 weeks (84 days), divided into four phases: Medical Stabilisation (Weeks 1-2), Therapeutic Foundation (Weeks 3-6), Deepening & Skills Building (Weeks 7-10), and Reintegration Preparation (Weeks 11-12).' },
  { q: 'Can I bring items for my loved one?', a: 'Yes, but all items are subject to inspection by staff. Prohibited items include alcohol, drugs, cigarettes, lighters, sharp objects, and large amounts of cash. Approved items include clothing, toiletries, and religious materials.' },
  { q: 'How will I receive updates on progress?', a: 'You will receive regular updates through the family portal. Your loved one\'s key worker will also schedule family therapy sessions where progress is discussed in detail.' },
  { q: 'What happens if my loved one wants to leave early?', a: 'Residents may self-discharge at any time as admission is voluntary. However, we strongly encourage completing the full programme. The clinical team will discuss the risks of early discharge.' },
  { q: 'Is the programme faith-based?', a: 'Yes, HOR operates within a Christian faith-based framework. Spiritual formation, including Bible study and prayer, is part of the programme. However, residents of all faiths are welcomed and their beliefs respected.' },
  { q: 'What aftercare support is available?', a: 'HOR provides 12 months of aftercare support including monthly check-ins, alumni meetings, referrals to outpatient services, and access to the family support group.' },
  { q: 'How much does the programme cost?', a: 'Programme fees are discussed during the admission process. HOR offers three tiers: full fee, subsidised, and compassion fund (for those unable to pay). No one is turned away solely due to inability to pay.' },
]

const cardColors = ['var(--blue)', '#1A7A4A', '#DD6B20', '#805AD5', 'var(--gold)', '#E53E3E']

export default function FamilyResources() {
  const { user } = useAuth()
  const [tab, setTab] = useState('resources')
  const [expandedFaq, setExpandedFaq] = useState(null)

  // Determine patient phase from user context (default phase 2)
  const patientPhase = 2
  const recommended = PHASE_RECOMMENDATIONS[patientPhase] || []

  const tabs = [
    { key: 'resources', label: 'Resource Library' },
    { key: 'recommended', label: 'Recommended for You' },
    { key: 'external', label: 'External Support' },
    { key: 'faq', label: 'FAQ' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Family Resources</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Educational materials and support for families during the recovery journey</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: tab === t.key ? 'var(--charcoal)' : 'var(--g100)', color: tab === t.key ? '#fff' : 'var(--g600)', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Resource Library */}
      {tab === 'resources' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {RESOURCES.map((res, i) => (
            <div key={i} className="card" style={{ borderTop: `3px solid ${cardColors[i]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h4 style={{ fontSize: '.95rem', fontWeight: 600 }}>{res.title}</h4>
                <span style={{ fontSize: '.68rem', padding: '2px 8px', borderRadius: 10, background: 'var(--g100)', color: 'var(--g500)', whiteSpace: 'nowrap' }}>{res.readTime}</span>
              </div>
              <p style={{ fontSize: '.82rem', color: 'var(--g600)', marginBottom: 12, lineHeight: 1.5 }}>{res.desc}</p>
              <div style={{ fontSize: '.78rem', fontWeight: 600, marginBottom: 6, color: 'var(--g600)' }}>Key Takeaways</div>
              {res.takeaways.map((t, ti) => (
                <div key={ti} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: cardColors[i], flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: '.78rem', color: 'var(--g700)', lineHeight: 1.4 }}>{t}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Recommended for You */}
      {tab === 'recommended' && (
        <div>
          <div className="card" style={{ marginBottom: 16, padding: 16, borderLeft: '4px solid var(--blue)' }}>
            <p style={{ fontSize: '.84rem', color: 'var(--g600)', margin: 0 }}>
              Based on your loved one's current treatment phase (Phase {patientPhase}), we recommend the following resources.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {RESOURCES.filter(r => recommended.includes(r.title)).map((res, i) => (
              <div key={i} className="card" style={{ borderTop: `3px solid var(--blue)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h4 style={{ fontSize: '.95rem', fontWeight: 600 }}>{res.title}</h4>
                  <span style={{ fontSize: '.68rem', padding: '2px 8px', borderRadius: 10, background: 'var(--g100)', color: 'var(--g500)', whiteSpace: 'nowrap' }}>{res.readTime}</span>
                </div>
                <p style={{ fontSize: '.82rem', color: 'var(--g600)', marginBottom: 12, lineHeight: 1.5 }}>{res.desc}</p>
                {res.takeaways.map((t, ti) => (
                  <div key={ti} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0, marginTop: 6 }} />
                    <span style={{ fontSize: '.78rem', color: 'var(--g700)', lineHeight: 1.4 }}>{t}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* External Support Links */}
      {tab === 'external' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {EXTERNAL_LINKS.map((link, i) => (
            <div key={i} className="card" style={{ borderLeft: '4px solid var(--blue)' }}>
              <h4 style={{ fontSize: '.92rem', fontWeight: 600, marginBottom: 4 }}>{link.name}</h4>
              <p style={{ fontSize: '.8rem', color: 'var(--g600)', marginBottom: 8 }}>{link.desc}</p>
              <span style={{ fontSize: '.78rem', color: 'var(--blue)', fontWeight: 600 }}>{link.url}</span>
            </div>
          ))}
        </div>
      )}

      {/* FAQ */}
      {tab === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQ.map((item, i) => (
            <div key={i} className="card" style={{ padding: '14px 20px', cursor: 'pointer' }} onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--g700)', margin: 0 }}>{item.q}</h4>
                <span style={{ fontSize: '1.1rem', color: 'var(--g400)', fontWeight: 300, flexShrink: 0, marginLeft: 12 }}>{expandedFaq === i ? '-' : '+'}</span>
              </div>
              {expandedFaq === i && (
                <p style={{ fontSize: '.82rem', color: 'var(--g600)', marginTop: 10, marginBottom: 0, lineHeight: 1.6 }}>{item.a}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
