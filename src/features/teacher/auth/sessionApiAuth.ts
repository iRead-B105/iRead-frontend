import type { Router } from 'vue-router'
import type { ApiAuthHooks } from '@/lib/api'
import type { useSessionStore } from '@/stores/session'

type SessionStore = ReturnType<typeof useSessionStore>

export function createSessionApiAuthHooks(
  sessionStore: SessionStore,
  router: Router,
): ApiAuthHooks {
  return {
    getAccessToken: () => sessionStore.accessToken,
    onUnauthorized: async (_error, context) => {
      const recovered = await sessionStore.handleUnauthorized(context.requestRetried)

      if (!recovered) {
        const currentRoute = router.currentRoute.value
        const isProtectedRoute = currentRoute.matched.some(
          (record) => record.meta.requiresAuth === true,
        )

        if (isProtectedRoute) {
          await router.replace({
            name: 'teacher-login',
            query: { redirect: currentRoute.fullPath },
          })
        }
      }

      return recovered
    },
  }
}
