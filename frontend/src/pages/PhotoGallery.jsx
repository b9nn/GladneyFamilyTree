import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import './PhotoGallery.css'

function PhotoGallery() {
  const [photos, setPhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [loading, setLoading] = useState(true)
  const [albums, setAlbums] = useState([])
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'chronological'

  useEffect(() => {
    fetchPhotos()
    fetchAlbums()
  }, [])

  const fetchPhotos = async () => {
    try {
      const response = await axios.get('/api/photos')
      setPhotos(response.data)
    } catch (error) {
      console.error('Failed to fetch photos:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAlbums = async () => {
    try {
      const response = await axios.get('/api/albums')
      setAlbums(response.data)
    } catch (error) {
      console.error('Failed to fetch albums:', error)
    }
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name)

      try {
        await axios.post('/api/photos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } catch (error) {
        console.error('Failed to upload photo:', error)
      }
    }

    fetchPhotos()
    setShowUpload(false)
  }

  const sortedPhotos = [...photos].sort((a, b) => {
    const dateA = new Date(a.created_at)
    const dateB = new Date(b.created_at)
    return dateB - dateA
  })

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Photo Gallery</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="form-group select"
          >
            <option value="grid">Grid View</option>
            <option value="chronological">Chronological</option>
          </select>
          <label className="btn btn-primary">
            Upload Photos
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="container">
          <p>No photos yet. Upload your first photo to get started!</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'photo-grid' : 'photo-chronological'}>
          {sortedPhotos.map((photo) => (
            <div
              key={photo.id}
              className="photo-item"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={`http://localhost:8000/api/photos/${photo.id}`}
                alt={photo.title || 'Photo'}
              />
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div className="modal" onClick={() => setSelectedPhoto(null)}>
          <div className="modal-content photo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPhoto.title || 'Photo'}</h2>
              <button className="close-btn" onClick={() => setSelectedPhoto(null)}>×</button>
            </div>
            <img
              src={`http://localhost:8000/api/photos/${selectedPhoto.id}`}
              alt={selectedPhoto.title || 'Photo'}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
            {selectedPhoto.description && (
              <p style={{ marginTop: '1rem' }}>{selectedPhoto.description}</p>
            )}
            <p style={{ color: '#666', marginTop: '0.5rem' }}>
              Uploaded: {format(new Date(selectedPhoto.created_at), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhotoGallery

