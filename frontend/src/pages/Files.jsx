import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { format } from 'date-fns'

function Files() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const response = await axios.get('/api/files')
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

  const handleDownload = (file) => {
    window.open(`http://localhost:8000/api/files/${file.id}`, '_blank')
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Files (Odds and Ends)</h1>
        <label className="btn btn-primary">
          Upload Files
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {files.length === 0 ? (
        <div className="container">
          <p>No files yet. Upload your first file to get started!</p>
        </div>
      ) : (
        <div className="grid grid-3">
          {files.map((file) => (
            <div key={file.id} className="card">
              <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '1rem' }}>
                {getFileIcon(file.file_type)}
              </div>
              <h3>{file.title || file.filename}</h3>
              <p style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                {format(new Date(file.created_at), 'MMMM d, yyyy')}
              </p>
              {file.description && (
                <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                  {file.description}
                </p>
              )}
              <p style={{ color: '#999', fontSize: '0.8rem', marginBottom: '1rem' }}>
                Type: {file.file_type || 'Unknown'}
              </p>
              <button onClick={() => handleDownload(file)} className="btn btn-primary" style={{ width: '100%' }}>
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Files

