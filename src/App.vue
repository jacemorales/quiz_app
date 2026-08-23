<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from './composables/useAuth'

const router = useRouter()
const route = useRoute()
const { user, isAuthenticated, logout, checkAuth } = useAuth()

const mobileMenuOpen = ref(false)

onMounted(() => {
  checkAuth()
})

watch(route, () => {
  mobileMenuOpen.value = false
})

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function handleLogout() {
  mobileMenuOpen.value = false
  logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="header-container">
        <router-link to="/" class="brand-logo" @click="mobileMenuOpen = false">
          <div class="logo-icon">Q</div>
          <span class="logo-text">Quiz <span class="logo-highlight">Hub</span></span>
        </router-link>

        <!-- Desktop Navigation -->
        <nav class="header-nav desktop-nav">
          <template v-if="isAuthenticated">
            <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
            <router-link to="/create-quiz" class="btn btn-primary btn-sm">+ Create Quiz</router-link>

            <div class="user-profile-menu">
              <span class="user-name">👤 {{ user?.name }}</span>
              <button @click="handleLogout" class="btn btn-outline btn-sm">Log Out</button>
            </div>
          </template>
          <template v-else>
            <router-link to="/login" class="nav-link">Log In</router-link>
            <router-link to="/register" class="btn btn-primary btn-sm">Get Started</router-link>
          </template>
        </nav>

        <!-- Mobile Hamburger Button -->
        <button
          @click="toggleMobileMenu"
          class="mobile-menu-toggle"
          :aria-expanded="mobileMenuOpen"
          aria-label="Toggle Navigation Menu"
        >
          <span class="hamburger-line" :class="{ open: mobileMenuOpen }"></span>
          <span class="hamburger-line" :class="{ open: mobileMenuOpen }"></span>
          <span class="hamburger-line" :class="{ open: mobileMenuOpen }"></span>
        </button>
      </div>

      <!-- Mobile Dropdown Navigation Drawer -->
      <transition name="slide-down">
        <div v-if="mobileMenuOpen" class="mobile-nav-drawer">
          <template v-if="isAuthenticated">
            <div class="mobile-user-info">
              <span class="user-name">👤 {{ user?.name }}</span>
              <span class="user-email">{{ user?.email }}</span>
            </div>
            <router-link to="/dashboard" class="mobile-nav-link" @click="mobileMenuOpen = false">
              📊 Dashboard
            </router-link>
            <router-link to="/create-quiz" class="mobile-nav-link primary-link" @click="mobileMenuOpen = false">
              ➕ Create Quiz
            </router-link>
            <button @click="handleLogout" class="mobile-nav-link danger-link">
              🚪 Log Out
            </button>
          </template>
          <template v-else>
            <router-link to="/login" class="mobile-nav-link" @click="mobileMenuOpen = false">
              🔑 Log In
            </router-link>
            <router-link to="/register" class="mobile-nav-link primary-link" @click="mobileMenuOpen = false">
              🚀 Get Started
            </router-link>
          </template>
        </div>
      </transition>
    </header>

    <main class="app-main">
      <router-view />
    </main>

    <footer class="app-footer">
      <div class="footer-container">
        <p>© 2025 Quiz Hub. All rights reserved. Professional Online Quiz Platform.</p>
      </div>
    </footer>
  </div>
</template>

<style>
:root {
  --primary: #16a34a;
  --primary-hover: #15803d;
  --primary-light: #f0fdf4;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --dark: #0f172a;
  --gray-900: #111827;
  --gray-800: #1f2937;
  --gray-700: #374151;
  --gray-600: #4b5563;
  --gray-500: #6b7280;
  --gray-400: #9ca3af;
  --gray-300: #d1d5db;
  --gray-200: #e5e7eb;
  --gray-100: #f3f4f6;
  --gray-50: #f9fafb;
  --white: #ffffff;
  --radius-sm: 6px;
  --radius: 10px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  overflow-x: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--gray-50);
  color: var(--gray-800);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
}

.app-header {
  background: var(--white);
  border-bottom: 1px solid var(--gray-200);
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: var(--shadow-sm);
  width: 100%;
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  font-weight: 800;
  font-size: 1.25rem;
  color: var(--dark);
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--primary) 0%, #4ade80 100%);
  color: var(--white);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.2rem;
  box-shadow: 0 2px 4px rgba(22, 163, 74, 0.3);
  flex-shrink: 0;
}

.logo-highlight {
  color: var(--primary);
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-link {
  text-decoration: none;
  color: var(--gray-600);
  font-weight: 600;
  font-size: 0.95rem;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.nav-link:hover {
  color: var(--primary);
  background: var(--gray-100);
}

.user-profile-menu {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 10px;
  padding-left: 12px;
  border-left: 1px solid var(--gray-200);
}

.user-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--gray-700);
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Mobile Hamburger Toggle */
.mobile-menu-toggle {
  display: none;
  flex-direction: column;
  justify-content: space-around;
  width: 38px;
  height: 38px;
  background: transparent;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 8px;
  z-index: 1001;
}

.hamburger-line {
  width: 100%;
  height: 2px;
  background-color: var(--gray-700);
  transition: all 0.3s ease;
  border-radius: 2px;
}

.mobile-nav-drawer {
  display: flex;
  flex-direction: column;
  background: var(--white);
  border-bottom: 1px solid var(--gray-200);
  padding: 16px 24px;
  gap: 12px;
  box-shadow: var(--shadow);
}

.mobile-user-info {
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--gray-100);
}

.mobile-user-info .user-name {
  font-weight: 700;
  font-size: 1rem;
  color: var(--dark);
}

.mobile-user-info .user-email {
  font-size: 0.825rem;
  color: var(--gray-500);
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  color: var(--gray-700);
  background: var(--gray-50);
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.mobile-nav-link.primary-link {
  background: var(--primary);
  color: var(--white);
}

.mobile-nav-link.danger-link {
  background: #fef2f2;
  color: var(--danger);
}

.app-main {
  flex: 1;
  width: 100%;
}

.app-footer {
  background: var(--white);
  border-top: 1px solid var(--gray-200);
  padding: 24px 0;
  margin-top: auto;
  text-align: center;
  color: var(--gray-500);
  font-size: 0.875rem;
  width: 100%;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Common Buttons & Badges */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  touch-action: manipulation;
  min-height: 40px;
}

.btn-sm {
  padding: 8px 14px;
  font-size: 0.875rem;
  min-height: 36px;
}

.btn-lg {
  padding: 14px 28px;
  font-size: 1.05rem;
  min-height: 48px;
}

.btn-primary {
  background-color: var(--primary);
  color: var(--white);
  box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);
}

.btn-primary:hover {
  background-color: var(--primary-hover);
}

.btn-secondary {
  background-color: var(--gray-100);
  color: var(--gray-800);
  border-color: var(--gray-300);
}

.btn-outline {
  background-color: transparent;
  color: var(--gray-700);
  border-color: var(--gray-300);
}

.btn-danger {
  background-color: var(--danger);
  color: var(--white);
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 9999px;
  text-transform: uppercase;
}

.badge-active {
  background-color: #d1fae5;
  color: #065f46;
}

.badge-draft {
  background-color: var(--gray-100);
  color: var(--gray-600);
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
  overflow-y: auto;
}

.modal-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  max-width: 500px;
  width: 100%;
  padding: 28px;
  box-shadow: var(--shadow-lg);
  max-height: 90vh;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .desktop-nav {
    display: none;
  }

  .mobile-menu-toggle {
    display: flex;
  }

  .header-container {
    padding: 10px 16px;
  }
}
</style>
