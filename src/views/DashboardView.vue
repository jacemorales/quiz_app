<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useQuizStore } from '../composables/useQuizStore'

const router = useRouter()
const { user } = useAuth()
const { getUserQuizzes, getUserDashboardStats, deleteQuiz } = useQuizStore()

const quizzes = ref([])
const stats = ref({
  totalQuizzes: 0,
  activeQuizzes: 0,
  totalAttempts: 0,
  totalCompleted: 0,
  avgScore: 0,
  mostPopularQuiz: null,
  recentActivity: []
})

const loading = ref(true)
const error = ref('')

// Delete Modal State
const showDeleteModal = ref(false)
const quizToDelete = ref(null)
const deleting = ref(false)

// Toast Notification
const toastMessage = ref('')

function showToast(msg) {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

function fetchDashboardData() {
  loading.value = true
  error.value = ''
  try {
    if (!user.value) {
      router.push('/login')
      return
    }
    quizzes.value = getUserQuizzes(user.value.userId)
    stats.value = getUserDashboardStats(user.value.userId)
  } catch (err) {
    error.value = err.message || 'Error loading dashboard'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
})

function copyQuizUrl(quizId) {
  const url = `${window.location.origin}/quiz/${quizId}`
  navigator.clipboard.writeText(url).then(() => {
    showToast('Quiz URL copied to clipboard!')
  }).catch(() => {
    showToast('Failed to copy URL')
  })
}

function confirmDelete(quiz) {
  quizToDelete.value = quiz
  showDeleteModal.value = true
}

function cancelDelete() {
  quizToDelete.value = null
  showDeleteModal.value = false
}

function handleDeleteQuiz() {
  if (!quizToDelete.value || !user.value) return
  deleting.value = true
  try {
    deleteQuiz(quizToDelete.value.quizId, user.value.userId)
    showToast('Quiz deleted successfully')
    showDeleteModal.value = false
    quizToDelete.value = null
    fetchDashboardData()
  } catch (err) {
    alert(err.message || 'Failed to delete quiz')
  } finally {
    deleting.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="dashboard-page">
    <div class="dashboard-container">
      <!-- Toast Notification -->
      <transition name="fade">
        <div v-if="toastMessage" class="toast-notification">
          ✨ {{ toastMessage }}
        </div>
      </transition>

      <!-- Dashboard Header -->
      <div class="dashboard-header">
        <div>
          <h1 class="page-title">Creator Dashboard</h1>
          <p class="page-subtitle">Manage your quizzes, view analytics, and track participant activity</p>
        </div>
        <router-link to="/create-quiz" class="btn btn-primary btn-lg">
          + Create Quiz
        </router-link>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading dashboard analytics...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p>⚠️ {{ error }}</p>
        <button @click="fetchDashboardData" class="btn btn-outline btn-sm">Retry</button>
      </div>

      <template v-else>
        <!-- Statistics Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon icon-primary">📝</div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.totalQuizzes }}</span>
              <span class="stat-label">Total Quizzes</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon icon-success">⚡</div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.activeQuizzes }}</span>
              <span class="stat-label">Active Quizzes</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon icon-warning">👥</div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.totalAttempts }}</span>
              <span class="stat-label">Total Attempts</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon icon-info">✅</div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.totalCompleted }}</span>
              <span class="stat-label">Completed Quizzes</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon icon-purple">🎯</div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.avgScore }}%</span>
              <span class="stat-label">Average Score</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon icon-popular">⭐</div>
            <div class="stat-content">
              <span class="stat-value popular-title">
                {{ stats.mostPopularQuiz ? stats.mostPopularQuiz.title : 'None' }}
              </span>
              <span class="stat-label">
                Most Popular Quiz
                <template v-if="stats.mostPopularQuiz">({{ stats.mostPopularQuiz.attemptCount }} attempts)</template>
              </span>
            </div>
          </div>
        </div>

        <!-- Quizzes Table / Cards -->
        <div class="quiz-section">
          <div class="section-header">
            <h2>Your Quizzes</h2>
            <span class="quiz-count-badge">{{ quizzes.length }} Quizzes</span>
          </div>

          <!-- Empty State -->
          <div v-if="quizzes.length === 0" class="empty-state">
            <div class="empty-icon">📂</div>
            <h3>No quizzes yet</h3>
            <p>Create your first quiz and share it with your audience to start collecting responses.</p>
            <router-link to="/create-quiz" class="btn btn-primary btn-lg mt-16">
              + Create Your First Quiz
            </router-link>
          </div>

          <!-- Quiz Cards / Table -->
          <div v-else class="table-card">
            <div class="table-responsive">
              <table class="quiz-table">
                <thead>
                  <tr>
                    <th>Quiz Title</th>
                    <th>Quiz ID</th>
                    <th>Created</th>
                    <th>Questions</th>
                    <th>Attempts</th>
                    <th>Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="quiz in quizzes" :key="quiz.quizId">
                    <td class="quiz-title-cell">
                      <div class="quiz-title">{{ quiz.title }}</div>
                      <div class="quiz-desc" v-if="quiz.description">{{ quiz.description }}</div>
                    </td>
                    <td>
                      <code class="quiz-id-badge" @click="copyQuizUrl(quiz.quizId)" title="Click to copy share URL">
                        {{ quiz.quizId }}
                      </code>
                    </td>
                    <td>{{ formatDate(quiz.createdAt) }}</td>
                    <td><span class="badge-neutral">{{ quiz.questionCount }}</span></td>
                    <td><span class="badge-accent">{{ quiz.attemptCount }}</span></td>
                    <td>
                      <span :class="['badge', quiz.status === 'active' ? 'badge-active' : 'badge-draft']">
                        {{ quiz.status }}
                      </span>
                    </td>
                    <td class="text-right">
                      <div class="action-buttons">
                        <button @click="copyQuizUrl(quiz.quizId)" class="btn btn-outline btn-sm" title="Copy Share Link">
                          📋 Share
                        </button>
                        <router-link :to="`/quiz/${quiz.quizId}/analytics`" class="btn btn-outline btn-sm">
                          📊 Analytics
                        </router-link>
                        <router-link :to="`/edit-quiz/${quiz.quizId}`" class="btn btn-outline btn-sm">
                          ✏️ Edit
                        </router-link>
                        <button @click="confirmDelete(quiz)" class="btn btn-danger btn-sm">
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Recent Activity Section -->
        <div v-if="stats.recentActivity && stats.recentActivity.length > 0" class="activity-section">
          <div class="section-header">
            <h2>Recent Quiz Activity</h2>
          </div>
          <div class="activity-card">
            <ul class="activity-list">
              <li v-for="act in stats.recentActivity" :key="act.attemptId" class="activity-item">
                <div class="activity-icon">🎯</div>
                <div class="activity-info">
                  <span class="activity-text">
                    Someone completed <strong>{{ act.quizTitle }}</strong>
                  </span>
                  <span class="activity-time">{{ formatDate(act.submittedAt) }}</span>
                </div>
                <div class="activity-score">
                  Score: {{ act.score }} / {{ act.totalQuestions }}
                </div>
              </li>
            </ul>
          </div>
        </div>
      </template>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <span class="modal-icon text-danger">⚠️</span>
          <h3>Delete Quiz?</h3>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete <strong>"{{ quizToDelete?.title }}"</strong>?</p>
          <p class="subtext">This will permanently remove this quiz and its associated response data. This action cannot be undone.</p>
        </div>
        <div class="modal-actions">
          <button @click="cancelDelete" :disabled="deleting" class="btn btn-outline">
            Cancel
          </button>
          <button @click="handleDeleteQuiz" :disabled="deleting" class="btn btn-danger">
            <span v-if="deleting">Deleting...</span>
            <span v-else>Delete Quiz</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  padding: 40px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.toast-notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--dark);
  color: var(--white);
  padding: 12px 20px;
  border-radius: var(--radius);
  font-weight: 600;
  box-shadow: var(--shadow-lg);
  z-index: 2000;
}

.dashboard-header {
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
  font-size: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.icon-primary { background: #f0fdf4; }
.icon-success { background: #d1fae5; }
.icon-warning { background: #fef3c7; }
.icon-info { background: #e0f2fe; }
.icon-purple { background: #f3e8ff; }
.icon-popular { background: #fce7f3; }

.stat-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--dark);
  line-height: 1.2;
}

.popular-title {
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--gray-500);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

.quiz-section, .activity-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--dark);
}

.quiz-count-badge {
  background: var(--gray-200);
  color: var(--gray-700);
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 600;
}

.empty-state {
  background: var(--white);
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-lg);
  padding: 60px 24px;
  text-align: center;
}

.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--dark);
  margin-bottom: 8px;
}

.empty-state p {
  color: var(--gray-500);
  max-width: 480px;
  margin: 0 auto;
}

.mt-16 {
  margin-top: 16px;
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

.quiz-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.quiz-table th {
  background: var(--gray-50);
  padding: 14px 20px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--gray-200);
}

.quiz-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--gray-200);
  vertical-align: middle;
  font-size: 0.925rem;
}

.quiz-table tr:last-child td {
  border-bottom: none;
}

.quiz-title-cell {
  max-width: 260px;
}

.quiz-title {
  font-weight: 700;
  color: var(--dark);
}

.quiz-desc {
  font-size: 0.825rem;
  color: var(--gray-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quiz-id-badge {
  background: var(--gray-100);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.825rem;
  color: var(--primary);
  cursor: pointer;
}

.quiz-id-badge:hover {
  background: var(--primary-light);
}

.badge-neutral {
  background: var(--gray-100);
  color: var(--gray-700);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.badge-accent {
  background: #e0f2fe;
  color: #0369a1;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.text-right {
  text-align: right;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.activity-card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.activity-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--gray-100);
}

.activity-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.activity-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.activity-text {
  font-size: 0.925rem;
  color: var(--gray-800);
}

.activity-time {
  font-size: 0.8rem;
  color: var(--gray-400);
}

.activity-score {
  font-weight: 700;
  color: var(--success);
  background: #d1fae5;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.85rem;
}

/* Modal Styling */
.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.modal-header h3 {
  font-size: 1.35rem;
  font-weight: 800;
}

.modal-icon {
  font-size: 1.8rem;
}

.modal-body {
  margin-bottom: 24px;
}

.modal-body p {
  font-size: 1rem;
  color: var(--gray-700);
  margin-bottom: 8px;
}

.modal-body .subtext {
  font-size: 0.875rem;
  color: var(--gray-500);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.loading-state, .error-state {
  text-align: center;
  padding: 60px 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--gray-200);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
