import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const nav = useNavigate()
  return (
    <>
      <Helmet><title>Page Not Found | House of Refuge</title></Helmet>
      <div className="ph"><div className="container">
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
      </div></div>
      <section className="section">
        <div className="container" style={{ textAlign: 'center', maxWidth: 500 }}>
          <p style={{ fontSize: '1rem', marginBottom: 24 }}>You may have followed an outdated link or typed the address incorrectly.</p>
          <button className="btn btn--primary" onClick={() => nav('/')}>Go Home</button>
        </div>
      </section>
    </>
  )
}
