import React, { useState, useEffect } from 'react'
import axios from '../config/api'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'

function Files() {
  const { user } = useAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewingFile, setViewingFile] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const response = await axios.get('/api/files?source=files')
      setFiles(response.data)
    } catch (error) {
      console.error('Failed to fetch files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target.files)

    for (const file of uploadedFiles) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name)
      formData.append('source', 'files')

      try {
        await axios.post('/api/files', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } catch (error) {
        console.error('Failed to upload file:', error)
      }
    }

    fetchFiles()
  }

  const handleDownload = async (file) => {
    try {
      console.log('Downloading file:', file.id, file.filename)

      // Fetch the file with authentication
      const response = await axios.get(`/api/files/${file.id}`, {
        responseType: 'blob',
      })

      console.log('File fetched, size:', response.data.size)

      // Determine the filename - try to preserve original extension
      let downloadFilename = file.title || file.filename || 'download'

      // If the stored filename is a UUID, try to get extension from file_type
      if (file.filename && file.filename.includes('-') && file.filename.length > 30) {
        // Likely a UUID filename, try to extract extension from file_type or use original title
        if (file.file_type) {
          const extension = file.file_type.split('/')[1] || ''
          if (extension && !downloadFilename.includes('.')) {
            downloadFilename = `${downloadFilename}.${extension}`
          }
        }
      }

      // Create a blob URL and trigger download
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = downloadFilename
      document.body.appendChild(link)
      link.click()

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)

      console.log('Download initiated for:', downloadFilename)
    } catch (error) {
      console.error('Failed to download file:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      alert(`Failed to download file: ${error.response?.data?.detail || error.message || 'Unknown error'}`)
    }
  }

  const handleView = async (file) => {
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

  const handleEdit = (file) => {
    setEditingId(file.id)
    setEditTitle(file.title || '')
    setEditDescription(file.description || '')
  }

  const handleSaveEdit = async () => {
    try {
      const formData = new FormData()
      formData.append('title', editTitle)
      formData.append('description', editDescription)

      await axios.put(`/api/files/${editingId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setEditingId(null)
      setEditTitle('')
      setEditDescription('')
      fetchFiles()
    } catch (error) {
      console.error('Failed to update file:', error)
      alert('Failed to update file. Please try again.')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditDescription('')
  }

  const handleDelete = async (id) => {
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

  const closeViewer = () => {
    if (viewingFile?.url) {
      window.URL.revokeObjectURL(viewingFile.url)
    }
    setViewingFile(null)
  }

  const canViewInline = (fileType) => {
    if (!fileType) return false
    return fileType.includes('image') || fileType.includes('pdf') || fileType.includes('text') || fileType.includes('video')
  }

  const getFileIcon = (fileType) => {
    if (!fileType) return '📄'
    if (fileType.includes('pdf')) return '📕'
    if (fileType.includes('word') || fileType.includes('document')) return '📘'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📗'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('video')) return '🎥'
    return '📄'
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Miscellaneous Files</h1>
          <p style={{
            fontSize: '1.1rem',
            color: '#6366f1',
            fontWeight: 'bold',
            marginTop: '-1rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>
            Miscellaneous files that might add to overall story
          </p>
        </div>
        {user?.is_admin && (
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            + Upload Files
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>

      {files.length === 0 ? (
        <div className="container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>
            {user?.is_admin ? 'No files yet. Upload your first document to get started!' : 'No files available yet.'}
          </p>
          {user?.is_admin && (
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
              Upload Files
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
      ) : (
        <div className="grid grid-3">
          {files.map((file) => (
            <div key={file.id} className="card" style={{ textAlign: 'center' }}>
              {editingId === file.id ? (
                // Edit mode
                <div style={{ textAlign: 'left' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
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
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
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
                      onClick={handleSaveEdit}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
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
                    <button
                      onClick={() => handleView(file)}
                      className="btn btn-primary"
                      style={{
                        flex: '1 1 auto',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.85rem'
                      }}
                    >
                      View
                    </button>
                    {user?.is_admin && (
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
                    )}
                    {user?.is_admin && (
                      <>
                        <button
                          onClick={() => handleEdit(file)}
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
                          onClick={() => handleDelete(file.id)}
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
                src={viewingFile.url}
                controls
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
              >
                Your browser does not support the video tag.
              </video>
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
    </div>
  )
}

export default Files

