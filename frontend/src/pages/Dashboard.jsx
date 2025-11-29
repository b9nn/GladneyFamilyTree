import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { format } from 'date-fns'

function Dashboard() {
  const [stats, setStats] = useState({
    vignettes: 0,
    photos: 0,
    audio: 0,
    files: 0,
  })
  const [recentItems, setRecentItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [vignettesRes, photosRes, audioRes, filesRes] = await Promise.all([
        axios.get('/api/vignettes'),
        axios.get('/api/photos'),
        axios.get('/api/audio'),
        axios.get('/api/files'),
      ])

      setStats({
        vignettes: vignettesRes.data.length,
        photos: photosRes.data.length,
        audio: audioRes.data.length,
        files: filesRes.data.length,
      })

      // Combine all recent items with their type
      const allRecentItems = [
        ...vignettesRes.data.map(item => ({ ...item, type: 'vignette' })),
        ...audioRes.data.map(item => ({ ...item, type: 'audio' })),
        ...filesRes.data.map(item => ({ ...item, type: 'file' }))
      ]

      // Sort by created_at (newest to oldest) and take top 5
      const sortedRecent = allRecentItems
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)

      // Store the sorted items in unified state
      setRecentItems(sortedRecent)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }


  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div>
      <div style={{ marginBottom: '3rem' }}>
        <h1>Lorna and Tom's Reminiscences</h1>
        <p style={{
          fontSize: '1.2rem',
          color: 'var(--text-secondary)',
          marginTop: '-1rem',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
        }}>
          For family members who may be interested to know more about us!
        </p>
      </div>

      <div className="grid grid-4">
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1rem' }}>Vignettes</h3>
          <p style={{
            fontSize: '2rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.5rem'
          }}>
            {stats.vignettes}
          </p>
          <Link to="/vignettes" style={{
            fontSize: '0.9rem',
            fontWeight: '500',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>View all stories →</Link>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1rem' }}>Photos</h3>
          <p style={{
            fontSize: '2rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.5rem'
          }}>
            {stats.photos}
          </p>
          <Link to="/photos" style={{
            fontSize: '0.9rem',
            fontWeight: '500',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>View gallery →</Link>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1rem' }}>Audio</h3>
          <p style={{
            fontSize: '2rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.5rem'
          }}>
            {stats.audio}
          </p>
          <Link to="/audio" style={{
            fontSize: '0.9rem',
            fontWeight: '500',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>Listen →</Link>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1rem' }}>Files</h3>
          <p style={{
            fontSize: '2rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.5rem'
          }}>
            {stats.files}
          </p>
          <Link to="/files" style={{
            fontSize: '0.9rem',
            fontWeight: '500',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>Browse →</Link>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Recent Activity</h2>
        {recentItems.length === 0 ? (
          <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{
              fontSize: '1.1rem',
              color: 'var(--text-secondary)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
            }}>
              No activity yet. Start by <Link to="/vignettes" style={{ fontWeight: '600' }}>creating a vignette</Link>, <Link to="/audio" style={{ fontWeight: '600' }}>recording audio</Link>, or <Link to="/files" style={{ fontWeight: '600' }}>uploading files</Link>.
            </p>
          </div>
        ) : (
          <div className="grid grid-4" style={{ gap: '1rem', alignItems: 'stretch' }}>
            {recentItems.map((item) => {
              // Determine icon and link based on type
              const icon = item.type === 'vignette' ? '📖' : item.type === 'audio' ? '🎵' : '📄'
              const link = item.type === 'vignette' ? '/vignettes' : item.type === 'audio' ? '/audio' : '/files'
              const displayContent = item.type === 'vignette' ? (item.content || 'No content') : (item.description || '')

              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={link}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="card"
                    style={{ padding: '0.875rem', minHeight: '140px', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', height: '100%' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <div style={{ fontSize: '1.35rem', flexShrink: 0, lineHeight: 1 }}>{icon}</div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ marginBottom: '0.25rem', fontSize: '0.95rem', lineHeight: 1.2, wordBreak: 'break-word' }}>{item.title}</h4>
                        <p style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.7rem',
                          marginBottom: '0.4rem',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
                          lineHeight: 1
                        }}>
                          {format(new Date(item.created_at), 'MMM d, yyyy')}
                        </p>
                        {displayContent && (
                          <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.8rem',
                            lineHeight: '1.4',
                            wordBreak: 'break-word',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {displayContent}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

