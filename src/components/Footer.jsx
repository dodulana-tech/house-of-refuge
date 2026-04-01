import React from 'react'
import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.brand}>
            <div className={styles.logoText}>HOUSE OF REFUGE</div>
            <div className={styles.logoTag}>...setting the captives free</div>
            <p>A 24-bed drug rehabilitation centre in Lekki, Lagos. A Freedom Foundation initiative managed by ConsultForAfrica.</p>
            <div className={styles.orgs}>
              <span>Freedom Foundation Nigeria</span>
              <span className={styles.dot}>·</span>
              <a href="https://consultforafrica.com" target="_blank" rel="noreferrer">ConsultForAfrica</a>
            </div>
          </div>
          <div>
            <div className={styles.colTitle}>Navigate</div>
            <ul className={styles.links}>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/donate">Donate</Link></li>
              <li><Link to="/sponsor">Sponsor Equipment</Link></li>
              <li><Link to="/apply">Apply for Admission</Link></li>
            </ul>
          </div>
          <div>
            <div className={styles.colTitle}>Contact</div>
            <ul className={styles.links}>
              <li><a href="tel:09011277600">09011277600</a></li>
              <li><a href="mailto:e.abutu@freedomfoundationng.org" style={{fontSize:'.78rem'}}>e.abutu@freedomfoundationng.org</a></li>
              <li><span style={{opacity:.5}}>Lekki, Lagos, Nigeria</span></li>
              <li><span style={{opacity:.5}}>Mon–Sat, 8am–6pm</span></li>
            </ul>
          </div>
          <div>
            <div className={styles.colTitle}>Partners</div>
            <ul className={styles.links}>
              <li><a href="https://consultforafrica.com" target="_blank" rel="noreferrer">ConsultForAfrica</a></li>
              <li><a href="https://cookedindoors.com" target="_blank" rel="noreferrer">CookedIndoors</a></li>
              <li><span style={{opacity:.5}}>Freedom Foundation NG</span></li>
            </ul>
          </div>
        </div>
        <div className={styles.btm}>
          <span>© 2026 House of Refuge Rehabilitation Centre · A Freedom Foundation Initiative</span>
          <span>Lekki, Lagos, Nigeria</span>
        </div>
      </div>
    </footer>
  )
}
