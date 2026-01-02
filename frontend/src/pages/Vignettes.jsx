import React, { useState, useEffect } from 'react'
import axios from '../config/api'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import VignetteModal from '../components/VignetteModal'

function Vignettes() {
  const { user } = useAuth()
  const [vignettes, setVignettes] = useState([])
  const [files, setFiles] = useState([])
  const [selectedVignette, setSelectedVignette] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewingFile, setViewingFile] = useState(null)
  const [editingFileId, setEditingFileId] = useState(null)
  const [editFileTitle, setEditFileTitle] = useState('')
  const [editFileDescription, setEditFileDescription] = useState('')
  const [editFileDate, setEditFileDate] = useState('')
  const [editingVignetteDate, setEditingVignetteDate] = useState(null)
  const [editVignetteDate, setEditVignetteDate] = useState('')
  const [sortBy, setSortBy] = useState('date-desc') // date-desc, date-asc, title-asc, title-desc, type

  useEffect(() => {
    fetchVignettes()
    fetchFiles()
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

  const fetchFiles = async () => {
    try {
      const response = await axios.get('/api/files')
      setFiles(response.data)
    } catch (error) {
      console.error('Failed to fetch files:', error)
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

  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target.files)
    setUploading(true)

    for (const file of uploadedFiles) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name)
      formData.append('source', 'vignettes')

      try {
        await axios.post('/api/files', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } catch (error) {
        console.error('Failed to upload file:', error)
        alert(`Failed to upload ${file.name}. Please try again.`)
      }
    }

    setUploading(false)
    fetchFiles() // Refresh the files list
  }

  const handleDownload = async (file) => {
    try {
      const response = await axios.get(`/api/files/${file.id}`, {
        responseType: 'blob',
      })

      let downloadFilename = file.title || file.filename || 'download'
      if (file.filename && file.filename.includes('-') && file.filename.length > 30) {
        if (file.file_type) {
          const extension = file.file_type.split('/')[1] || ''
          if (extension && !downloadFilename.includes('.')) {
            downloadFilename = `${downloadFilename}.${extension}`
          }
        }
      }

      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = downloadFilename
      document.body.appendChild(link)
      link.click()

      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error('Failed to download file:', error)
      alert(`Failed to download file: ${error.response?.data?.detail || error.message || 'Unknown error'}`)
    }
  }

  const handleViewFile = async (file) => {
    try {
      const response = await axios.get(`/api/files/${file.id}`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: file.file_type || 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)

      setViewingFile({
        ...file,
        url: url
      })
    } catch (error) {
      console.error('Failed to load file:', error)
      alert(`Failed to open file: ${error.response?.data?.detail || error.message || 'Unknown error'}`)
    }
  }

  const handleEditFile = (file) => {
    setEditingFileId(file.id)
    setEditFileTitle(file.title || '')
    setEditFileDescription(file.description || '')
    // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
    const date = new Date(file.created_at)
    const formattedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setEditFileDate(formattedDate)
  }

  const handleSaveFileEdit = async () => {
    try {
      // Use PATCH to update the file with date
      const payload = {
        title: editFileTitle,
        description: editFileDescription,
        created_at: new Date(editFileDate).toISOString()
      }

      await axios.patch(`/api/files/${editingFileId}`, payload)

      setEditingFileId(null)
      setEditFileTitle('')
      setEditFileDescription('')
      setEditFileDate('')
      fetchFiles()
    } catch (error) {
      console.error('Failed to update file:', error)
      alert('Failed to update file. Please try again.')
    }
  }

  const handleCancelFileEdit = () => {
    setEditingFileId(null)
    setEditFileTitle('')
    setEditFileDescription('')
    setEditFileDate('')
  }

  const handleDeleteFile = async (id) => {
    if (!window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return
    }

    try {
      await axios.delete(`/api/files/${id}`)
      fetchFiles()
    } catch (error) {
      console.error('Failed to delete file:', error)
      alert('Failed to delete file. Please try again.')
    }
  }

  const handleEditVignetteDate = (vignette) => {
    setEditingVignetteDate(vignette.id)
    // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
    const date = new Date(vignette.created_at)
    const formattedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setEditVignetteDate(formattedDate)
  }

  const handleSaveVignetteDate = async (vignetteId) => {
    try {
      const payload = {
        created_at: new Date(editVignetteDate).toISOString()
      }

      await axios.patch(`/api/vignettes/${vignetteId}`, payload)

      setEditingVignetteDate(null)
      setEditVignetteDate('')
      fetchVignettes()
    } catch (error) {
      console.error('Failed to update vignette date:', error)
      alert('Failed to update date. Please try again.')
    }
  }

  const handleCancelVignetteDateEdit = () => {
    setEditingVignetteDate(null)
    setEditVignetteDate('')
  }

  const closeViewer = () => {
    if (viewingFile?.url) {
      window.URL.revokeObjectURL(viewingFile.url)
    }
    setViewingFile(null)
  }

  const canViewInline = (fileType) => {
    if (!fileType) return false
    return fileType.includes('image') || fileType.includes('pdf') || fileType.includes('text') || fileType.includes('video') || fileType.includes('audio')
  }

  const getFileIcon = (fileType) => {
    if (!fileType) return '📄'
    if (fileType.includes('pdf')) return '📕'
    if (fileType.includes('word') || fileType.includes('document')) return '📘'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📗'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('video')) return '🎥'
    if (fileType.includes('audio')) return '🎵'
    return '📄'
  }

  // Combine vignettes and files into a single array with type indicator
  const getCombinedItems = () => {
    const vignetteItems = vignettes.map(v => ({
      ...v,
      itemType: 'vignette',
      displayTitle: v.title,
      displayDate: v.created_at,
      sortKey: v.title?.toLowerCase() || ''
    }))

    const fileItems = files.map(f => ({
      ...f,
      itemType: 'file',
      displayTitle: f.title || f.filename,
      displayDate: f.created_at,
      sortKey: (f.title || f.filename)?.toLowerCase() || ''
    }))

    return [...vignetteItems, ...fileItems]
  }

  // Sort combined items based on selected sort option
  const getSortedItems = () => {
    const combined = getCombinedItems()

    switch (sortBy) {
      case 'date-desc':
        return combined.sort((a, b) => new Date(b.displayDate) - new Date(a.displayDate))
      case 'date-asc':
        return combined.sort((a, b) => new Date(a.displayDate) - new Date(b.displayDate))
      case 'title-asc':
        return combined.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      case 'title-desc':
        return combined.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
      case 'type':
        return combined.sort((a, b) => {
          // First sort by type (vignettes first, then files)
          if (a.itemType !== b.itemType) {
            return a.itemType === 'vignette' ? -1 : 1
          }
          // Then by date (newest first)
          return new Date(b.displayDate) - new Date(a.displayDate)
        })
      default:
        return combined
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  const sortedItems = getSortedItems()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Vignettes</h1>
          <p style={{
            fontSize: '1.1rem',
            color: '#6366f1',
            fontWeight: 'bold',
            marginTop: '-1rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>
            Random reminiscences of our lives and times
          </p>
        </div>
        {user?.is_admin && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={handleCreate} className="btn btn-primary">
              + Create New Vignette
            </button>
            <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
              {uploading ? 'Uploading...' : '📤 Upload Files'}
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={uploading}
              />
            </label>
          </div>
        )}
      </div>

      {/* Sort Controls */}
      {user?.is_admin && sortedItems.length > 0 && (
        <div style={{
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <label style={{
            fontWeight: '500',
            fontSize: '0.95rem',
            color: 'var(--text-primary)'
          }}>
            Sort by:
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '0.95rem',
              backgroundColor: 'var(--bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
            }}
          >
            <option value="date-desc">Date (Newest First)</option>
            <option value="date-asc">Date (Oldest First)</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="type">Type (Vignettes, then Files)</option>
          </select>
          <span style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>
            {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      )}

      {/* Combined Items Display */}
      {sortedItems.length === 0 ? (
        <div className="container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>
            {user?.is_admin
              ? 'No content yet. Create your first vignette or upload a file to begin!'
              : 'No content available yet.'}
          </p>
          {user?.is_admin && (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleCreate} className="btn btn-primary">
                Create Vignette
              </button>
              <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
                Upload Files
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-3">
          {sortedItems.map((item) => (
            <div key={`${item.itemType}-${item.id}`} className="card" style={{ textAlign: item.itemType === 'file' ? 'center' : 'left' }}>
              {/* Badge to show type - only for vignettes */}
              {user?.is_admin && item.itemType === 'vignette' && (
                <div style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2'
                }}>
                  📖 Vignette
                </div>
              )}

              {item.itemType === 'vignette' ? (
                // Vignette Display
                <>
                  <h3 style={{ marginBottom: '0.75rem', fontSize: '1.5rem' }}>{item.title}</h3>
                  {editingVignetteDate === item.id ? (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <input
                        type="datetime-local"
                        value={editVignetteDate}
                        onChange={(e) => setEditVignetteDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          fontSize: '0.9rem',
                          marginBottom: '0.5rem'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleSaveVignetteDate(item.id)}
                          className="btn btn-primary"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelVignetteDateEdit}
                          className="btn"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={{
                      color: 'var(--text-muted)',
                      marginBottom: '1.25rem',
                      fontSize: '0.9rem',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {format(new Date(item.created_at), 'MMMM d, yyyy')}
                      {user?.is_admin && (
                        <button
                          onClick={() => handleEditVignetteDate(item)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.125rem 0.25rem',
                            fontSize: '0.75rem',
                            color: 'var(--primary)',
                            opacity: 0.7
                          }}
                          title="Edit date"
                        >
                          ✏️
                        </button>
                      )}
                    </p>
                  )}
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
                    {item.content || 'No content'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleView(item)}
                      className="btn btn-primary"
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        flex: 'none'
                      }}
                    >
                      View
                    </button>
                    {user?.is_admin && (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => handleEdit(item)}
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
                          onClick={() => handleDelete(item.id)}
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
                    )}
                  </div>
                </>
              ) : editingFileId === item.id ? (
                // File Edit Mode
                <div style={{ textAlign: 'left' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={editFileTitle}
                      onChange={(e) => setEditFileTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Description
                    </label>
                    <textarea
                      value={editFileDescription}
                      onChange={(e) => setEditFileDescription(e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        fontSize: '1rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Created Date
                    </label>
                    <input
                      type="datetime-local"
                      value={editFileDate}
                      onChange={(e) => setEditFileDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={handleSaveFileEdit}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelFileEdit}
                      className="btn"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // File View Mode
                <>
                  <h3 style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>{item.title || item.filename}</h3>
                  <p style={{
                    color: 'var(--text-muted)',
                    marginBottom: '0.75rem',
                    fontSize: '0.9rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                  }}>
                    {format(new Date(item.created_at), 'MMMM d, yyyy')}
                  </p>
                  {item.description && (
                    <p style={{
                      marginBottom: '1rem',
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                    }}>
                      {item.description}
                    </p>
                  )}
                  <p style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    marginBottom: '1.25rem',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                  }}>
                    {item.file_type || 'Unknown type'}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%', flexWrap: 'wrap' }}>
                    {canViewInline(item.file_type) && (
                      <button
                        onClick={() => handleViewFile(item)}
                        className="btn btn-primary"
                        style={{
                          flex: '1 1 auto',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.85rem'
                        }}
                      >
                        View
                      </button>
                    )}
                    {user?.is_admin && (
                      <button
                        onClick={() => handleDownload(item)}
                        className="btn btn-primary"
                        style={{
                          flex: '1 1 auto',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.85rem'
                        }}
                      >
                        Download
                      </button>
                    )}
                    {user?.is_admin && (
                      <>
                        <button
                          onClick={() => handleEditFile(item)}
                          className="btn"
                          style={{
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            flex: '1 1 auto'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteFile(item.id)}
                          className="btn"
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            flex: '1 1 auto'
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Remove old separate files section - now combined above */}
      {files.length > 0 && false && (
        <div style={{ marginTop: '4rem' }}>
          <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Uploaded Files</h2>
          <div className="grid grid-3">
            {files.map((file) => (
              <div key={file.id} className="card" style={{ textAlign: 'center' }}>
                {editingFileId === file.id ? (
                  // Edit mode
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem', textAlign: 'center' }}>
                      {getFileIcon(file.file_type)}
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Title
                      </label>
                      <input
                        type="text"
                        value={editFileTitle}
                        onChange={(e) => setEditFileTitle(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Description
                      </label>
                      <textarea
                        value={editFileDescription}
                        onChange={(e) => setEditFileDescription(e.target.value)}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          fontSize: '1rem',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={handleSaveFileEdit}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelFileEdit}
                        className="btn"
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                      {getFileIcon(file.file_type)}
                    </div>
                    <h3 style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>{file.title || file.filename}</h3>
                    <p style={{
                      color: 'var(--text-muted)',
                      marginBottom: '0.75rem',
                      fontSize: '0.9rem',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                    }}>
                      {format(new Date(file.created_at), 'MMMM d, yyyy')}
                    </p>
                    {file.description && (
                      <p style={{
                        marginBottom: '1rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                      }}>
                        {file.description}
                      </p>
                    )}
                    <p style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      marginBottom: '1.25rem',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                    }}>
                      {file.file_type || 'Unknown type'}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', flexWrap: 'wrap' }}>
                      {canViewInline(file.file_type) && (
                        <button
                          onClick={() => handleViewFile(file)}
                          className="btn btn-primary"
                          style={{
                            flex: '1 1 auto',
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.85rem'
                          }}
                        >
                          View
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(file)}
                        className="btn btn-primary"
                        style={{
                          flex: '1 1 auto',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.85rem'
                        }}
                      >
                        Download
                      </button>
                      {user?.is_admin && (
                        <>
                          <button
                            onClick={() => handleEditFile(file)}
                            className="btn"
                            style={{
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              flex: '1 1 auto'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="btn"
                            style={{
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              flex: '1 1 auto'
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewingFile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem'
          }}
          onClick={closeViewer}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            color: 'white'
          }}>
            <h2 style={{ margin: 0 }}>{viewingFile.title || viewingFile.filename}</h2>
            <button
              onClick={closeViewer}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '2rem',
                cursor: 'pointer',
                padding: '0.5rem'
              }}
            >
              ×
            </button>
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {viewingFile.file_type?.includes('image') ? (
              <img
                src={viewingFile.url}
                alt={viewingFile.title || viewingFile.filename}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
              />
            ) : viewingFile.file_type?.includes('video') ? (
              <video
                controls
                autoPlay
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
              >
                <source src={viewingFile.url} type={viewingFile.file_type} />
                Your browser does not support the video tag.
              </video>
            ) : viewingFile.file_type?.includes('audio') ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2rem',
                color: 'white'
              }}>
                <div style={{ fontSize: '6rem' }}>🎵</div>
                <audio
                  controls
                  autoPlay
                  style={{
                    width: '100%',
                    maxWidth: '500px'
                  }}
                >
                  <source src={viewingFile.url} type={viewingFile.file_type} />
                  Your browser does not support the audio tag.
                </audio>
              </div>
            ) : viewingFile.file_type?.includes('pdf') ? (
              <iframe
                src={viewingFile.url}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title={viewingFile.title || viewingFile.filename}
              />
            ) : viewingFile.file_type?.includes('text') ? (
              <iframe
                src={viewingFile.url}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: 'white'
                }}
                title={viewingFile.title || viewingFile.filename}
              />
            ) : (
              <div style={{ color: 'white', textAlign: 'center' }}>
                <p>Cannot preview this file type</p>
                {user?.is_admin && (
                  <button onClick={() => handleDownload(viewingFile)} className="btn btn-primary">
                    Download to view
                  </button>
                )}
              </div>
            )}
          </div>
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

