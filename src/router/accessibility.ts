import { nextTick } from 'vue'
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router'

const applicationName = 'iRead'

export function resolveDocumentTitle(title: unknown): string {
  if (typeof title !== 'string' || title.trim() === '') return applicationName
  return `${title.trim()} | ${applicationName}`
}

function routeFocusTarget(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('[data-route-focus]') ??
    document.querySelector<HTMLElement>('main h1') ??
    document.querySelector<HTMLElement>('h1') ??
    document.getElementById('main-content')
  )
}

export async function focusRouteContent(): Promise<void> {
  await nextTick()
  const target = routeFocusTarget()
  if (!target) return

  if (!target.matches('a, button, input, select, textarea, [tabindex]')) {
    target.setAttribute('tabindex', '-1')
  }
  target.focus()
}

export function updateDocumentTitle(route: RouteLocationNormalizedLoaded): void {
  document.title = resolveDocumentTitle(route.meta.title)
}

export function installRouteAccessibility(router: Router): void {
  router.afterEach((to, from, failure) => {
    if (failure) return
    updateDocumentTitle(to)
    if (to.path === from.path) return
    void focusRouteContent()
  })
}
