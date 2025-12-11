import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from '../config/api'
import './Login.css'

function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [isResetPassword, setIsResetPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isLogin) {
        await login(username, password)
        navigate('/')
      } else {
        await register(username, password, email, fullName, inviteCode)
        navigate('/')
      }
    } catch (err) {
      console.error('Authentication error:', err)
      if (err.response) {
        // Server responded with an error
        setError(err.response?.data?.detail || 'Authentication failed. Please try again.')
      } else if (err.request) {
        // Request was made but no response received
        setError('Cannot connect to server. Please make sure the server is running.')
      } else {
        // Something else happened
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await axios.post('/api/auth/password-reset-request', { email })
      setSuccess(response.data.message)

      // For development - auto-fill token if returned
      if (response.data.token) {
        setResetToken(response.data.token)
        setIsResetPassword(true)
        setIsForgotPassword(false)
      }
    } catch (err) {
      console.error('Password reset request error:', err)
      setError('Failed to process password reset request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    try {
      await axios.post('/api/auth/password-reset', {
        token: resetToken,
        new_password: newPassword
      })
      setSuccess('Password reset successful! You can now login with your new password.')

      // Reset form and go back to login
      setTimeout(() => {
        setIsResetPassword(false)
        setIsForgotPassword(false)
        setIsLogin(true)
        setResetToken('')
        setNewPassword('')
        setConfirmPassword('')
        setEmail('')
        setSuccess('')
      }, 2000)
    } catch (err) {
      console.error('Password reset error:', err)
      setError(err.response?.data?.detail || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setIsForgotPassword(false)
    setIsResetPassword(false)
    setIsLogin(true)
    setError('')
    setSuccess('')
    setEmail('')
    setResetToken('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {isForgotPassword ? (
          <>
            <h1>Forgot Password</h1>
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email address"
                />
              </div>
              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <p className="toggle-form">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="link-button"
              >
                Back to Login
              </button>
            </p>
          </>
        ) : isResetPassword ? (
          <>
            <h1>Reset Password</h1>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>Reset Token</label>
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                  placeholder="Enter reset token from email"
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                />
              </div>
              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
            <p className="toggle-form">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="link-button"
              >
                Back to Login
              </button>
            </p>
          </>
        ) : (
          <>
            <h1>{isLogin ? 'Login' : 'Register'}</h1>
            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div className="form-group">
                    <label>Invite Code</label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      required
                      placeholder="Enter your invite code"
                    />
                  </div>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter your username"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>
              {isLogin && (
                <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true)
                      setIsLogin(false)
                    }}
                    className="link-button"
                    style={{ fontSize: '0.9rem' }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
              </button>
            </form>
            <p className="toggle-form">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="link-button"
                style={isLogin ? { fontSize: '1.2rem' } : {}}
              >
                {isLogin ? 'Register' : 'Login'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default Login

