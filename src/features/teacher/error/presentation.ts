import type { AsyncStatePanelKind } from '@/components/common/AsyncStatePanel.vue'
import type { UiError } from './model'

export function asyncStateKind(error: UiError | null): AsyncStatePanelKind {
  if (error?.kind === 'forbidden') return 'forbidden'
  if (error?.kind === 'not-found') return 'not-found'
  return 'error'
}
