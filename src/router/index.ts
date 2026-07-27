// createRouter는 URL과 화면의 연결표를 만들고, createWebHistory는 일반적인 주소 형식을 사용하게 합니다.
import { createRouter, createWebHistory } from 'vue-router'
import type { Router } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const publicAuthenticationRoutes = new Set([
  'teacher-login',
  'teacher-signup',
  'teacher-reset-password',
])

export function resolveTeacherRedirect(routerInstance: Router, redirect: unknown): string {
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return '/teacher/dashboard'
  }

  const resolved = routerInstance.resolve(redirect)
  const isProtectedTeacherRoute = resolved.matched.some(
    (record) => record.meta.requiresAuth === true,
  )

  return isProtectedTeacherRoute ? resolved.fullPath : '/teacher/dashboard'
}

// 앱 전체의 '페이지 이동 규칙표'입니다.
const router = createRouter({
  // Vite의 배포 기본 경로를 기준으로 브라우저의 앞/뒤 이동 기록을 관리합니다.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 사이트 첫 주소에서는 교수자 로그인을 먼저 안내합니다.
    { path: '/', redirect: '/login' },
    {
      path: '/login',
      name: 'teacher-login',
      component: () => import('@/views/teacher/TeacherLoginView.vue'),
    },
    {
      path: '/signup',
      name: 'teacher-signup',
      component: () => import('@/views/teacher/TeacherSignupView.vue'),
    },
    {
      path: '/reset-password',
      name: 'teacher-reset-password',
      component: () => import('@/views/teacher/TeacherResetPasswordView.vue'),
    },
    {
      path: '/teacher',
      // import()는 해당 화면이 필요할 때 파일을 내려받는 '지연 로딩' 방식입니다.
      component: () => import('@/layouts/TeacherLayout.vue'),
      meta: { requiresAuth: true },
      // children은 /teacher 뒤에 이어질 하위 주소이며 부모 레이아웃 안에 표시됩니다.
      children: [
        {
          path: 'dashboard',
          name: 'teacher-dashboard',
          component: () => import('@/views/teacher/TeacherDashboardView.vue'),
          // meta는 화면 제목과 현재 활성 메뉴를 알려 주는 부가 정보입니다.
          meta: { title: '대시보드', section: 'dashboard' },
        },
        {
          path: 'students',
          name: 'teacher-students',
          component: () => import('@/views/teacher/TeacherDashboardView.vue'),
          meta: { title: '아동 목록', section: 'students' },
        },
        {
          path: 'students/new',
          name: 'student-create',
          component: () => import('@/views/teacher/StudentCreateView.vue'),
          meta: { title: '아동 관리', section: 'students' },
        },
        {
          // :id는 아동마다 달라지는 주소 부분입니다. 예: students/1/edit
          path: 'students/:id/edit',
          name: 'student-edit',
          component: () => import('@/views/teacher/StudentEditView.vue'),
          meta: { title: '아동 관리', section: 'students' },
        },
        {
          path: 'students/:id',
          component: () => import('@/layouts/StudentManagementLayout.vue'),
          meta: { title: '아동 관리', section: 'students' },
          children: [
            {
              // 빈 path는 부모 주소와 정확히 같은 경우 표시되는 기본 아동 화면입니다.
              path: '',
              name: 'student-overview',
              component: () => import('@/views/teacher/StudentOverviewView.vue'),
            },
            {
              path: 'curriculum',
              name: 'student-curriculum',
              component: () => import('@/views/teacher/StudentCurriculumView.vue'),
            },
            {
              path: 'training-history',
              name: 'student-training-history',
              component: () => import('@/views/teacher/StudentTrainingHistoryView.vue'),
            },
            {
              path: 'test-history',
              name: 'student-test-history',
              component: () => import('@/views/teacher/StudentTestHistoryView.vue'),
            },
            {
              path: 'report',
              name: 'student-report',
              component: () => import('@/views/teacher/StudentReportView.vue'),
            },
          ],
        },
        {
          path: 'settings',
          name: 'teacher-settings',
          component: () => import('@/views/teacher/TeacherSettingsView.vue'),
          meta: { title: '프로필 관리', section: 'settings' },
        },
      ],
    },
    // 위 규칙에 없는 주소는 로그인 화면으로 보냅니다.
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
})

export function installAuthenticationGuard(routerInstance: Router): void {
  routerInstance.beforeEach(async (to) => {
    const sessionStore = useSessionStore()
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth === true)

    if (requiresAuth) {
      const authenticated = await sessionStore.restoreSession()
      if (!authenticated) {
        return { name: 'teacher-login', query: { redirect: to.fullPath } }
      }
    }

    if (publicAuthenticationRoutes.has(String(to.name)) && sessionStore.authenticated) {
      return { name: 'teacher-dashboard' }
    }

    return true
  })
}

installAuthenticationGuard(router)

// main.ts가 이 라우터를 앱 전체에 등록할 수 있도록 공개합니다.
export default router
