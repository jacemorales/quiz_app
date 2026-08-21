import { ref, computed } from 'vue'

const user = ref(null)
const token = ref(localStorage.getItem('quizhub_token') || null)
const loading = ref(false)
const error = ref(null)

export function useAuth() {
  const isAuthenticated = computed(() => Boolean(token.value && user.value))

  async function checkAuth() {
    if (!token.value) {
      user.value = null
      return false
    }
    try {
      loading.value = true
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token.value}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        user.value = data.user
        return true
      } else {
        logout()
        return false
      }
    } catch (err) {
      console.error('Check auth error:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    try {
      loading.value = true
      error.value = null
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }
      token.value = data.token
      user.value = data.user
      localStorage.setItem('quizhub_token', data.token)
      return data.user
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function register(name, email, password) {
    try {
      loading.value = true
      error.value = null
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }
      token.value = data.token
      user.value = data.user
      localStorage.setItem('quizhub_token', data.token)
      return data.user
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('quizhub_token')
  }

  function getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value || ''}`
    }
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    checkAuth,
    login,
    register,
    logout,
    getAuthHeaders
  }
}
