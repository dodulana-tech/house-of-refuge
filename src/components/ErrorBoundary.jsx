import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '120px 24px 80px', textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--fd)', marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ marginBottom: 24, fontSize: '.92rem' }}>
            We're sorry. An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            className="btn btn--primary"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
          >
            Return Home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
