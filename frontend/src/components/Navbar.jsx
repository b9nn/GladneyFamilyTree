import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          TAG Diary
        </Link>
        {user && (
          <>
            <div className="navbar-links">
              <Link to="/">Dashboard</Link>
              <Link to="/vignettes">Vignettes</Link>
              <Link to="/photos">Photo Gallery</Link>
              <Link to="/audio">Audio Recordings</Link>
              <Link to="/files">Files</Link>
            </div>
            <div className="navbar-user">
              <span>Welcome, {user.full_name || user.username}</span>
              <button onClick={handleLogout} className="btn btn-secondary">
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar

