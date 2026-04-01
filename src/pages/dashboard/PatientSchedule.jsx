import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

/*
  Patient Schedule — Patient-facing daily schedule view (SOP Chapter 5)
  Simplified view of the daily programme schedule.
  HIPAA: no identifiable data.
*/

const WEEKDAY_SCHEDULE = [
  { time: '5:30 AM', name: 'Wake-up & Personal Hygiene', location: 'Dormitory', type: 'activity' },
  { time: '6:00 AM', name: 'Boot Camp / Physical Exercise', location: 'Compound', type: 'activity' },
  { time: '6:45 AM', name: 'Shower & Dress', location: 'Dormitory', type: 'activity' },
  { time: '7:00 AM', name: 'Morning Prayer & Devotions', location: 'Chapel', type: 'spiritual' },
  { time: '7:30 AM', name: 'Breakfast', location: 'Dining Hall', type: 'meal' },
  { time: '8:00 AM', name: 'Chores & Room Inspection', location: 'Facility', type: 'activity' },
  { time: '9:00 AM', name: 'Bible School / Spiritual Formation', location: 'Chapel', type: 'spiritual' },
  { time: '11:00 AM', name: 'Group Therapy: CBT / Relapse Prevention', location: 'Therapy Room', type: 'therapy' },
  { time: '12:30 PM', name: 'Lunch', location: 'Dining Hall', type: 'meal' },
  { time: '1:00 PM', name: 'Rest Period', location: 'Dormitory', type: 'activity' },
  { time: '1:30 PM', name: 'Life Skills Training', location: 'Training Room', type: 'therapy' },
  { time: '3:00 PM', name: 'Afternoon Tea', location: 'Dining Hall', type: 'meal' },
  { time: '3:30 PM', name: 'Individual Counselling / Free Period', location: 'Counselling Room', type: 'therapy' },
  { time: '5:00 PM', name: 'Recreation / Sports', location: 'Compound', type: 'activity' },
  { time: '6:00 PM', name: 'Dinner', location: 'Dining Hall', type: 'meal' },
  { time: '7:00 PM', name: 'Evening Devotions & Reflection', location: 'Chapel', type: 'spiritual' },
  { time: '8:00 PM', name: 'Free Time / Journaling', location: 'Common Room', type: 'activity' },
  { time: '9:30 PM', name: 'Prepare for Bed', location: 'Dormitory', type: 'activity' },
  { time: '10:00 PM', name: 'Lights Out', location: 'Dormitory', type: 'activity' },
]

const SUNDAY_SCHEDULE = [
  { time: '6:00 AM', name: 'Wake-up & Personal Hygiene', location: 'Dormitory', type: 'activity' },
  { time: '7:00 AM', name: 'Morning Prayer', location: 'Chapel', type: 'spiritual' },
  { time: '7:30 AM', name: 'Breakfast', location: 'Dining Hall', type: 'meal' },
  { time: '9:00 AM', name: 'Chapel Service', location: 'Chapel', type: 'spiritual' },
  { time: '11:30 AM', name: 'Fellowship & Tea', location: 'Common Room', type: 'spiritual' },
  { time: '12:00 PM', name: 'Lunch', location: 'Dining Hall', type: 'meal' },
  { time: '12:30 PM', name: 'Family Visitation (12:00 - 6:00 PM)', location: 'Visiting Area', type: 'activity' },
  { time: '6:00 PM', name: 'Dinner', location: 'Dining Hall', type: 'meal' },
  { time: '7:00 PM', name: 'Evening Reflection & Gratitude', location: 'Chapel', type: 'spiritual' },
  { time: '9:00 PM', name: 'Prepare for Bed', location: 'Dormitory', type: 'activity' },
  { time: '10:00 PM', name: 'Lights Out', location: 'Dormitory', type: 'activity' },
]

const typeBadgeColors = {
  spiritual: { bg: '#FFF8E1', color: '#F9A825', label: 'Spiritual' },
  therapy: { bg: '#E8EAF6', color: '#5C6BC0', label: 'Therapy' },
  meal: { bg: '#E8F5E9', color: '#388E3C', label: 'Meal' },
  activity: { bg: '#F3E5F5', color: '#8E24AA', label: 'Activity' },
}

const WEEKLY_SESSIONS = {
  individualCounselling: 'Wednesday 3:30 PM',
  groupTherapySessions: 5,
  lifeSkillsSessions: 3,
  spiritualFormation: 6,
}

function parseTime(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return 0
  let h = parseInt(match[1])
  const m = parseInt(match[2])
  const period = match[3].toUpperCase()
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return h * 60 + m
}

function getCurrentActivityIndex(schedule) {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  let idx = -1
  for (let i = 0; i < schedule.length; i++) {
    if (parseTime(schedule[i].time) <= nowMin) idx = i
  }
  return idx
}

export default function PatientSchedule() {
  const { user } = useAuth()
  const today = new Date()
  const isSunday = today.getDay() === 0
  const [viewDay, setViewDay] = useState(isSunday ? 'sunday' : 'weekday')

  const schedule = viewDay === 'sunday' ? SUNDAY_SCHEDULE : WEEKDAY_SCHEDULE
  const currentIdx = viewDay === (isSunday ? 'sunday' : 'weekday') ? getCurrentActivityIndex(schedule) : -1

  // Mock: patient is in week 3 (past detox)
  const currentWeek = 3
  const isDetoxPhase = currentWeek <= 2

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', marginBottom: 4 }}>My Schedule</h1>
        <p style={{ fontSize: '.88rem', color: 'var(--g500)' }}>
          {today.toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {isSunday ? ' — Sunday Schedule' : ' — Weekday Schedule'}
        </p>
      </div>

      {/* Detox note */}
      {isDetoxPhase && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #E53E3E', padding: 16 }}>
          <div style={{ fontSize: '.86rem', fontWeight: 600, color: '#E53E3E', marginBottom: 4 }}>Detox Phase Notice (Week 1-2)</div>
          <p style={{ fontSize: '.8rem', color: 'var(--g600)', margin: 0 }}>
            Your schedule may be modified during the Medical Stabilisation phase. Some group activities may be replaced with additional rest periods and clinical monitoring. Your care team will advise on any changes.
          </p>
        </div>
      )}

      {/* Day toggle + Session summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16 }}>
          <label style={{ fontSize: '.72rem', color: 'var(--g500)', display: 'block', marginBottom: 4 }}>View Schedule</label>
          <select value={viewDay} onChange={e => setViewDay(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--g200)', fontSize: '.84rem' }}>
            <option value="weekday">Weekday (Mon-Sat)</option>
            <option value="sunday">Sunday</option>
          </select>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', fontWeight: 700, color: '#5C6BC0' }}>{WEEKLY_SESSIONS.individualCounselling}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Individual Counselling</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--blue)' }}>{WEEKLY_SESSIONS.groupTherapySessions}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Group Therapy / Week</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 700, color: '#1A7A4A' }}>{WEEKLY_SESSIONS.lifeSkillsSessions}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--g500)' }}>Life Skills / Week</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card">
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: 16 }}>
          {viewDay === 'sunday' ? 'Sunday Schedule' : 'Daily Schedule'} (5:30 AM - 11:00 PM)
        </h3>

        <div style={{ position: 'relative', paddingLeft: 24 }}>
          {/* Vertical line */}
          <div style={{ position: 'absolute', left: 11, top: 8, bottom: 8, width: 2, background: 'var(--g200)' }} />

          {schedule.map((item, i) => {
            const isCurrent = i === currentIdx
            const badge = typeBadgeColors[item.type]
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 16, padding: '10px 0',
                borderBottom: i < schedule.length - 1 ? '1px solid var(--g50)' : 'none',
                background: isCurrent ? 'rgba(66,133,244,0.06)' : 'transparent',
                borderRadius: isCurrent ? 8 : 0,
                paddingLeft: isCurrent ? 8 : 0,
                marginLeft: isCurrent ? -8 : 0,
                position: 'relative',
              }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', left: isCurrent ? -5 : -13, top: 14,
                  width: isCurrent ? 12 : 8, height: isCurrent ? 12 : 8,
                  borderRadius: '50%',
                  background: isCurrent ? 'var(--blue)' : badge.color,
                  border: isCurrent ? '2px solid #fff' : 'none',
                  boxShadow: isCurrent ? '0 0 0 2px var(--blue)' : 'none',
                  zIndex: 1,
                }} />

                <div style={{ minWidth: 72, fontSize: '.82rem', fontWeight: isCurrent ? 700 : 600, color: isCurrent ? 'var(--blue)' : 'var(--g600)', paddingTop: 2 }}>
                  {item.time}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '.86rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--charcoal)' : 'var(--g700)' }}>{item.name}</span>
                    <span style={{ fontSize: '.66rem', padding: '2px 8px', borderRadius: 10, background: badge.bg, color: badge.color, fontWeight: 600 }}>{badge.label}</span>
                    {isCurrent && <span style={{ fontSize: '.66rem', padding: '2px 8px', borderRadius: 10, background: 'var(--blue)', color: '#fff', fontWeight: 600 }}>NOW</span>}
                  </div>
                  <div style={{ fontSize: '.72rem', color: 'var(--g500)', marginTop: 2 }}>{item.location}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
