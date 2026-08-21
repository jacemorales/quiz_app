<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { register, loading, error } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const formError = ref('')

async function handleSubmit() {
  formError.value = ''
  if (!name.value || !email.value || !password.value) {
    formError.value = 'Please fill in all fields'
    return
  }

  if (password.value !== confirmPassword.value) {
    formError.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 6) {
    formError.value = 'Password must be at least 6 characters long'
    return
  }

  try {
    await register(name.value, email.value, password.value)
    router.push('/dashboard')
  } catch (err) {
    formError.value = err.message || 'Registration failed'
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1 class="auth-title">Create Your Account</h1>
        <p class="auth-subtitle">Get started with Quiz Hub to build & host custom quizzes</p>
      </div>

      <div v-if="formError || error" class="auth-error">
        ⚠️ {{ formError || error }}
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label for="name">Full Name</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Jane Doe"
            required
            class="form-control"
          />
        </div>

        <div class="form-group">
          <label for="email">Email Address</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="name@company.com"
            required
            class="form-control"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="At least 6 characters"
            required
            class="form-control"
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="Repeat password"
            required
            class="form-control"
          />
        </div>

        <button type="submit" :disabled="loading" class="btn btn-primary btn-lg w-full">
          <span v-if="loading">Creating Account...</span>
          <span v-else>Create Free Account →</span>
        </button>
      </form>

      <div class="auth-footer">
        Already have an account?
        <router-link to="/login" class="auth-link">Log in</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 160px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

.auth-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 440px;
  padding: 36px;
}

.auth-header {
  text-align: center;
  margin-bottom: 28px;
}

.auth-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--dark);
  margin-bottom: 8px;
}

.auth-subtitle {
  color: var(--gray-500);
  font-size: 0.925rem;
}

.auth-error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: var(--danger);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--gray-700);
}

.form-control {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--gray-300);
  font-size: 0.95rem;
  transition: all 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.w-full {
  width: 100%;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 0.9rem;
  color: var(--gray-600);
}

.auth-link {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
}

.auth-link:hover {
  text-decoration: underline;
}
</style>
