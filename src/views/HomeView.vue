<script setup>
import { useAuth } from '../composables/useAuth'

const { isAuthenticated } = useAuth()
</script>

<template>
  <div class="landing-page">
    <section class="hero-section">
      <div class="hero-container">
        <span class="hero-badge">⚡ Powerful Online Quiz SaaS</span>
        <h1 class="hero-title">Create, Share & Host Quizzes Effortlessly</h1>
        <p class="hero-subtitle">
          Eliminate custom quiz development. Quiz Hub gives creators, educators, businesses, and developers
          an all-in-one platform to customize quizzes, collect answers, and analyze real-time results.
        </p>

        <div class="hero-actions">
          <router-link v-if="isAuthenticated" to="/dashboard" class="btn btn-primary btn-lg">
            Go to Dashboard →
          </router-link>
          <template v-else>
            <router-link to="/register" class="btn btn-primary btn-lg">
              Start Free Today →
            </router-link>
            <router-link to="/login" class="btn btn-outline btn-lg">
              Log In
            </router-link>
          </template>
        </div>
      </div>
    </section>

    <section class="features-section">
      <div class="features-container">
        <h2 class="section-title">Everything You Need for Engaging Quizzes</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">⏱️</div>
            <h3>Flexible Timers</h3>
            <p>Set timed per-question countdowns or single overall quiz timers to test speed and accuracy.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">👤</div>
            <h3>Anonymous or Identified</h3>
            <p>Allow anonymous submissions or configure custom participant fields like Full Name, Student ID, or Email.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔗</div>
            <h3>Shareable Unique URLs</h3>
            <p>Instantly generate randomized long quiz URLs to share with students, clients, or participants anywhere.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h3>Real-Time Analytics</h3>
            <p>Track total attempts, completion rates, average scores, and question difficulty performance tables.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔒</div>
            <h3>Secure Ownership</h3>
            <p>All quiz data is safely stored and protected with server-side account authentication and ownership checks.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📱</div>
            <h3>Mobile Optimized</h3>
            <p>Participants get a smooth, responsive one-question-at-a-time experience across mobile, tablet, and desktop.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing-page {
  width: 100%;
}

.hero-section {
  padding: 80px 24px 60px;
  text-align: center;
  background: linear-gradient(180deg, #ffffff 0%, var(--gray-50) 100%);
  border-bottom: 1px solid var(--gray-200);
}

.hero-container {
  max-width: 800px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-block;
  padding: 6px 16px;
  background-color: var(--primary-light);
  color: var(--primary);
  font-weight: 700;
  font-size: 0.85rem;
  border-radius: 9999px;
  margin-bottom: 20px;
}

.hero-title {
  font-size: 3rem;
  font-weight: 900;
  color: var(--dark);
  line-height: 1.15;
  margin-bottom: 20px;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: var(--gray-600);
  line-height: 1.6;
  margin-bottom: 36px;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.features-section {
  padding: 80px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 800;
  color: var(--dark);
  margin-bottom: 48px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 28px;
}

.feature-card {
  background: var(--white);
  padding: 32px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
  border-color: var(--primary-light);
}

.feature-icon {
  font-size: 2.2rem;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--dark);
  margin-bottom: 10px;
}

.feature-card p {
  color: var(--gray-600);
  font-size: 0.95rem;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 2.2rem;
  }
  .hero-actions {
    flex-direction: column;
  }
}
</style>
