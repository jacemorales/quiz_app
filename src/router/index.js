import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'

import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import DashboardView from '../views/DashboardView.vue'
import CreateQuizView from '../views/CreateQuizView.vue'
import PublicQuizView from '../views/PublicQuizView.vue'
import AnalyticsView from '../views/AnalyticsView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guestOnly: true }
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
    meta: { guestOnly: true }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  {
    path: '/create-quiz',
    name: 'create-quiz',
    component: CreateQuizView,
    meta: { requiresAuth: true }
  },
  {
    path: '/edit-quiz/:quizId',
    name: 'edit-quiz',
    component: CreateQuizView,
    meta: { requiresAuth: true }
  },
  {
    path: '/quiz/:quizId',
    name: 'public-quiz',
    component: PublicQuizView
  },
  {
    path: '/quiz/:quizId/analytics',
    name: 'quiz-analytics',
    component: AnalyticsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const { user, checkAuth } = useAuth()

  if (!user.value) {
    checkAuth()
  }

  if (to.meta.requiresAuth && !user.value) {
    return next({ name: 'login' })
  }

  if (to.meta.guestOnly && user.value) {
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
