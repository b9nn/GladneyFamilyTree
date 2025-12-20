import axios from 'axios'

// In production, API is served from the same server (no VITE_API_URL needed)
// In development, use proxy configured in vite.config.js
const API_URL = import.meta.env.VITE_API_URL || ''

// Configure axios defaults
if (API_URL) {
  axios.defaults.baseURL = API_URL
  console.log('[API] Using external API:', API_URL)
} else {
  console.log('[API] Using same-origin API (production mode)')
}

// Add request interceptor for debugging
axios.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default axios
