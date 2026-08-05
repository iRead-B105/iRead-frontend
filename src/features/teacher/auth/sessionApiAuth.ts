import type { Router } from 'vue-router'
import type { ApiAuthHooks } from '@/lib/api'
import type { useSessionStore } from '@/stores/session'

type SessionStore = ReturnType<typeof useSessionStore>

export function createSessionApiAuthHooks(
  sessionStore: SessionStore,
  router: Router,
): ApiAuthHooks {
  let loginRedirectPromise: Promise<void> | null = null

  async function redirectProtectedRouteToLogin(): Promise<void> {
    if (loginRedirectPromise) return loginRedirectPromise

    const currentRoute = router.currentRoute.value
    const isProtectedRoute = currentRoute.matched.some(
      (record) => record.meta.requiresAuth === true,
    )
    if (!isProtectedRoute) return

    const redirectTask = router
      .replace({
        name: 'teacher-login',
        query: { redirect: currentRoute.fullPath },
      })
      .then(() => undefined)

    loginRedirectPromise = redirectTask
    try {
      await redirectTask
    } finally {
      if (loginRedirectPromise === redirectTask) {
        loginRedirectPromise = null
      }
    }
  }

  return {
    getAccessToken: () => sessionStore.accessToken,
    onUnauthorized: async (_error, context) => {
      const recovered = await sessionStore.handleUnauthorized(context.requestRetried)

      if (!recovered) {
        await redirectProtectedRouteToLogin()
      }

      return recovered
    },
  }
}
