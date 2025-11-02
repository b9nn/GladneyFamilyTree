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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Vignettes</h1>
        <button onClick={handleCreate} className="btn btn-primary">
          Create New Vignette
        </button>
      </div>

      {vignettes.length === 0 ? (
        <div className="container">
          <p>No vignettes yet. Create your first vignette to get started!</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {vignettes.map((vignette) => (
            <div key={vignette.id} className="card">
              <h3>{vignette.title}</h3>
              <p style={{ color: '#666', marginBottom: '1rem' }}>
                {format(new Date(vignette.created_at), 'MMMM d, yyyy')}
              </p>
              <p style={{ 
                marginBottom: '1rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
              }}>
                {vignette.content || 'No content'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleView(vignette)} className="btn btn-primary">
                  View
                </button>
                <button onClick={() => handleEdit(vignette)} className="btn btn-secondary">
                  Edit
                </button>
                <button onClick={() => handleDelete(vignette.id)} className="btn btn-danger">
                  Delete
                </button>
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

