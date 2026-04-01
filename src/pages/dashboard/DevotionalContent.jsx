import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Devotional Content — Patient-facing daily faith content.
  Christ-centered devotional, prayer requests, testimony board,
  and weekly scripture memory.
  HIPAA: initials only. ALL fields are selects/checkboxes — ZERO free text.
*/

const PROGRAMME_VERSE = {
  ref: 'Luke 4:18',
  text: '"The Spirit of the Lord is on me, because he has anointed me to proclaim good news to the poor. He has sent me to proclaim freedom for the prisoners and recovery of sight for the blind, to set the oppressed free."',
}

const DEVOTIONALS = [
  {
    day: 'Monday',
    ref: 'Isaiah 43:18-19',
    text: '"Forget the former things; do not dwell on the past. See, I am doing a new thing! Now it springs up; do you not perceive it? I am making a way in the wilderness and streams in the wasteland."',
  },
  {
    day: 'Tuesday',
    ref: 'Jeremiah 29:11',
    text: '"For I know the plans I have for you," declares the LORD, "plans to prosper you and not to harm you, plans to give you hope and a future."',
  },
  {
    day: 'Wednesday',
    ref: 'Psalm 51:10',
    text: '"Create in me a pure heart, O God, and renew a steadfast spirit within me."',
  },
  {
    day: 'Thursday',
    ref: '2 Corinthians 5:17',
    text: '"Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!"',
  },
  {
    day: 'Friday',
    ref: 'Philippians 4:13',
    text: '"I can do all this through him who gives me strength."',
  },
  {
    day: 'Saturday',
    ref: 'Romans 8:28',
    text: '"And we know that in all things God works for the good of those who love him, who have been called according to his purpose."',
  },
  {
    day: 'Sunday',
    ref: 'Psalm 23:4',
    text: '"Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me."',
  },
]

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TODAY_DAY = DAYS_OF_WEEK[new Date('2026-03-31').getDay()] // Tuesday

const REFLECTION_OPTIONS = [
  'This speaks to my past',
  'This gives me hope for today',
  'This challenges me to change',
  'I want to memorize this verse',
  'I need to pray about this',
]

const PRAYER_FOCUS_OPTIONS = [
  'Gratitude',
  'Strength for today',
  'Family healing',
  'Breaking chains',
  'Identity in Christ',
  'Forgiveness',
  'Purpose and future',
]

const PRAYER_CATEGORIES = [
  'Personal healing',
  'Family restoration',
  'Strength against cravings',
  'Forgiveness',
  'Purpose/direction',
  'Other residents',
  'Staff and programme',
]

const PRAYER_STATUSES = ['Praying', 'Answered', 'Still waiting', 'Withdrawn']

const GROWTH_AREAS = ['Faith', 'Sobriety', 'Relationships', 'Self-worth', 'Forgiveness', 'Purpose', 'Gratitude']
const SHARE_OPTIONS = ['Yes', 'Not yet', 'Only with care team']

const MEMORY_ASSESSMENT = ['Haven\'t started', 'Working on it', 'Can recite partially', 'Memorized']

const WEEKLY_MEMORY_VERSES = [
  { ref: 'Galatians 5:1', text: '"It is for freedom that Christ has set us free. Stand firm, then, and do not let yourselves be burdened again by a yoke of slavery."' },
  { ref: 'John 8:36', text: '"So if the Son sets you free, you will be free indeed."' },
  { ref: 'Romans 6:14', text: '"For sin shall no longer be your master, because you are not under the law, but under grace."' },
  { ref: '1 John 1:9', text: '"If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness."' },
]

const selectS = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.85rem' }
const labelS = { fontSize: '.75rem', fontWeight: 600, color: 'var(--g500)', display: 'block', marginBottom: 4 }

export default function DevotionalContent() {
  const { user } = useAuth()
  const todayDevo = DEVOTIONALS.find(d => d.day === TODAY_DAY) || DEVOTIONALS[0]
  const [selectedDay, setSelectedDay] = useState(TODAY_DAY)
  const activeDevo = DEVOTIONALS.find(d => d.day === selectedDay) || DEVOTIONALS[0]

  const [reflection, setReflection] = useState('')
  const [prayerFocus, setPrayerFocus] = useState('')

  const [prayerCategory, setPrayerCategory] = useState('')
  const [prayerRequests, setPrayerRequests] = useState([
    { id: 1, category: 'Personal healing', date: '2026-03-28', status: 'Praying' },
    { id: 2, category: 'Family restoration', date: '2026-03-25', status: 'Still waiting' },
    { id: 3, category: 'Strength against cravings', date: '2026-03-20', status: 'Answered' },
    { id: 4, category: 'Forgiveness', date: '2026-03-15', status: 'Praying' },
  ])

  const [testimonyArea, setTestimonyArea] = useState('')
  const [testimonyShare, setTestimonyShare] = useState('')

  const [memoryAssessment, setMemoryAssessment] = useState('Working on it')

  const addPrayerRequest = () => {
    if (!prayerCategory) return
    setPrayerRequests([{ id: Date.now(), category: prayerCategory, date: '2026-03-31', status: 'Praying' }, ...prayerRequests])
    setPrayerCategory('')
  }

  const updatePrayerStatus = (id, status) => {
    setPrayerRequests(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  const statusColor = (s) => {
    if (s === 'Answered') return '#1A7A4A'
    if (s === 'Praying') return '#2B6CB0'
    if (s === 'Still waiting') return '#DD6B20'
    return 'var(--g500)'
  }

  return (
    <div>
      {/* Programme Verse Banner */}
      <div className="card" style={{ padding: 24, marginBottom: 24, background: 'linear-gradient(135deg, #2B6CB0 0%, #805AD5 100%)', color: '#fff', textAlign: 'center' }}>
        <p style={{ fontSize: '.78rem', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, opacity: .8 }}>House of Refuge Programme Verse</p>
        <p style={{ fontSize: '1.1rem', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 8 }}>{PROGRAMME_VERSE.text}</p>
        <p style={{ fontSize: '.88rem', fontWeight: 700 }}>— {PROGRAMME_VERSE.ref}</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>Daily Devotional</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>Daily scripture, reflection, and prayer — walk with God through recovery</p>
      </div>

      {/* Day Selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {DEVOTIONALS.map(devo => (
          <button key={devo.day} onClick={() => setSelectedDay(devo.day)}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: '.82rem', fontWeight: 600, cursor: 'pointer',
              border: selectedDay === devo.day ? '2px solid var(--blue)' : '1px solid var(--g200)',
              background: selectedDay === devo.day ? 'var(--blue)' : devo.day === TODAY_DAY ? '#EBF8FF' : '#fff',
              color: selectedDay === devo.day ? '#fff' : 'var(--g700)',
            }}>
            {devo.day.slice(0, 3)}
            {devo.day === TODAY_DAY && selectedDay !== devo.day && <span style={{ display: 'block', fontSize: '.6rem', color: 'var(--blue)' }}>Today</span>}
          </button>
        ))}
      </div>

      {/* Today's Devotional */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem' }}>{selectedDay}'s Scripture</h3>
          <span style={{ fontSize: '.78rem', padding: '4px 12px', borderRadius: 20, background: '#805AD520', color: '#805AD5', fontWeight: 600 }}>{activeDevo.ref}</span>
        </div>
        <div style={{ padding: 20, borderRadius: 10, background: '#F7FAFC', borderLeft: '4px solid #805AD5', marginBottom: 20 }}>
          <p style={{ fontSize: '1.05rem', fontStyle: 'italic', lineHeight: 1.7, color: 'var(--g700)' }}>{activeDevo.text}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelS}>Reflection Prompt — How does this speak to you?</label>
            <select value={reflection} onChange={e => setReflection(e.target.value)} style={selectS}>
              <option value="">Select your reflection</option>
              {REFLECTION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={labelS}>HOR Prayer Focus for Today</label>
            <select value={prayerFocus} onChange={e => setPrayerFocus(e.target.value)} style={selectS}>
              <option value="">Select prayer focus</option>
              {PRAYER_FOCUS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Prayer Requests */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16 }}>Prayer Requests</h3>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={labelS}>My Prayer Request Today</label>
            <select value={prayerCategory} onChange={e => setPrayerCategory(e.target.value)} style={selectS}>
              <option value="">Select category</option>
              {PRAYER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={addPrayerRequest}
            style={{ padding: '9px 20px', borderRadius: 6, background: '#805AD5', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', whiteSpace: 'nowrap' }}>
            Submit Prayer
          </button>
        </div>

        <div>
          <p style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', marginBottom: 8 }}>Prayer Answered Tracker</p>
          {prayerRequests.map(pr => (
            <div key={pr.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--g100)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '.78rem', color: 'var(--g400)', minWidth: 80 }}>{pr.date}</span>
              <span style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--g700)', flex: 1, minWidth: 140 }}>{pr.category}</span>
              <select value={pr.status} onChange={e => updatePrayerStatus(pr.id, e.target.value)}
                style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--g200)', fontSize: '.8rem', color: statusColor(pr.status), fontWeight: 600, background: statusColor(pr.status) + '10' }}>
                {PRAYER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Testimony Board */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 4 }}>Testimony Board</h3>
        <p style={{ fontSize: '.82rem', color: 'var(--g500)', marginBottom: 16 }}>"What is God doing in your life today?"</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelS}>Area of Growth</label>
            <select value={testimonyArea} onChange={e => setTestimonyArea(e.target.value)} style={selectS}>
              <option value="">Select area</option>
              {GROWTH_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={labelS}>Would You Share Publicly?</label>
            <select value={testimonyShare} onChange={e => setTestimonyShare(e.target.value)} style={selectS}>
              <option value="">Select</option>
              {SHARE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        {testimonyArea && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: '#F0FFF4', borderLeft: '4px solid #1A7A4A' }}>
            <p style={{ fontSize: '.88rem', color: '#22543D' }}>
              God is working in the area of <strong>{testimonyArea}</strong> in my life.
              {testimonyShare && <span> I {testimonyShare === 'Yes' ? 'am ready to share this publicly' : testimonyShare === 'Not yet' ? 'am not ready to share yet' : 'would share with my care team only'}.</span>}
            </p>
          </div>
        )}
      </div>

      {/* Weekly Scripture Memory */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: 16 }}>Weekly Scripture Memory</h3>
        <div style={{ padding: 20, borderRadius: 10, background: '#FAF5FF', borderLeft: '4px solid #805AD5', marginBottom: 16 }}>
          <p style={{ fontSize: '.78rem', color: '#805AD5', fontWeight: 600, marginBottom: 6 }}>This Week's Memory Verse</p>
          <p style={{ fontSize: '1rem', fontStyle: 'italic', lineHeight: 1.6, color: 'var(--g700)', marginBottom: 6 }}>{WEEKLY_MEMORY_VERSES[0].text}</p>
          <p style={{ fontSize: '.85rem', fontWeight: 700, color: '#805AD5' }}>— {WEEKLY_MEMORY_VERSES[0].ref}</p>
        </div>
        <div>
          <label style={labelS}>Self-Assessment: How is your memorization going?</label>
          <select value={memoryAssessment} onChange={e => setMemoryAssessment(e.target.value)} style={selectS}>
            {MEMORY_ASSESSMENT.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {memoryAssessment === 'Memorized' && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#F0FFF4', textAlign: 'center' }}>
            <p style={{ fontSize: '.88rem', color: '#1A7A4A', fontWeight: 600 }}>Praise God! You have memorized this verse. Keep it in your heart.</p>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--g500)', marginBottom: 10 }}>Previous Memory Verses</p>
          {WEEKLY_MEMORY_VERSES.slice(1).map((v, idx) => (
            <div key={idx} style={{ padding: '8px 0', borderBottom: '1px solid var(--g100)' }}>
              <span style={{ fontSize: '.82rem', fontWeight: 600, color: '#805AD5' }}>{v.ref}</span>
              <span style={{ fontSize: '.8rem', color: 'var(--g600)', marginLeft: 10 }}>{v.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
