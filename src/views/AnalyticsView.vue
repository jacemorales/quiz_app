<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useQuizStore } from '../composables/useQuizStore'

const route = useRoute()
const quizId = computed(() => route.params.quizId)
const { user } = useAuth()
const { getQuizAnalytics } = useQuizStore()

const analytics = ref(null)
const loading = ref(true)
const error = ref('')

function fetchAnalytics() {
  loading.value = true
  error.value = ''
  try {
    if (!user.value) {
      throw new Error('Please log in to view analytics')
    }
    const data = getQuizAnalytics(quizId.value, user.value.userId)
    analytics.value = data
  } catch (err) {
    error.value = err.message || 'Error loading analytics'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAnalytics()
})

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getParticipantSummary(participantData) {
  if (!participantData || Object.keys(participantData).length === 0) {
    return 'Anonymous Participant'
  }
  return Object.entries(participantData)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ')
}
</script>

<template>
  <div class="analytics-page">
    <div class="analytics-container">

      <!-- Page Header -->
      <div class="analytics-header">
        <div>
          <router-link to="/dashboard" class="back-link">← Back to Dashboard</router-link>
          <h1 class="page-title">Quiz Analytics</h1>
          <p class="page-subtitle" v-if="analytics">{{ analytics.quizTitle }} (ID: {{ analytics.quizId }})</p>
        </div>
        <button @click="fetchAnalytics" class="btn btn-outline btn-sm">
          🔄 Refresh Data
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading analytics and metrics...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p>⚠️ {{ error }}</p>
        <button @click="fetchAnalytics" class="btn btn-outline btn-sm mt-12">Retry</button>
      </div>

      <template v-else-if="analytics">
        <!-- Key Metrics Cards -->
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="metric-label">Total Attempts</span>
            <span class="metric-val">{{ analytics.totalAttempts }}</span>
            <span class="metric-sub">Total quiz starts</span>
          </div>

          <div class="metric-card">
            <span class="metric-label">Completed Attempts</span>
            <span class="metric-val text-success">{{ analytics.completedAttempts }}</span>
            <span class="metric-sub">Full submissions</span>
          </div>

          <div class="metric-card">
            <span class="metric-label">Completion Rate</span>
            <span class="metric-val">{{ analytics.completionRate }}%</span>
            <span class="metric-sub">Finished / Started</span>
          </div>

          <div class="metric-card">
            <span class="metric-label">Average Score</span>
            <span class="metric-val text-primary">{{ analytics.avgScore }}%</span>
            <span class="metric-sub">Across all attempts</span>
          </div>

          <div class="metric-card">
            <span class="metric-label">Highest / Lowest</span>
            <span class="metric-val score-range">{{ analytics.highestScore }}% / {{ analytics.lowestScore }}%</span>
            <span class="metric-sub">Max / Min achieved</span>
          </div>

          <div class="metric-card">
            <span class="metric-label">Avg Completion Time</span>
            <span class="metric-val">{{ formatDuration(analytics.avgCompletionTime) }}</span>
            <span class="metric-sub">Time spent on quiz</span>
          </div>
        </div>

        <!-- Question Performance Breakdown Table -->
        <div class="analytics-section">
          <div class="section-header">
            <h2>Question Performance Breakdown</h2>
            <p>Identify which questions participants found easiest or hardest.</p>
          </div>

          <div class="table-card">
            <div class="table-responsive">
              <table class="analytics-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question Text</th>
                    <th>Total Answered</th>
                    <th>Correct %</th>
                    <th>Incorrect %</th>
                    <th>Difficulty Bar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="q in analytics.questionPerformance" :key="q.questionId">
                    <td><strong>Q{{ q.order }}</strong></td>
                    <td class="q-text-cell">{{ q.questionText }}</td>
                    <td>{{ q.totalAnswered }}</td>
                    <td><span class="badge-success">{{ q.correctPct }}%</span></td>
                    <td><span class="badge-danger">{{ q.incorrectPct }}%</span></td>
                    <td class="progress-cell">
                      <div class="performance-bar">
                        <div class="bar-correct" :style="{ width: `${q.correctPct}%` }"></div>
                        <div class="bar-incorrect" :style="{ width: `${q.incorrectPct}%` }"></div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Recent Attempts List Table -->
        <div class="analytics-section mt-40">
          <div class="section-header">
            <h2>Recent Attempts ({{ analytics.recentAttempts.length }})</h2>
          </div>

          <div v-if="analytics.recentAttempts.length === 0" class="empty-attempts">
            <p>No attempts recorded yet for this quiz.</p>
          </div>

          <div v-else class="table-card">
            <div class="table-responsive">
              <table class="analytics-table">
                <thead>
                  <tr>
                    <th>Participant Information</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Time Spent</th>
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="att in analytics.recentAttempts" :key="att.attemptId">
                    <td>
                      <div class="participant-info-cell">
                        {{ getParticipantSummary(att.participantData) }}
                      </div>
                    </td>
                    <td>
                      <strong>{{ att.correctCount }} / {{ att.totalQuestions }}</strong>
                    </td>
                    <td>
                      <span :class="['score-pill', att.percentage >= 70 ? 'pill-high' : att.percentage >= 40 ? 'pill-med' : 'pill-low']">
                        {{ att.percentage }}%
                      </span>
                    </td>
                    <td>{{ formatDuration(att.completionTimeSeconds) }}</td>
                    <td>{{ formatDate(att.submittedAt) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>

<style scoped>
.analytics-page {
  padding: 40px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.back-link {
  display: inline-block;
  color: var(--primary);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  margin-bottom: 8px;
}

.back-link:hover {
  text-decoration: underline;
}

.analytics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

.page-title {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--dark);
}

.page-subtitle {
  color: var(--gray-500);
  font-size: 0.95rem;
  font-family: monospace;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.metric-card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
}

.metric-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.metric-val {
  font-size: 1.85rem;
  font-weight: 900;
  color: var(--dark);
  line-height: 1.1;
}

.score-range {
  font-size: 1.35rem;
}

.metric-sub {
  font-size: 0.8rem;
  color: var(--gray-400);
  margin-top: 6px;
}

.text-success { color: var(--success); }
.text-primary { color: var(--primary); }

.analytics-section {
  margin-bottom: 32px;
}

.section-header {
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--dark);
}

.section-header p {
  font-size: 0.9rem;
  color: var(--gray-500);
}

.table-card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.table-responsive {
  overflow-x: auto;
}

.analytics-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.analytics-table th {
  background: var(--gray-50);
  padding: 14px 20px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--gray-200);
}

.analytics-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--gray-200);
  vertical-align: middle;
  font-size: 0.925rem;
}

.analytics-table tr:last-child td {
  border-bottom: none;
}

.q-text-cell {
  max-width: 300px;
  font-weight: 600;
}

.badge-success {
  background: #d1fae5;
  color: #065f46;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-weight: 700;
}

.badge-danger {
  background: #fee2e2;
  color: #991b1b;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-weight: 700;
}

.progress-cell {
  width: 160px;
}

.performance-bar {
  height: 10px;
  background: var(--gray-200);
  border-radius: 9999px;
  display: flex;
  overflow: hidden;
}

.bar-correct {
  background: var(--success);
  height: 100%;
}

.bar-incorrect {
  background: var(--danger);
  height: 100%;
}

.participant-info-cell {
  font-weight: 600;
  color: var(--dark);
}

.score-pill {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  font-weight: 800;
  font-size: 0.85rem;
}

.pill-high { background: #d1fae5; color: #065f46; }
.pill-med { background: #fef3c7; color: #92400e; }
.pill-low { background: #fee2e2; color: #991b1b; }

.empty-attempts {
  background: var(--white);
  border: 1px dashed var(--gray-300);
  padding: 32px;
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--gray-500);
}

.loading-state, .error-state {
  text-align: center;
  padding: 60px 0;
}

.mt-12 { margin-top: 12px; }
.mt-40 { margin-top: 40px; }
</style>
