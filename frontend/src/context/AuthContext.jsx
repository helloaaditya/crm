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
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      loadUser()
    } else {
      setLoading(false)
    }
  }, [])

  // Load user data
  const loadUser = async () => {
    try {
      const res = await axios.get('/auth/me')
      setUser(res.data.data)
    } catch (error) {
      console.error('Load user error:', error)
      logout()
    } finally {
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
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    toast.info('Logged out successfully')
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