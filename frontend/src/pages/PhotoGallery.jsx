import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import AuthenticatedImage from '../components/AuthenticatedImage'
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

    await fetchPhotos()
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Photo Gallery</h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            marginTop: '-1rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>
            A visual journey through your family memories
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '2px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            <option value="grid">Grid View</option>
            <option value="chronological">Chronological</option>
          </select>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            + Upload Photos
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
        <div className="container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>
            No photos yet. Upload your first photo to start building your family gallery!
          </p>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
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
      ) : (
        <div className={viewMode === 'grid' ? 'photo-grid' : 'photo-chronological'}>
          {sortedPhotos.map((photo) => (
            <div
              key={photo.id}
              className="photo-item"
              onClick={() => setSelectedPhoto(photo)}
            >
              <AuthenticatedImage
                photoId={photo.id}
                alt={photo.title || 'Photo'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div className="modal" onClick={() => setSelectedPhoto(null)}>
          <div className="modal-content photo-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
            <div className="modal-header">
              <h2 style={{ color: 'var(--primary)' }}>{selectedPhoto.title || 'Photo'}</h2>
              <button className="close-btn" onClick={() => setSelectedPhoto(null)}>×</button>
            </div>
            <AuthenticatedImage
              photoId={selectedPhoto.id}
              alt={selectedPhoto.title || 'Photo'}
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '12px',
                boxShadow: '0 4px 20px var(--shadow)'
              }}
            />
            {selectedPhoto.description && (
              <p style={{
                marginTop: '1.5rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.7',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
              }}>{selectedPhoto.description}</p>
            )}
            <p style={{
              color: 'var(--text-muted)',
              marginTop: '1rem',
              fontSize: '0.9rem',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
            }}>
              Uploaded: {format(new Date(selectedPhoto.created_at), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhotoGallery

