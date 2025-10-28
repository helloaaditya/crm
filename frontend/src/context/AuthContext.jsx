import { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const AuthContext = createContext()

// Export the AuthContext
export { AuthContext }

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Set axios default config
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem('token')
    console.log('AuthContext: Checking token on mount', { hasToken: !!token })
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      loadUser()
    } else {
      console.log('AuthContext: No token found, setting loading to false')
      setLoading(false)
    }
  }, [])

  // Load user data
  const loadUser = async () => {
    try {
      console.log('AuthContext: Loading user data...')
      const res = await axios.get('/auth/me')
      console.log('AuthContext: User loaded successfully', res.data.data)
      setUser(res.data.data)
    } catch (error) {
      console.error('AuthContext: Load user error:', error)
      console.error('AuthContext: Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        url: error.config?.url
      })
      
      // Only logout if it's an authentication error, not a network error
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('AuthContext: Authentication error, logging out')
        logout()
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        // For network errors, just set loading to false without logging out
        console.warn('AuthContext: Network error during user load, keeping user logged in')
      } else {
        // For other errors, also just set loading to false
        console.warn('AuthContext: Other error during user load, setting loading to false')
      }
    } finally {
      console.log('AuthContext: Setting loading to false')
      setLoading(false)
    }
  }

  // Login
  const login = async (email, password) => {
    try {
      const res = await axios.post('/auth/login', { email, password })
      const { token, ...userData } = res.data.data
      
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      setUser(userData)
      toast.success('Login successful!')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      return { success: false, message }
    }
  }

  // Logout
  const logout = () => {
    console.log('AuthContext: Logging out user')
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    setLoading(false)
    // Only show toast if user was actually logged in
    if (user) {
      toast.info('Logged out successfully')
    }
  }

  // Update user
  const updateUser = (userData) => {
    setUser(userData)
  }

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    loadUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}