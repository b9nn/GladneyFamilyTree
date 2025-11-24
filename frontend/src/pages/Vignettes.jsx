import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import VignetteModal from '../components/VignetteModal'

function Vignettes() {
  const [vignettes, setVignettes] = useState([])
  const [selectedVignette, setSelectedVignette] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVignettes()
  }, [])

  const fetchVignettes = async () => {
    try {
      const response = await axios.get('/api/vignettes')
      setVignettes(response.data)
    } catch (error) {
      console.error('Failed to fetch vignettes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedVignette(null)
    setEditing(true)
    setShowModal(true)
  }

  const handleEdit = (vignette) => {
    setSelectedVignette(vignette)
    setEditing(true)
    setShowModal(true)
  }

  const handleView = (vignette) => {
    setSelectedVignette(vignette)
    setEditing(false)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vignette?')) {
      return
    }

    try {
      await axios.delete(`/api/vignettes/${id}`)
      fetchVignettes()
    } catch (error) {
      console.error('Failed to delete vignette:', error)
      alert('Failed to delete vignette')
    }
  }

  const handleSave = () => {
    setShowModal(false)
    setSelectedVignette(null)
    setEditing(false)
    fetchVignettes()
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Life Stories & Vignettes</h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            marginTop: '-1rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>
            Capture and preserve your memories
          </p>
        </div>
        <button onClick={handleCreate} className="btn btn-primary">
          + Create New Vignette
        </button>
      </div>

      {vignettes.length === 0 ? (
        <div className="container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>
            No vignettes yet. Create your first story to begin preserving your family memories!
          </p>
          <button onClick={handleCreate} className="btn btn-primary">
            Get Started
          </button>
        </div>
      ) : (
        <div className="grid grid-2">
          {vignettes.map((vignette) => (
            <div key={vignette.id} className="card">
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1.5rem' }}>{vignette.title}</h3>
              <p style={{
                color: 'var(--text-muted)',
                marginBottom: '1.25rem',
                fontSize: '0.9rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
              }}>
                {format(new Date(vignette.created_at), 'MMMM d, yyyy')}
              </p>
              <p style={{
                marginBottom: '1.5rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                color: 'var(--text-secondary)',
                lineHeight: '1.7'
              }}>
                {vignette.content || 'No content'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  onClick={() => handleView(vignette)} 
                  className="btn btn-primary" 
                  style={{ 
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    flex: 'none'
                  }}
                >
                  View
                </button>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    onClick={() => handleEdit(vignette)} 
                    className="btn btn-secondary" 
                    style={{ 
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.7rem',
                      flex: 'none',
                      minWidth: 'auto'
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(vignette.id)} 
                    className="btn btn-danger"
                    style={{ 
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.7rem',
                      flex: 'none',
                      minWidth: 'auto'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <VignetteModal
          vignette={selectedVignette}
          editing={editing}
          onClose={() => {
            setShowModal(false)
            setSelectedVignette(null)
            setEditing(false)
          }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default Vignettes

