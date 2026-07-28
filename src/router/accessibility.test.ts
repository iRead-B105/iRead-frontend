import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import {
  installRouteAccessibility,
  resolveDocumentTitle,
} from './accessibility'

function createTestRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: { template: '<div />' },
      },
      {
        path: '/dashboard',
        component: { template: '<div />' },
        meta: { title: '대시보드' },
      },
    ],
  })
  installRouteAccessibility(router)
  return router
}

describe('route accessibility', () => {
  it('route meta로 문서 제목을 구성한다', () => {
    expect(resolveDocumentTitle('대시보드')).toBe('대시보드 | iRead')
    expect(resolveDocumentTitle(undefined)).toBe('iRead')
  })

  it('route 이동 후 문서 제목을 갱신하고 h1으로 focus를 옮긴다', async () => {
    document.body.innerHTML = '<main><h1>대시보드</h1></main>'
    const heading = document.querySelector('h1') as HTMLHeadingElement
    const router = createTestRouter()

    await router.push('/dashboard')
    await nextTick()
    await nextTick()

    expect(document.title).toBe('대시보드 | iRead')
    expect(heading.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(heading)
  })
})
