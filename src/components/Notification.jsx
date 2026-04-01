import React from 'react'
import styles from './Notification.module.css'

export default function Notification({ notif }) {
  return (
    <div role="alert" aria-live="polite" className={`${styles.notif} ${notif.show ? styles.show : ''} ${notif.type === 'ok' ? styles.ok : ''}`}>
      <div className={styles.title}>{notif.title}</div>
      <div className={styles.msg}>{notif.msg}</div>
    </div>
  )
}
