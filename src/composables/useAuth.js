import { ref, computed } from 'vue'
import { apiRegisterUser, apiLoginUser } from '../services/googleSheetsService'

const CURRENT_USER_SESSION_KEY = 'quizapp_session_user'

const currentUser = ref(null)
const loading = ref(false)
const error = ref(null)

function generateUserId() {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `usr_${hex}`
}

export function useAuth() {
  const isAuthenticated = computed(() => Boolean(currentUser.value))
  const user = computed(() => currentUser.value)

  function checkAuth() {
    try {
      const stored = sessionStorage.getItem(CURRENT_USER_SESSION_KEY) || localStorage.getItem(CURRENT_USER_SESSION_KEY)
      if (stored) {
        currentUser.value = JSON.parse(stored)
        return true
      }
    } catch (err) {
      console.error('Error reading current user session:', err)
    }
    currentUser.value = null
    return false
  }

  async function register(name, email, password) {
    loading.value = true
    error.value = null

    try {
      if (!name || !email || !password) {
        throw new Error('Name, email, and password are required')
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long')
      }

      const userId = generateUserId()
      const registeredUser = await apiRegisterUser({
        userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password
      })

      const sessionUser = {
        userId: registeredUser.userId,
        name: registeredUser.name,
        email: registeredUser.email,
        createdAt: registeredUser.createdAt
      }

      currentUser.value = sessionUser
      sessionStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(sessionUser))
      localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(sessionUser))

      return sessionUser
    } catch (err) {
      error.value = err.message || 'Unable to register. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    loading.value = true
    error.value = null

    try {
      if (!email || !password) {
        throw new Error('Email and password are required')
      }

      const authenticatedUser = await apiLoginUser(email.trim().toLowerCase(), password)

      const sessionUser = {
        userId: authenticatedUser.userId,
        name: authenticatedUser.name,
        email: authenticatedUser.email,
        createdAt: authenticatedUser.createdAt
      }

      currentUser.value = sessionUser
      sessionStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(sessionUser))
      localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(sessionUser))

      return sessionUser
    } catch (err) {
      error.value = err.message || 'Unable to log in. Please check your credentials.'
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    currentUser.value = null
    sessionStorage.removeItem(CURRENT_USER_SESSION_KEY)
    localStorage.removeItem(CURRENT_USER_SESSION_KEY)
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    checkAuth,
    login,
    register,
    logout
  }
}
