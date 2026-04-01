import React, { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      // Show after 30 seconds of browsing
      setTimeout(() => setShow(true), 30000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!show || !prompt) return null

  async function install() {
    prompt.prompt()
    const result = await prompt.userChoice
    if (result.outcome === 'accepted') setShow(false)
    setPrompt(null)
  }

  return (
    <div className="pwa-install">
      <div style={{ flex: 1 }}>
        <div className="pwa-install__text">Install House of Refuge</div>
        <div className="pwa-install__sub">Get quick access from your home screen</div>
      </div>
      <button className="btn btn--primary btn--sm" onClick={install} style={{ whiteSpace: 'nowrap' }}>Install</button>
      <button className="pwa-install__close" onClick={() => setShow(false)} aria-label="Dismiss">&times;</button>
    </div>
  )
}
