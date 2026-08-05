// createRouter는 URL과 화면의 연결표를 만들고, createWebHistory는 일반적인 주소 형식을 사용하게 합니다.
import { createRouter, createWebHistory } from 'vue-router'
import type { Router } from 'vue-router'
import { installRouteAccessibility } from './accessibility'
import { useSessionStore } from '@/stores/session'

const publicAuthenticationRoutes = new Set([
  'teacher-login',
  'teacher-signup',
  'teacher-reset-password',
])

export function resolveTeacherRedirect(routerInstance: Router, redirect: unknown): string {
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return '/teacher/students'
  }

  const resolved = routerInstance.resolve(redirect)
  const isProtectedTeacherRoute = resolved.matched.some(
    (record) => record.meta.requiresAuth === true,
  )

  return isProtectedTeacherRoute ? resolved.fullPath : '/teacher/students'
}

// 앱 전체의 '페이지 이동 규칙표'입니다.
const router = createRouter({
  // Vite의 배포 기본 경로를 기준으로 브라우저의 앞/뒤 이동 기록을 관리합니다.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 사이트 첫 주소에서는 아이리드 서비스와 앱을 소개합니다.
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/LandingView.vue'),
      meta: { title: '아이마다 다른 읽기의 속도' },
    },
    {
      path: '/login',
      name: 'teacher-login',
      component: () => import('@/views/teacher/TeacherLoginView.vue'),
      meta: { title: '로그인' },
    },
    {
      path: '/signup',
      name: 'teacher-signup',
      component: () => import('@/views/teacher/TeacherSignupView.vue'),
      meta: { title: '회원가입' },
    },
    {
      path: '/reset-password',
      name: 'teacher-reset-password',
      component: () => import('@/views/teacher/TeacherResetPasswordView.vue'),
      meta: { title: '비밀번호 재설정' },
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
          redirect: { name: 'teacher-students' },
        },
        {
          path: 'students',
          name: 'teacher-students',
          component: () => import('@/views/teacher/TeacherStudentsView.vue'),
          meta: { title: '아동 목록', section: 'students' },
        },
        {
          path: 'students/new',
          name: 'student-create',
          component: () => import('@/views/teacher/StudentCreateView.vue'),
          meta: { title: '새 아동 등록', section: 'students' },
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
              meta: { title: '학습 현황' },
            },
            {
              path: 'edit',
              name: 'student-edit',
              component: () => import('@/views/teacher/StudentEditView.vue'),
              meta: { title: '아동 정보 관리' },
            },
            {
              path: 'curriculum',
              name: 'student-curriculum',
              component: () => import('@/views/teacher/StudentCurriculumView.vue'),
              meta: { title: '커리큘럼' },
            },
            {
              path: 'training-history',
              name: 'student-training-history',
              component: () => import('@/views/teacher/StudentTrainingHistoryView.vue'),
              meta: { title: '훈련 이력' },
            },
            {
              path: 'test-history',
              name: 'student-test-history',
              component: () => import('@/views/teacher/StudentTestHistoryView.vue'),
              meta: { title: '검사 이력' },
            },
            {
              path: 'story-history',
              name: 'student-story-history',
              component: () => import('@/views/teacher/StudentStoryHistoryView.vue'),
              meta: { title: '이야기 이력' },
            },
            {
              path: 'report',
              name: 'student-report',
              component: () => import('@/views/teacher/StudentReportView.vue'),
              meta: { title: '보고서' },
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
    // 위 규칙에 없는 주소는 서비스 소개 화면으로 보냅니다.
    { path: '/:pathMatch(.*)*', redirect: '/' },
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
      return { name: 'teacher-students' }
    }

    return true
  })
}

installAuthenticationGuard(router)
installRouteAccessibility(router)

// main.ts가 이 라우터를 앱 전체에 등록할 수 있도록 공개합니다.
export default router
