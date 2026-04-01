import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../../context/AuthContext'
import { useNotif } from '../../App'
import { saveMealOrder, getMealOrders } from '../../utils/store'
import styles from './Portal.module.css'

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', time: '7:30 AM' },
  { key: 'lunch', label: 'Lunch', time: '12:30 PM' },
  { key: 'dinner', label: 'Dinner', time: '6:00 PM' },
]

const MENU = {
  breakfast: [
    { id: 'b1', name: 'Oatmeal with Fresh Fruits', desc: 'Rolled oats, banana, berries, honey', cal: 380, tags: ['High Fibre'] },
    { id: 'b2', name: 'Akara & Pap', desc: 'Bean cakes with corn pudding', cal: 420, tags: ['Protein Rich'] },
    { id: 'b3', name: 'Bread & Eggs', desc: 'Whole wheat toast, scrambled eggs, tea', cal: 350, tags: ['Classic'] },
    { id: 'b4', name: 'Smoothie Bowl', desc: 'Blended fruits, granola, seeds', cal: 310, tags: ['Light'] },
  ],
  lunch: [
    { id: 'l1', name: 'Jollof Rice & Grilled Chicken', desc: 'Party-style jollof with plantain', cal: 620, tags: ['Popular'] },
    { id: 'l2', name: 'Vegetable Soup & Pounded Yam', desc: 'Mixed vegetables with lean meat', cal: 580, tags: ['Traditional'] },
    { id: 'l3', name: 'Grilled Fish & Salad', desc: 'Tilapia with mixed greens', cal: 420, tags: ['Light', 'High Protein'] },
    { id: 'l4', name: 'Beans & Plantain Porridge', desc: 'Honey beans with ripe plantain', cal: 510, tags: ['High Fibre'] },
  ],
  dinner: [
    { id: 'd1', name: 'Pepper Soup & Boiled Yam', desc: 'Spicy goat meat pepper soup', cal: 480, tags: ['Light'] },
    { id: 'd2', name: 'Fried Rice & Chicken', desc: 'Mixed vegetables fried rice', cal: 550, tags: ['Classic'] },
    { id: 'd3', name: 'Noodles & Vegetables', desc: 'Stir-fried noodles with greens', cal: 390, tags: ['Quick'] },
    { id: 'd4', name: 'Moi Moi & Custard', desc: 'Steamed bean pudding with custard', cal: 440, tags: ['Protein Rich'] },
  ],
}

export default function Meals() {
  const { user } = useAuth()
  const showNotif = useNotif()
  const [selections, setSelections] = useState({})
  const [dietary, setDietary] = useState('')
  const [allergies, setAllergies] = useState('')
  const orders = getMealOrders(user?.id)

  function select(slot, item) {
    setSelections(prev => ({ ...prev, [slot]: item }))
  }

  function handleOrder() {
    if (Object.keys(selections).length === 0) {
      showNotif('Select meals', 'Please select at least one meal.')
      return
    }
    const order = {
      selections,
      dietary,
      allergies,
      status: 'confirmed',
      orderDate: new Date().toISOString().split('T')[0],
    }
    saveMealOrder(user.id, order)
    showNotif('Meals ordered', 'Your meal selections for tomorrow have been confirmed.', 'ok')
    setSelections({})
  }

  return (
    <>
      <Helmet>
        <title>Meal Orders | House of Refuge</title>
        <meta name="description" content="Order nutritious, medically appropriate meals for your stay at House of Refuge, powered by CookedIndoors." />
      </Helmet>
      <div className="ph"><div className="container">
        <div className="ph__badge"><span className="badge">Patient Portal</span></div>
        <h1>Meal Ordering</h1>
        <p>Nutritious, medically appropriate meals by CookedIndoors</p>
      </div></div>

      <section className="section">
        <div className="container">
          <div className={styles.mealInfo}>
            <span className={styles.mealBrand}>Powered by <a href="https://cookedindoors.com" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', fontWeight: 700 }}>CookedIndoors</a></span>
            <span className={styles.mealNote}>Select your meals for tomorrow. Orders close at 8 PM daily.</span>
          </div>

          {MEAL_SLOTS.map(slot => (
            <div key={slot.key} className={styles.mealSlot}>
              <div className={styles.mealSlotHeader}>
                <h3 style={{ fontSize: '1.3rem' }}>{slot.label}</h3>
                <span className={styles.mealTime}>{slot.time}</span>
              </div>
              <div className={styles.mealGrid}>
                {MENU[slot.key].map(item => (
                  <button
                    key={item.id}
                    className={`${styles.mealCard} ${selections[slot.key]?.id === item.id ? styles.mealSelected : ''}`}
                    onClick={() => select(slot.key, item)}
                  >
                    <div className={styles.mealName}>{item.name}</div>
                    <div className={styles.mealDesc}>{item.desc}</div>
                    <div className={styles.mealMeta}>
                      <span>{item.cal} cal</span>
                      <div className={styles.mealTags}>
                        {item.tags.map(t => <span key={t} className={styles.mealTag}>{t}</span>)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="card" style={{ marginTop: 24 }}>
            <div className="frow">
              <div className="fg"><label className="flabel">Dietary preferences / restrictions</label>
                <input className="fi" value={dietary} onChange={e => setDietary(e.target.value)} placeholder="e.g. No red meat, vegetarian preference" />
              </div>
              <div className="fg"><label className="flabel">Allergies</label>
                <input className="fi" value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. Nuts, shellfish, gluten" />
              </div>
            </div>
            <button className="btn btn--primary btn--full" onClick={handleOrder}>
              Confirm Meal Selections for Tomorrow
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
