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
  const [recentVignettes, setRecentVignettes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [vignettesRes, photosRes, audioRes, filesRes] = await Promise.all([
        axios.get('/api/vignettes'),
        axios.get('/api/photos?limit=1'),
        axios.get('/api/audio'),
        axios.get('/api/files'),
      ])

      setStats({
        vignettes: vignettesRes.data.length,
        photos: photosRes.data.length || 0,
        audio: audioRes.data.length,
        files: filesRes.data.length,
      })

      setRecentVignettes(vignettesRes.data.slice(0, 5))
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
      <h1>Dashboard</h1>
      <div className="grid grid-4">
        <div className="card">
          <h3>Vignettes</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0066cc' }}>
            {stats.vignettes}
          </p>
          <Link to="/vignettes">View all →</Link>
        </div>
        <div className="card">
          <h3>Photos</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0066cc' }}>
            {stats.photos}
          </p>
          <Link to="/photos">View gallery →</Link>
        </div>
        <div className="card">
          <h3>Audio Recordings</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0066cc' }}>
            {stats.audio}
          </p>
          <Link to="/audio">View all →</Link>
        </div>
        <div className="card">
          <h3>Files</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0066cc' }}>
            {stats.files}
          </p>
          <Link to="/files">View all →</Link>
        </div>
      </div>

      <div className="container">
        <h2>Recent Vignettes</h2>
        {recentVignettes.length === 0 ? (
          <p>No vignettes yet. <Link to="/vignettes">Create your first vignette</Link></p>
        ) : (
          <div className="grid grid-2">
            {recentVignettes.map((vignette) => (
              <div key={vignette.id} className="card">
                <h3>{vignette.title}</h3>
                <p style={{ color: '#666', marginBottom: '0.5rem' }}>
                  {format(new Date(vignette.created_at), 'MMMM d, yyyy')}
                </p>
                <p style={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {vignette.content || 'No content'}
                </p>
                <Link to={`/vignettes/${vignette.id}`}>Read more →</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

