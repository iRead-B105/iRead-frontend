import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'

export const REALTIME_FRESHNESS_WARNING_DELAY_MS = 3_000

export type RealtimeFreshnessScope = 'global' | 'visible'

interface ScopeState {
  generation: number
  pending: boolean
  stale: boolean
  unhealthySince: number | null
  lastSuccessfulAt: number | null
}

function initialScopeState(): ScopeState {
  return {
    generation: 0,
    pending: false,
    stale: false,
    unhealthySince: null,
    lastSuccessfulAt: null,
  }
}

export const useRealtimeFreshnessStore = defineStore('realtimeFreshness', () => {
  const activeContextKey = ref<string | null>(null)
  const expectedScopes = ref<RealtimeFreshnessScope[]>([])
  const retryRequestVersion = ref(0)
  const retrying = ref(false)
  const scopes = reactive<Record<RealtimeFreshnessScope, ScopeState>>({
    global: initialScopeState(),
    visible: initialScopeState(),
  })
  const warningTimers = new Map<RealtimeFreshnessScope, ReturnType<typeof setTimeout>>()

  const warningVisible = computed(
    () =>
      activeContextKey.value !== null && expectedScopes.value.some((scope) => scopes[scope].stale),
  )
  const lastSuccessfulAt = computed<number | null>(() => {
    const staleScopes = expectedScopes.value.filter((scope) => scopes[scope].stale)
    const relevantScopes = staleScopes.length > 0 ? staleScopes : expectedScopes.value
    const values = relevantScopes
      .map((scope) => scopes[scope].lastSuccessfulAt)
      .filter((value): value is number => value !== null)
    return values.length === 0 ? null : Math.min(...values)
  })

  function clearWarningTimer(scope: RealtimeFreshnessScope): void {
    const timer = warningTimers.get(scope)
    if (timer !== undefined) {
      clearTimeout(timer)
      warningTimers.delete(scope)
    }
  }

  function resetScope(scope: RealtimeFreshnessScope): void {
    clearWarningTimer(scope)
    Object.assign(scopes[scope], initialScopeState())
  }

  function scheduleWarning(scope: RealtimeFreshnessScope, contextKey: string): void {
    clearWarningTimer(scope)
    const state = scopes[scope]
    if (state.unhealthySince === null || state.stale) return
    const delay = Math.max(
      0,
      REALTIME_FRESHNESS_WARNING_DELAY_MS - (Date.now() - state.unhealthySince),
    )
    if (delay === 0) {
      state.stale = true
      return
    }
    const timer = setTimeout(() => {
      warningTimers.delete(scope)
      if (
        activeContextKey.value === contextKey &&
        expectedScopes.value.includes(scope) &&
        scopes[scope].unhealthySince !== null
      ) {
        scopes[scope].stale = true
      }
    }, delay)
    warningTimers.set(scope, timer)
  }

  function setContext(
    contextKey: string | null,
    nextExpectedScopes: readonly RealtimeFreshnessScope[] = [],
  ): void {
    const normalizedScopes = [...nextExpectedScopes]
    const unchanged =
      activeContextKey.value === contextKey &&
      normalizedScopes.length === expectedScopes.value.length &&
      normalizedScopes.every((scope, index) => scope === expectedScopes.value[index])
    if (unchanged) return

    resetScope('global')
    resetScope('visible')
    activeContextKey.value = contextKey
    expectedScopes.value = normalizedScopes
    retrying.value = false
  }

  function beginRefresh(scope: RealtimeFreshnessScope, contextKey: string): number | null {
    if (activeContextKey.value !== contextKey || !expectedScopes.value.includes(scope)) {
      return null
    }

    const state = scopes[scope]
    state.generation += 1
    state.pending = true
    state.unhealthySince ??= Date.now()
    scheduleWarning(scope, contextKey)
    return state.generation
  }

  function markRefreshSuccess(
    scope: RealtimeFreshnessScope,
    contextKey: string,
    generation: number | null,
  ): void {
    if (
      generation === null ||
      activeContextKey.value !== contextKey ||
      scopes[scope].generation !== generation
    ) {
      return
    }

    clearWarningTimer(scope)
    const state = scopes[scope]
    state.pending = false
    state.stale = false
    state.unhealthySince = null
    state.lastSuccessfulAt = Date.now()
  }

  function markRefreshFailure(
    scope: RealtimeFreshnessScope,
    contextKey: string,
    generation: number | null,
  ): void {
    if (
      generation === null ||
      activeContextKey.value !== contextKey ||
      scopes[scope].generation !== generation
    ) {
      return
    }

    scopes[scope].pending = false
    scheduleWarning(scope, contextKey)
  }

  function requestRetry(): void {
    if (activeContextKey.value === null || retrying.value) return
    retrying.value = true
    retryRequestVersion.value += 1
  }

  function finishRetry(version: number): void {
    if (retryRequestVersion.value === version) retrying.value = false
  }

  function reset(): void {
    setContext(null)
    retryRequestVersion.value = 0
    retrying.value = false
  }

  return {
    activeContextKey,
    expectedScopes,
    retryRequestVersion,
    retrying,
    scopes,
    warningVisible,
    lastSuccessfulAt,
    setContext,
    beginRefresh,
    markRefreshSuccess,
    markRefreshFailure,
    requestRetry,
    finishRetry,
    reset,
  }
})
