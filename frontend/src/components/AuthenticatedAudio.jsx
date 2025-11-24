import React, { useState, useEffect } from 'react'
import axios from 'axios'

function AuthenticatedAudio({ audioId, onPlay, onPause, style, preload, ...props }) {
  const [audioUrl, setAudioUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let objectUrl = null

    const fetchAudio = async () => {
      try {
        const response = await axios.get(`/api/audio/${audioId}`, {
          responseType: 'blob',
        })
        const blob = new Blob([response.data])
        objectUrl = URL.createObjectURL(blob)
        setAudioUrl(objectUrl)
        setLoading(false)
      } catch (err) {
        console.error(`Failed to load audio ${audioId}:`, err)
        setError(true)
        setLoading(false)
      }
    }

    fetchAudio()

    // Cleanup
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [audioId])

  if (error) {
    return (
      <div 
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--background)',
          color: 'var(--text-muted)',
          padding: '1rem'
        }}
      >
        Audio not available
      </div>
    )
  }

  if (loading || !audioUrl) {
    return (
      <div 
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--background)',
          color: 'var(--text-muted)',
          padding: '1rem'
        }}
      >
        Loading audio...
      </div>
    )
  }

  return (
    <audio
      src={audioUrl}
      controls
      onPlay={onPlay}
      onPause={onPause}
      preload={preload || 'metadata'}
      style={style}
      {...props}
    />
  )
}

export default AuthenticatedAudio

