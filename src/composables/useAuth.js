import { ref, computed } from 'vue'
import { getLocalUsers, saveUserLocal } from '../services/googleSheetsService'

const CURRENT_USER_KEY = 'quizapp_current_user'

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
      const stored = localStorage.getItem(CURRENT_USER_KEY)
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

      const users = getLocalUsers()
      const existing = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase())

      if (existing) {
        throw new Error('An account with this email already exists')
      }

      const newUser = {
        userId: generateUserId(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password, // client-side session store
        createdAt: new Date().toISOString()
      }

      saveUserLocal(newUser)

      const sessionUser = {
        userId: newUser.userId,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt
      }

      currentUser.value = sessionUser
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser))

      return sessionUser
    } catch (err) {
      error.value = err.message
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

      const users = getLocalUsers()
      const found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase())

      if (!found || found.password !== password) {
        throw new Error('Invalid email or password')
      }

      const sessionUser = {
        userId: found.userId,
        name: found.name,
        email: found.email,
        createdAt: found.createdAt
      }

      currentUser.value = sessionUser
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser))

      return sessionUser
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    currentUser.value = null
    localStorage.removeItem(CURRENT_USER_KEY)
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
