import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import AuthenticatedAudio from '../components/AuthenticatedAudio'
import './AudioRecordings.css'

function AudioRecordings() {
  const [recordings, setRecordings] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [currentPlaying, setCurrentPlaying] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    fetchRecordings()
  }, [])

  const fetchRecordings = async () => {
    try {
      const response = await axios.get('/api/audio')
      setRecordings(response.data)
    } catch (error) {
      console.error('Failed to fetch recordings:', error)
    } finally {
      setLoading(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      // Use the best available mime type
      const options = { mimeType: 'audio/webm' }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        // Fallback to default
        delete options.mimeType
      }
      
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      
      const chunks = []
      mediaRecorder.ondataavailable = (e) => {
        console.log('Data available:', e.data.size, 'bytes')
        if (e.data && e.data.size > 0) {
          chunks.push(e.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        console.log('Recording stopped, chunks:', chunks.length)
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' })
          console.log('Recording stopped, blob created:', { 
            size: blob.size, 
            type: blob.type,
            chunks: chunks.length 
          })
          
          if (blob.size > 0) {
            setAudioBlob(blob)
          } else {
            console.warn('Blob is empty')
            alert('Recording appears to be empty. Please try again.')
          }
        } else {
          console.warn('No audio chunks recorded')
          alert('No audio was recorded. Please try again.')
        }
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e)
        alert('An error occurred during recording. Please try again.')
      }
      
      // Start recording with timeslice to ensure data is available
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setRecordingTime(0)
      
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Failed to access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Request final data before stopping
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.requestData()
      }
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }

  const handleUploadRecording = async () => {
    if (!audioBlob) {
      console.error('No audio blob to upload')
      return
    }

    const formData = new FormData()
    formData.append('file', audioBlob, `recording-${Date.now()}.webm`)
    formData.append('title', `Recording ${format(new Date(), 'MMM d, yyyy HH:mm')}`)

    try {
      console.log('Uploading recording...', { blobSize: audioBlob.size, blobType: audioBlob.type })
      
      const response = await axios.post('/api/audio', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data' 
        },
      })

      console.log('Recording uploaded successfully:', response.data)

      // Clear the audio blob
      setAudioBlob(null)

      // Force audio elements to reload by incrementing refresh key
      setRefreshKey(prev => prev + 1)

      // Small delay to ensure file is ready on server
      await new Promise(resolve => setTimeout(resolve, 500))

      // Refresh the recordings list
      await fetchRecordings()
      
      // Show success message
      alert('Recording saved successfully!')
    } catch (error) {
      console.error('Failed to upload recording:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      alert(`Failed to upload recording: ${error.response?.data?.detail || error.message || 'Unknown error'}`)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', file.name)

    try {
      await axios.post('/api/audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      // Force audio elements to reload
      setRefreshKey(prev => prev + 1)

      // Small delay to ensure file is ready
      await new Promise(resolve => setTimeout(resolve, 800))

      fetchRecordings()
    } catch (error) {
      console.error('Failed to upload audio:', error)
      alert('Failed to upload audio file')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recording? This cannot be undone.')) {
      return
    }

    try {
      await axios.delete(`/api/audio/${id}`)
      fetchRecordings()
    } catch (error) {
      console.error('Failed to delete recording:', error)
      alert('Failed to delete recording')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Voice Recordings</h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            marginTop: '-1rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
          }}>
            Capture your voice and stories for future generations
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            + Upload Audio
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="container">
        <h2 style={{ marginBottom: '1.5rem' }}>Record New Audio</h2>
        <div className="recording-controls">
          {!isRecording && !audioBlob && (
            <button onClick={startRecording} className="btn btn-primary">
              Start Recording
            </button>
          )}
          
          {isRecording && (
            <>
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                Recording: {formatTime(recordingTime)}
              </div>
              <button onClick={stopRecording} className="btn btn-danger">
                Stop Recording
              </button>
            </>
          )}
          
          {audioBlob && !isRecording && (
            <div className="recording-preview">
              <audio controls src={URL.createObjectURL(audioBlob)} />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  onClick={handleUploadRecording} 
                  className="btn btn-primary"
                  disabled={!audioBlob || audioBlob.size === 0}
                >
                  Save Recording
                </button>
                <button 
                  onClick={() => {
                    setAudioBlob(null)
                    setRecordingTime(0)
                  }} 
                  className="btn btn-secondary"
                >
                  Discard
                </button>
              </div>
              {audioBlob && (
                <p style={{ 
                  marginTop: '0.5rem', 
                  fontSize: '0.85rem', 
                  color: 'var(--text-muted)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                }}>
                  Size: {(audioBlob.size / 1024).toFixed(2)} KB
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Your Recordings</h2>
        {recordings.length === 0 ? (
          <div className="container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{
              fontSize: '1.2rem',
              color: 'var(--text-secondary)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
            }}>
              No recordings yet. Record or upload your first audio to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-2">
            {recordings.map((recording) => (
              <div key={recording.id} className="card" style={{ position: 'relative' }}>
                <h3 style={{ marginBottom: '0.75rem' }}>{recording.title || 'Untitled Recording'}</h3>
                <p style={{
                  color: 'var(--text-muted)',
                  marginBottom: '1.25rem',
                  fontSize: '0.9rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                }}>
                  {format(new Date(recording.created_at), 'MMMM d, yyyy')}
                </p>
                {recording.description && (
                  <p style={{
                    marginBottom: '1rem',
                    color: 'var(--text-secondary)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
                  }}>{recording.description}</p>
                )}
                <AuthenticatedAudio
                  key={`audio-${recording.id}-${refreshKey}`}
                  audioId={recording.id}
                  onPlay={() => setCurrentPlaying(recording.id)}
                  onPause={() => setCurrentPlaying(null)}
                  style={{ width: '100%', marginTop: '1rem', marginBottom: '2.5rem' }}
                  preload="metadata"
                />
                <button
                  onClick={() => handleDelete(recording.id)}
                  className="btn btn-danger"
                  style={{
                    position: 'absolute',
                    bottom: '1rem',
                    right: '1rem',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.7rem',
                    minWidth: 'auto'
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AudioRecordings

