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
          <h1>Documents & Files</h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            marginTop: '-1rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>
            Store important documents and family treasures
          </p>
        </div>
        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
          + Upload Files
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {files.length === 0 ? (
        <div className="container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>
            No files yet. Upload your first document to get started!
          </p>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            Upload Files
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      ) : (
        <div className="grid grid-3">
          {files.map((file) => (
            <div key={file.id} className="card" style={{ textAlign: 'center' }}>
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

