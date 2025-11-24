import React, { useState, useEffect } from 'react'
import axios from 'axios'

function AuthenticatedImage({ photoId, alt, className, style, ...props }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let objectUrl = null

    const fetchImage = async () => {
      try {
        const response = await axios.get(`/api/photos/${photoId}`, {
          responseType: 'blob',
        })
        const blob = new Blob([response.data])
        objectUrl = URL.createObjectURL(blob)
        setImageUrl(objectUrl)
        setLoading(false)
      } catch (err) {
        console.error(`Failed to load image ${photoId}:`, err)
        setError(true)
        setLoading(false)
      }
    }

    fetchImage()

    // Cleanup
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [photoId])

  if (error) {
    return (
      <div 
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--background)',
          color: 'var(--text-muted)'
        }}
      >
        Image not available
      </div>
    )
  }

  if (loading) {
    return (
      <div 
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--background)',
          color: 'var(--text-muted)'
        }}
      >
        Loading...
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      style={style}
      {...props}
    />
  )
}

export default AuthenticatedImage

