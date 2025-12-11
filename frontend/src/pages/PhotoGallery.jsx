import React, { useState, useEffect } from 'react'
import axios from '../config/api'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import AuthenticatedImage from '../components/AuthenticatedImage'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import './PhotoGallery.css'

function PhotoGallery() {
  const { user } = useAuth()
  const [photos, setPhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [loading, setLoading] = useState(true)
  const [albums, setAlbums] = useState([])
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'chronological'
  const [currentView, setCurrentView] = useState('photos') // 'photos' or 'albums'
  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const [albumPhotos, setAlbumPhotos] = useState([])
  const [showCreateAlbum, setShowCreateAlbum] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState('')
  const [newAlbumDescription, setNewAlbumDescription] = useState('')
  const [editingPhotoTitle, setEditingPhotoTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editingPhotoDate, setEditingPhotoDate] = useState(false)
  const [editedDate, setEditedDate] = useState('')

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

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return
    }

    try {
      await axios.delete(`/api/photos/${photoId}`)
      await fetchPhotos()
      setSelectedPhoto(null)
    } catch (error) {
      console.error('Failed to delete photo:', error)
      alert('Failed to delete photo. Please try again.')
    }
  }

  const handleUpdatePhotoTitle = async () => {
    if (!editedTitle.trim()) {
      alert('Title cannot be empty')
      return
    }

    try {
      await axios.put(`/api/photos/${selectedPhoto.id}`, {
        title: editedTitle
      })
      await fetchPhotos()
      setSelectedPhoto({ ...selectedPhoto, title: editedTitle })
      setEditingPhotoTitle(false)
    } catch (error) {
      console.error('Failed to update photo title:', error)
      alert('Failed to update photo title. Please try again.')
    }
  }

  const handleUpdatePhotoDate = async () => {
    if (!editedDate) {
      alert('Please select a date')
      return
    }

    try {
      // Convert date string to ISO format
      const dateObj = new Date(editedDate)
      const isoDate = dateObj.toISOString()

      await axios.put(`/api/photos/${selectedPhoto.id}`, {
        taken_at: isoDate
      })
      await fetchPhotos()
      setSelectedPhoto({ ...selectedPhoto, taken_at: isoDate })
      setEditingPhotoDate(false)
    } catch (error) {
      console.error('Failed to update photo date:', error)
      alert('Failed to update photo date. Please try again.')
    }
  }

  const handleCreateAlbum = async (e) => {
    e.preventDefault()
    if (!newAlbumName.trim()) {
      alert('Please enter an album name')
      return
    }

    try {
      await axios.post('/api/albums', {
        name: newAlbumName,
        description: newAlbumDescription
      })
      setNewAlbumName('')
      setNewAlbumDescription('')
      setShowCreateAlbum(false)
      await fetchAlbums()
    } catch (error) {
      console.error('Failed to create album:', error)
      alert('Failed to create album. Please try again.')
    }
  }

  const handleViewAlbum = async (albumId) => {
    try {
      const response = await axios.get(`/api/albums/${albumId}`)
      setSelectedAlbum(response.data)
      setAlbumPhotos(response.data.photos || [])
    } catch (error) {
      console.error('Failed to fetch album:', error)
      alert('Failed to load album.')
    }
  }

  const handleDeleteAlbum = async (albumId) => {
    if (!window.confirm('Are you sure you want to delete this album? This will not delete the photos.')) {
      return
    }

    try {
      await axios.delete(`/api/albums/${albumId}`)
      await fetchAlbums()
      if (selectedAlbum?.id === albumId) {
        setSelectedAlbum(null)
        setAlbumPhotos([])
      }
    } catch (error) {
      console.error('Failed to delete album:', error)
      alert('Failed to delete album. Please try again.')
    }
  }

  const handleAddPhotoToAlbum = async (photoId, albumId) => {
    try {
      await axios.post(`/api/albums/${albumId}/photos/${photoId}`)
      alert('Photo added to album!')
      // Refresh album if viewing
      if (selectedAlbum?.id === albumId) {
        await handleViewAlbum(albumId)
      }
      await fetchAlbums()
    } catch (error) {
      console.error('Failed to add photo to album:', error)
      const errorMessage = error.response?.data?.detail || 'Failed to add photo to album.'
      alert(errorMessage)
    }
  }

  const handleRemovePhotoFromAlbum = async (photoId, albumId) => {
    if (!window.confirm('Remove this photo from the album?')) {
      return
    }

    try {
      await axios.delete(`/api/albums/${albumId}/photos/${photoId}`)
      // Refresh album view
      await handleViewAlbum(albumId)
      await fetchAlbums()
    } catch (error) {
      console.error('Failed to remove photo from album:', error)
      alert('Failed to remove photo.')
    }
  }

  const handlePhotoDragEnd = async (result) => {
    if (!result.destination) return
    if (!user?.is_admin) return

    const items = Array.from(photos)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Optimistically update UI
    setPhotos(items)

    // Send new order to backend
    try {
      const photoOrders = items.map((photo, index) => ({
        id: photo.id,
        sort_order: index
      }))
      await axios.post('/api/photos/reorder', photoOrders)
    } catch (error) {
      console.error('Failed to reorder photos:', error)
      // Revert on error
      await fetchPhotos()
    }
  }

  const handleAlbumDragEnd = async (result) => {
    if (!result.destination) return
    if (!user?.is_admin) return

    const items = Array.from(albums)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Optimistically update UI
    setAlbums(items)

    // Send new order to backend
    try {
      const albumOrders = items.map((album, index) => ({
        id: album.id,
        sort_order: index
      }))
      await axios.post('/api/albums/reorder', albumOrders)
    } catch (error) {
      console.error('Failed to reorder albums:', error)
      // Revert on error
      await fetchAlbums()
    }
  }

  const handleUploadAlbumBackground = async (albumId, e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      await axios.post(`/api/albums/${albumId}/background`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      await fetchAlbums() // Refresh to show new background
    } catch (error) {
      console.error('Failed to upload album background:', error)
      alert('Failed to upload background image. Please try again.')
    }
  }

  const sortedPhotos = [...photos].sort((a, b) => {
    // Use taken_at if available, otherwise fall back to created_at (upload date)
    const dateA = new Date(a.taken_at || a.created_at)
    const dateB = new Date(b.taken_at || b.created_at)
    return dateB - dateA
  })

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Photo Gallery</h1>
          <p style={{
            fontSize: '1.1rem',
            color: '#6366f1',
            fontWeight: 'bold',
            marginTop: '-1rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>
            Visual reminders of our family memories
          </p>
        </div>
        {user?.is_admin && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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
        )}
      </div>

      {/* Albums Section */}
      {selectedAlbum ? (
        /* Viewing specific album */
        <div>
          <button
            onClick={() => setSelectedAlbum(null)}
            className="btn btn-secondary"
            style={{ marginBottom: '1.5rem' }}
          >
            ← Back to Albums
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h2>{selectedAlbum.name}</h2>
              {selectedAlbum.description && (
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif' }}>
                  {selectedAlbum.description}
                </p>
              )}
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif' }}>
                {albumPhotos.length} {albumPhotos.length === 1 ? 'photo' : 'photos'}
              </p>
            </div>
            {user?.is_admin && (
              <button
                onClick={() => handleDeleteAlbum(selectedAlbum.id)}
                className="btn"
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px'
                }}
              >
                Delete Album
              </button>
            )}
          </div>
          {albumPhotos.length === 0 ? (
            <div className="container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif' }}>
                No photos in this album yet.
              </p>
            </div>
          ) : (
            <div className="photo-chronological-grid">
              {[...albumPhotos].sort((a, b) => {
                const dateA = new Date(a.taken_at || a.created_at)
                const dateB = new Date(b.taken_at || b.created_at)
                return dateB - dateA
              }).map((photo) => (
                <div key={photo.id} className="photo-item" style={{ position: 'relative' }}>
                  <AuthenticatedImage
                    photoId={photo.id}
                    alt={photo.title || 'Photo'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onClick={() => setSelectedPhoto(photo)}
                  />
                  {user?.is_admin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemovePhotoFromAlbum(photo.id, selectedAlbum.id)
                      }}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: 'rgba(220, 53, 69, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Albums Section - Always show */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Albums ({albums.length})</h2>
              {user?.is_admin && (
                <button className="btn btn-primary" onClick={() => setShowCreateAlbum(true)}>
                  + Create Album
                </button>
              )}
            </div>
            {albums.length === 0 ? (
              <div className="container" style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'var(--surface)', borderRadius: '12px' }}>
                <p style={{
                  fontSize: '1.1rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '1rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                }}>
                  {user?.is_admin ? 'No albums yet. Create your first album to organize your photos!' : 'No albums available yet.'}
                </p>
                {user?.is_admin && (
                  <button className="btn btn-primary" onClick={() => setShowCreateAlbum(true)}>
                    Create Album
                  </button>
                )}
              </div>
            ) : (
              <DragDropContext onDragEnd={handleAlbumDragEnd}>
                <Droppable droppableId="albums" direction="horizontal">
                  {(provided) => (
                    <div
                      className="grid grid-3"
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {albums.map((album, index) => (
                        <Draggable
                          key={album.id}
                          draggableId={`album-${album.id}`}
                          index={index}
                          isDragDisabled={!user?.is_admin}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="card"
                              style={{
                                ...provided.draggableProps.style,
                                cursor: user?.is_admin ? 'grab' : 'pointer',
                                backgroundColor: album.background_image ? 'transparent' : '#bbdefb',
                                backgroundImage: album.background_image ? `url(${album.background_image})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                padding: '1rem 1.5rem',
                                minHeight: 'auto',
                                opacity: snapshot.isDragging ? 0.8 : 1,
                                position: 'relative'
                              }}
                              onClick={() => !snapshot.isDragging && handleViewAlbum(album.id)}
                            >
                              {album.background_image && (
                                <div style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                                  borderRadius: '12px',
                                  zIndex: 0
                                }}></div>
                              )}
                              <div style={{ position: 'relative', zIndex: 1 }}>
                                {user?.is_admin && (
                                  <label
                                    style={{
                                      position: 'absolute',
                                      top: '-0.5rem',
                                      right: '-0.5rem',
                                      backgroundColor: 'var(--primary)',
                                      color: 'white',
                                      borderRadius: '50%',
                                      width: '2rem',
                                      height: '2rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      fontSize: '0.9rem',
                                      zIndex: 10
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    🖼️
                                    <input
                                      type="file"
                                      accept="image/*"
                                      style={{ display: 'none' }}
                                      onChange={(e) => handleUploadAlbumBackground(album.id, e)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </label>
                                )}
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>📁</div>
                                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>{album.name}</h3>
                                {album.description && (
                                  <p style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.85rem',
                                    marginBottom: '0.5rem',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                                  }}>
                                    {album.description}
                                  </p>
                                )}
                                <p style={{
                                  color: 'var(--text-muted)',
                                  fontSize: '0.8rem',
                                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
                                  marginBottom: '0'
                                }}>
                                  {album.photo_count || 0} {album.photo_count === 1 ? 'photo' : 'photos'}
                                </p>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>

          {/* Chronological Photos Section - Show first */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', maxWidth: '1200px', margin: '0 auto 2rem auto' }}>
              <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Photos by Date ({photos.length})</h2>
            </div>
            {photos.length === 0 ? (
              <div className="container" style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'var(--surface)', borderRadius: '12px' }}>
                <p style={{
                  fontSize: '1.1rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '1rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                }}>
                  {user?.is_admin ? 'No photos yet. Upload your first photo to start building your family gallery!' : 'No photos available yet.'}
                </p>
                {user?.is_admin && (
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
                )}
              </div>
            ) : (
              <div className="photo-chronological-grid">
                {sortedPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="photo-item"
                    style={{ position: 'relative', cursor: 'pointer' }}
                  >
                    {user?.is_admin && (
                      <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        left: '0.5rem',
                        right: '0.5rem',
                        display: 'flex',
                        gap: '0.5rem',
                        zIndex: 10
                      }}>
                        <select
                          onChange={(e) => {
                            e.stopPropagation()
                            const albumId = e.target.value
                            if (albumId) {
                              handleAddPhotoToAlbum(photo.id, parseInt(albumId))
                              e.target.value = ''
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            flex: 1,
                            padding: '0.4rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #ccc',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">+ Add to Album</option>
                          {albums.map(album => (
                            <option key={album.id} value={album.id}>
                              {album.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePhoto(photo.id)
                          }}
                          style={{
                            backgroundColor: 'rgba(220, 53, 69, 0.95)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '0.25rem 0.4rem',
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                        >
                          Del
                        </button>
                      </div>
                    )}
                    <AuthenticatedImage
                      photoId={photo.id}
                      alt={photo.title || 'Photo'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => setSelectedPhoto(photo)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grid View Section - Show second, only for admins */}
          {user?.is_admin && photos.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Arrange Photos (Admin)</h2>
              </div>
              <DragDropContext onDragEnd={handlePhotoDragEnd}>
                <Droppable droppableId="photos" direction="horizontal">
                  {(provided) => (
                    <div
                      className="photo-grid-small"
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {photos.map((photo, index) => (
                        <Draggable
                          key={photo.id}
                          draggableId={`photo-${photo.id}`}
                          index={index}
                          isDragDisabled={!user?.is_admin}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="photo-item"
                              style={{
                                ...provided.draggableProps.style,
                                position: 'relative',
                                opacity: snapshot.isDragging ? 0.8 : 1
                              }}
                            >
                              {user?.is_admin && (
                                <div style={{
                                  position: 'absolute',
                                  top: '0.5rem',
                                  left: '0.5rem',
                                  right: '0.5rem',
                                  display: 'flex',
                                  gap: '0.5rem',
                                  zIndex: 10
                                }}>
                                  <select
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      const albumId = e.target.value
                                      if (albumId) {
                                        handleAddPhotoToAlbum(photo.id, parseInt(albumId))
                                        e.target.value = ''
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      flex: 1,
                                      padding: '0.4rem',
                                      fontSize: '0.75rem',
                                      borderRadius: '4px',
                                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                      border: '1px solid #ccc',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="">+ Add to Album</option>
                                    {albums.map(album => (
                                      <option key={album.id} value={album.id}>
                                        {album.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeletePhoto(photo.id)
                                    }}
                                    style={{
                                      backgroundColor: 'rgba(220, 53, 69, 0.95)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '3px',
                                      padding: '0.25rem 0.4rem',
                                      fontSize: '0.65rem',
                                      cursor: 'pointer',
                                      fontWeight: '500'
                                    }}
                                  >
                                    Del
                                  </button>
                                </div>
                              )}
                              <AuthenticatedImage
                                photoId={photo.id}
                                alt={photo.title || 'Photo'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() => !snapshot.isDragging && setSelectedPhoto(photo)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </>
      )}

      {selectedPhoto && (
        <div className="modal" onClick={() => setSelectedPhoto(null)}>
          <div className="modal-content photo-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
            <div className="modal-header">
              {editingPhotoTitle ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      fontSize: '1.5rem',
                      border: '2px solid var(--primary)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--surface)'
                    }}
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdatePhotoTitle()
                      }
                    }}
                  />
                  <button
                    onClick={handleUpdatePhotoTitle}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingPhotoTitle(false)
                      setEditedTitle('')
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                  <h2 style={{ color: 'var(--primary)', margin: 0 }}>{selectedPhoto.title || 'Photo'}</h2>
                  {user?.is_admin && (
                    <button
                      onClick={() => {
                        setEditingPhotoTitle(true)
                        setEditedTitle(selectedPhoto.title || '')
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
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
            <div style={{
              color: 'var(--text-muted)',
              marginTop: '1rem',
              fontSize: '0.9rem',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
            }}>
              {editingPhotoDate ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span>Photo taken:</span>
                  <input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    style={{
                      padding: '0.4rem',
                      fontSize: '0.9rem',
                      border: '2px solid var(--primary)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--surface)'
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleUpdatePhotoDate}
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingPhotoDate(false)
                      setEditedDate('')
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ margin: 0 }}>
                    Photo taken: {selectedPhoto.taken_at ? format(new Date(selectedPhoto.taken_at), 'MMMM d, yyyy') : 'Not set'}
                  </p>
                  {user?.is_admin && (
                    <button
                      onClick={() => {
                        setEditingPhotoDate(true)
                        const dateStr = selectedPhoto.taken_at
                          ? new Date(selectedPhoto.taken_at).toISOString().split('T')[0]
                          : new Date().toISOString().split('T')[0]
                        setEditedDate(dateStr)
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
              <p style={{ margin: '0.25rem 0' }}>
                Uploaded: {format(new Date(selectedPhoto.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                {albums.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      value=""
                      onChange={(e) => {
                        const albumId = e.target.value
                        if (albumId) {
                          handleAddPhotoToAlbum(selectedPhoto.id, parseInt(albumId))
                        }
                      }}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '2px solid var(--border)',
                        backgroundColor: 'var(--surface)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="" disabled>Add to album...</option>
                      {albums.map((album) => (
                        <option key={album.id} value={album.id}>{album.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {user?.is_admin && (
                <button
                  className="btn"
                  onClick={() => handleDeletePhoto(selectedPhoto.id)}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  Delete Photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Album Modal */}
      {showCreateAlbum && (
        <div className="modal" onClick={() => setShowCreateAlbum(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Create New Album</h2>
              <button className="close-btn" onClick={() => setShowCreateAlbum(false)}>×</button>
            </div>
            <form onSubmit={handleCreateAlbum}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}>
                  Album Name *
                </label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="Enter album name"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '2px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}>
                  Description
                </label>
                <textarea
                  value={newAlbumDescription}
                  onChange={(e) => setNewAlbumDescription(e.target.value)}
                  placeholder="Enter album description (optional)"
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '2px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateAlbum(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Album
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhotoGallery

