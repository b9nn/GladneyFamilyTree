import React, { useState, useEffect } from 'react'
import axios from '../config/api'
import { useAuth } from '../context/AuthContext'
import './AdminPanel.css'

function AdminPanel() {
  const { user } = useAuth()
  const [inviteCodes, setInviteCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [email, setEmail] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [recipientName, setRecipientName] = useState('')
  const [sendEmail, setSendEmail] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Background image state
  const [backgroundImage, setBackgroundImage] = useState(null)
  const [uploadingBackground, setUploadingBackground] = useState(false)

  // Registered users state
  const [registeredUsers, setRegisteredUsers] = useState([])

  // Mistagged files state
  const [mistaggedFiles, setMistaggedFiles] = useState([])
  const [fixingFiles, setFixingFiles] = useState(false)

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordChanging, setPasswordChanging] = useState(false)

  // Username change state
  const [editingUsername, setEditingUsername] = useState(null)
  const [newUsername, setNewUsername] = useState('')

  useEffect(() => {
    fetchInviteCodes()
    fetchBackgroundImage()
    fetchRegisteredUsers()
    fetchMistaggedFiles()
  }, [])

  const fetchInviteCodes = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/admin/invite-codes')
      setInviteCodes(response.data)
      setError('')
    } catch (err) {
      console.error('Failed to fetch invite codes:', err)
      if (err.response?.status === 403) {
        setError('You do not have admin access')
      } else {
        setError('Failed to load invite codes')
      }
    } finally {
      setLoading(false)
    }
  }

  const createInviteCode = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await axios.post('/api/admin/invite-codes', {
        email: email || null,
        expires_in_days: expiresInDays,
        send_email: sendEmail,
        recipient_name: recipientName || null
      })

      let message = `Invite code created: ${response.data.code}`
      if (sendEmail && email) {
        message += ` (Email sent to ${email})`
      }
      setSuccess(message)

      setEmail('')
      setExpiresInDays(30)
      setRecipientName('')
      setSendEmail(false)
      setShowCreateForm(false)
      fetchInviteCodes()
    } catch (err) {
      console.error('Failed to create invite code:', err)
      setError(err.response?.data?.detail || 'Failed to create invite code')
    }
  }

  const deleteInviteCode = async (codeId) => {
    if (!confirm('Are you sure you want to delete this invite code?')) {
      return
    }

    try {
      await axios.delete(`/api/admin/invite-codes/${codeId}`)
      setSuccess('Invite code deleted')
      fetchInviteCodes()
    } catch (err) {
      console.error('Failed to delete invite code:', err)
      setError('Failed to delete invite code')
    }
  }

  const fetchBackgroundImage = async () => {
    try {
      const response = await axios.get('/api/background')
      setBackgroundImage(response.data)
    } catch (err) {
      console.error('Failed to fetch background:', err)
    }
  }

  const fetchRegisteredUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users')
      setRegisteredUsers(response.data)
    } catch (err) {
      console.error('Failed to fetch registered users:', err)
    }
  }

  const fetchMistaggedFiles = async () => {
    try {
      const response = await axios.get('/api/admin/mistagged-files')
      setMistaggedFiles(response.data.files || [])
    } catch (err) {
      console.error('Failed to fetch mistagged files:', err)
    }
  }

  const fixMistaggedFiles = async () => {
    if (!confirm(`This will move ${mistaggedFiles.length} file(s) from the Vignettes page to the Files page. Continue?`)) {
      return
    }

    setFixingFiles(true)
    setError('')
    setSuccess('')

    try {
      const response = await axios.post('/api/admin/fix-file-sources')
      setSuccess(response.data.message)
      fetchMistaggedFiles() // Refresh the list
    } catch (err) {
      console.error('Failed to fix file sources:', err)
      setError(err.response?.data?.detail || 'Failed to fix file sources')
    } finally {
      setFixingFiles(false)
    }
  }

  const deleteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This will permanently delete all their content (vignettes, photos, audio recordings, etc.).`)) {
      return
    }

    try {
      await axios.delete(`/api/admin/users/${userId}`)
      setSuccess(`User "${username}" deleted successfully`)
      fetchRegisteredUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
      setError(err.response?.data?.detail || 'Failed to delete user')
    }
  }

  const handleBackgroundUpload = async (e) => {
    try {
      console.log('[ADMIN] handleBackgroundUpload triggered')
      console.log('[ADMIN] Event:', e)
      console.log('[ADMIN] Files:', e.target.files)

      const file = e.target.files?.[0]
      console.log('[ADMIN] Selected file:', file)

      if (!file) {
        console.log('[ADMIN] No file selected')
        return
      }

      setUploadingBackground(true)
      setError('')
      setSuccess('')

      const formData = new FormData()
      formData.append('file', file)
      console.log('[ADMIN] Uploading background image:', file.name)

      await axios.post('/api/admin/background', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      console.log('[ADMIN] Background upload successful')
      setSuccess('Background image uploaded successfully! Refresh the page to see the new background.')
      fetchBackgroundImage()
    } catch (err) {
      console.error('[ADMIN] Failed to upload background:', err)
      setError('Failed to upload background image')
    } finally {
      setUploadingBackground(false)
    }
  }

  const deleteBackground = async () => {
    if (!backgroundImage || !confirm('Are you sure you want to remove the background image?')) {
      return
    }

    try {
      await axios.delete(`/api/admin/background/${backgroundImage.id}`)
      setSuccess('Background image removed! Refresh the page to see the change.')
      setBackgroundImage(null)
    } catch (err) {
      console.error('Failed to delete background:', err)
      setError('Failed to remove background image')
    }
  }

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code)
    setSuccess(`Copied: ${code}`)
    setTimeout(() => setSuccess(''), 3000)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters long')
      return
    }

    setPasswordChanging(true)

    try {
      await axios.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      })

      setSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (err) {
      console.error('Failed to change password:', err)
      setError(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setPasswordChanging(false)
    }
  }

  const updateUsername = async (userId, currentUsername) => {
    if (!newUsername.trim()) {
      setError('Username cannot be empty')
      return
    }

    if (newUsername === currentUsername) {
      setError('New username is the same as current username')
      return
    }

    try {
      const formData = new FormData()
      formData.append('new_username', newUsername)

      await axios.patch(`/api/admin/users/${userId}/username`, formData)
      setSuccess(`Username changed from '${currentUsername}' to '${newUsername}'`)
      setEditingUsername(null)
      setNewUsername('')
      fetchRegisteredUsers()
    } catch (err) {
      console.error('Failed to update username:', err)
      setError(err.response?.data?.detail || 'Failed to update username')
    }
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="container">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-panel">
      <div className="container">
        <div className="admin-header">
          <h1>Admin Panel</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : 'Create Invite Code'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              {showPasswordForm ? 'Cancel' : 'Change Password'}
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {showPasswordForm && (
          <div className="create-form-card">
            <h2>Change Your Password</h2>
            <form onSubmit={changePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={passwordChanging}
                  autoComplete="current-password"
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={passwordChanging}
                  minLength={4}
                  autoComplete="new-password"
                />
                <small>At least 4 characters</small>
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={passwordChanging}
                  minLength={4}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={passwordChanging}
              >
                {passwordChanging ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {showCreateForm && (
          <div className="create-form-card">
            <h2>Create New Invite Code</h2>
            <form onSubmit={createInviteCode}>
              <div className="form-group">
                <label>Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Leave blank for any email"
                />
                <small>If specified, only this email can use the code</small>
              </div>

              <div className="form-group">
                <label>Recipient Name (Optional)</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g., John Smith"
                />
                <small>Used for personalizing the email</small>
              </div>

              <div className="form-group">
                <label>Expires In (Days)</label>
                <input
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                  min="1"
                  max="365"
                  required
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    disabled={!email}
                  />
                  <span>Send invite code via email</span>
                </label>
                {!email && (
                  <small className="warning">Email address required to send invitation</small>
                )}
              </div>

              <button type="submit" className="btn btn-primary">
                {sendEmail && email ? 'Generate & Send Email' : 'Generate Code'}
              </button>
            </form>
          </div>
        )}

        <div className="invite-codes-section">
          <h2>Invite Codes</h2>

          {inviteCodes.filter(code => !code.is_used).length === 0 ? (
            <p className="no-codes">No active invite codes. Create one to get started!</p>
          ) : (
            <div className="codes-table-container">
              <table className="codes-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Sent To</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inviteCodes.filter(code => !code.is_used).map((code) => (
                    <tr key={code.id} className={code.is_used ? 'used' : isExpired(code.expires_at) ? 'expired' : ''}>
                      <td>
                        <code className="invite-code">{code.code}</code>
                        <button
                          className="btn-icon"
                          onClick={() => copyToClipboard(code.code)}
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                      </td>
                      <td>{code.email || 'Any'}</td>
                      <td>
                        {isExpired(code.expires_at) ? (
                          <span className="badge badge-expired">Expired</span>
                        ) : (
                          <span className="badge badge-active">Active</span>
                        )}
                      </td>
                      <td>{formatDate(code.created_at)}</td>
                      <td>{formatDate(code.expires_at)}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteInviteCode(code.id)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Registered Users Section */}
        <div style={{ marginTop: '3rem' }}>
          <h2>Registered Users</h2>
          {registeredUsers.length === 0 ? (
            <p className="no-codes">No users registered yet.</p>
          ) : (
            <div className="grid grid-3">
              {registeredUsers.map((registeredUser) => (
                <div key={registeredUser.id} className="card">
                  <div style={{ marginBottom: '1rem' }}>
                    {editingUsername === registeredUser.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="New username"
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            fontSize: '1rem',
                            border: '2px solid var(--primary)',
                            borderRadius: '6px'
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => updateUsername(registeredUser.id, registeredUser.username)}
                          className="btn btn-primary"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingUsername(null)
                            setNewUsername('')
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--primary)' }}>
                          {registeredUser.username}
                        </h3>
                        <button
                          onClick={() => {
                            setEditingUsername(registeredUser.id)
                            setNewUsername(registeredUser.username)
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                    {registeredUser.is_admin ? (
                      <span className="badge badge-used">Admin</span>
                    ) : (
                      <span className="badge badge-active">User</span>
                    )}
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ marginBottom: '0.5rem' }}>
                      <strong>Full Name:</strong> {registeredUser.full_name || 'N/A'}
                    </p>
                    <p style={{ marginBottom: '0.5rem' }}>
                      <strong>Email:</strong> {registeredUser.email || 'N/A'}
                    </p>
                    <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <strong>Registered:</strong> {formatDate(registeredUser.created_at)}
                    </p>
                  </div>

                  {user && registeredUser.id !== user.id && (
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteUser(registeredUser.id, registeredUser.username)}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
                    >
                      Delete User
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Background Image Section */}
        <div style={{ marginTop: '3rem' }}>
          <h2>Background Image</h2>
          <div className="create-form-card">
            {backgroundImage ? (
              <div>
                <p style={{ marginBottom: '1rem' }}>
                  <strong>Current Background:</strong> Active
                </p>
                <div style={{ marginBottom: '1rem' }}>
                  <img
                    src={backgroundImage.url}
                    alt="Current background"
                    style={{
                      maxWidth: '150px',
                      maxHeight: '100px',
                      borderRadius: '8px',
                      objectFit: 'cover'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
                    Replace Background
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundUpload}
                      style={{ display: 'none' }}
                      disabled={uploadingBackground}
                    />
                  </label>
                  <button
                    className="btn btn-sm"
                    onClick={deleteBackground}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    Remove Background
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  No background image set. Upload an image to use as the background for all pages.
                </p>
                <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
                  {uploadingBackground ? 'Uploading...' : 'Upload Background Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    style={{ display: 'none' }}
                    disabled={uploadingBackground}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Fix Mistagged Files Section */}
        <div style={{ marginTop: '3rem' }}>
          <h2>Fix File Page Assignment</h2>
          <div className="create-form-card">
            {mistaggedFiles.length > 0 ? (
              <div>
                <p style={{ marginBottom: '1rem' }}>
                  <strong>{mistaggedFiles.length} file(s)</strong> are currently appearing on the Vignettes page
                  but should be on the Files page.
                </p>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  This happens when files were uploaded before the page filtering system was implemented.
                  Click below to move them to the Files page.
                </p>
                <div style={{ marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <p style={{ fontWeight: '500', marginBottom: '0.5rem' }}>Files to be moved:</p>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {mistaggedFiles.map(file => (
                      <li key={file.id} style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        {file.title || file.filename}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={fixMistaggedFiles}
                  disabled={fixingFiles}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  {fixingFiles ? 'Moving Files...' : `Move ${mistaggedFiles.length} File(s) to Files Page`}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-secondary)' }}>
                  ✓ All files are correctly assigned to their pages. No action needed.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
