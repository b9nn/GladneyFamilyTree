import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import axios from './config/api'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Vignettes from './pages/Vignettes'
import PhotoGallery from './pages/PhotoGallery'
import AudioRecordings from './pages/AudioRecordings'
import Files from './pages/Files'
import AdminPanel from './pages/AdminPanel'
import ChangePassword from './pages/ChangePassword'
import { AuthProvider, useAuth } from './context/AuthContext'
import './App.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return user ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return user.is_admin ? children : <Navigate to="/" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vignettes"
        element={
          <ProtectedRoute>
            <Vignettes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/photos"
        element={
          <ProtectedRoute>
            <PhotoGallery />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audio"
        element={
          <ProtectedRoute>
            <AudioRecordings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/files"
        element={
          <ProtectedRoute>
            <Files />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  const [backgroundImage, setBackgroundImage] = useState(null)

  useEffect(() => {
    // Fetch background image
    const fetchBackground = async () => {
      try {
        const response = await axios.get('/api/background')
        setBackgroundImage(response.data)
      } catch (err) {
        console.error('Failed to fetch background:', err)
      }
    }
    fetchBackground()
  }, [])

  const appStyle = backgroundImage ? {
    backgroundImage: `url(${backgroundImage.url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    backgroundRepeat: 'no-repeat',
    minHeight: '100vh',
    position: 'relative'
  } : {}

  const overlayStyle = backgroundImage ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    zIndex: -1
  } : {}

  return (
    <AuthProvider>
      <Router>
        <div className="App" style={appStyle}>
          {backgroundImage && <div style={overlayStyle} />}
          <Navbar />
          <main className="main-content">
            <AppRoutes />
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

