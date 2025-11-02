import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './Modal.css'

function VignetteModal({ vignette, editing, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [availablePhotos, setAvailablePhotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (vignette) {
      setTitle(vignette.title || '')
      setContent(vignette.content || '')
    }
    fetchPhotos()
  }, [vignette])

  const fetchPhotos = async () => {
    try {
      const response = await axios.get('/api/photos')
      setAvailablePhotos(response.data)
    } catch (error) {
      console.error('Failed to fetch photos:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = {
        title,
        content,
        photo_ids: selectedPhotos,
      }

      if (vignette) {
        await axios.put(`/api/vignettes/${vignette.id}`, data)
      } else {
        await axios.post('/api/vignettes', data)
      }

      onSave()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save vignette')
    } finally {
      setLoading(false)
    }
  }

  const togglePhoto = (photoId) => {
    setSelectedPhotos((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    )
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editing ? (vignette ? 'Edit Vignette' : 'Create Vignette') : 'View Vignette'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your vignette here..."
              />
            </div>

            <div className="form-group">
              <label>Add Photos</label>
              <div className="photo-selection">
                {availablePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`photo-select-item ${selectedPhotos.includes(photo.id) ? 'selected' : ''}`}
                    onClick={() => togglePhoto(photo.id)}
                  >
                    <img
                      src={`http://localhost:8000/api/photos/${photo.id}`}
                      alt={photo.title || 'Photo'}
                    />
                    <input
                      type="checkbox"
                      checked={selectedPhotos.includes(photo.id)}
                      onChange={() => togglePhoto(photo.id)}
                      style={{ display: 'none' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="error">{error}</div>}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <h3>{vignette.title}</h3>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              {new Date(vignette.created_at).toLocaleDateString()}
            </p>
            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
              {vignette.content || 'No content'}
            </div>
            <button onClick={onClose} className="btn btn-primary">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default VignetteModal

