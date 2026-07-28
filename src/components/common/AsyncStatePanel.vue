<script setup lang="ts">
import { computed } from 'vue'
import { CircleAlert, FileQuestion, Inbox, LoaderCircle, ShieldAlert } from '@lucide/vue'
import { Button } from '@/components/ui/button'

export type AsyncStatePanelKind = 'loading' | 'empty' | 'error' | 'forbidden' | 'not-found'

const props = withDefaults(
  defineProps<{
    kind: AsyncStatePanelKind
    title?: string
    message: string
    retryLabel?: string
    actionLabel?: string
    compact?: boolean
  }>(),
  {
    title: undefined,
    retryLabel: undefined,
    actionLabel: undefined,
    compact: false,
  },
)

const emit = defineEmits<{
  retry: []
  action: []
}>()

const defaultTitles: Record<AsyncStatePanelKind, string> = {
  loading: '불러오는 중입니다',
  empty: '표시할 내용이 없습니다',
  error: '정보를 불러오지 못했습니다',
  forbidden: '접근 권한이 없습니다',
  'not-found': '요청한 정보를 찾을 수 없습니다',
}

const icons = {
  loading: LoaderCircle,
  empty: Inbox,
  error: CircleAlert,
  forbidden: ShieldAlert,
  'not-found': FileQuestion,
}

const resolvedTitle = computed(() => props.title ?? defaultTitles[props.kind])
const icon = computed(() => icons[props.kind])
const role = computed(() =>
  ['error', 'forbidden', 'not-found'].includes(props.kind) ? 'alert' : 'status',
)
const ariaLive = computed(() => (role.value === 'alert' ? 'assertive' : 'polite'))
const showActions = computed(
  () => props.kind !== 'loading' && Boolean(props.retryLabel || props.actionLabel),
)
</script>

<template>
  <section
    class="async-state-panel"
    :class="[`is-${kind}`, { 'is-compact': compact }]"
    :data-kind="kind"
    :role="role"
    :aria-live="ariaLive"
    :aria-busy="kind === 'loading' ? 'true' : undefined"
  >
    <span class="async-state-panel__icon" aria-hidden="true">
      <component :is="icon" :size="compact ? 22 : 26" />
    </span>

    <div class="async-state-panel__content">
      <p class="async-state-panel__title">{{ resolvedTitle }}</p>
      <p class="async-state-panel__message">{{ message }}</p>
      <slot />
    </div>

    <div v-if="showActions" class="async-state-panel__actions">
      <Button v-if="retryLabel" type="button" variant="outline" @click="emit('retry')">
        {{ retryLabel }}
      </Button>
      <Button v-if="actionLabel" type="button" @click="emit('action')">
        {{ actionLabel }}
      </Button>
    </div>
  </section>
</template>

<style scoped>
.async-state-panel {
  display: grid;
  min-height: 180px;
  align-content: center;
  justify-items: center;
  gap: 14px;
  padding: 32px 24px;
  border: 1px dashed var(--slate-300);
  border-radius: var(--radius-lg);
  background: var(--white);
  color: var(--slate-700);
  text-align: center;
}

.async-state-panel.is-compact {
  min-height: 112px;
  grid-template-columns: auto minmax(0, 1fr);
  align-content: center;
  justify-items: start;
  gap: 10px 12px;
  padding: 18px;
  text-align: left;
}

.async-state-panel__icon {
  display: grid;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--slate-100);
  color: var(--slate-500);
  place-items: center;
}

.is-compact .async-state-panel__icon {
  width: 38px;
  height: 38px;
}

.is-loading .async-state-panel__icon {
  background: var(--primary-50);
  color: var(--primary-700);
}

.is-loading .async-state-panel__icon :deep(svg) {
  animation: async-state-spin 900ms linear infinite;
}

.is-error .async-state-panel__icon,
.is-forbidden .async-state-panel__icon,
.is-not-found .async-state-panel__icon {
  background: color-mix(in oklch, var(--danger-600) 10%, white);
  color: var(--danger-600);
}

.async-state-panel__content {
  display: grid;
  max-width: 520px;
  gap: 5px;
}

.async-state-panel__title,
.async-state-panel__message {
  margin: 0;
}

.async-state-panel__title {
  color: var(--slate-950);
  font-size: 15px;
  font-weight: 750;
}

.async-state-panel__message {
  color: var(--slate-500);
  font-size: 13px;
  line-height: 1.55;
}

.async-state-panel__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.is-compact .async-state-panel__actions {
  grid-column: 2;
  justify-content: flex-start;
}

@keyframes async-state-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-loading .async-state-panel__icon :deep(svg) {
    animation: none;
  }
}
</style>
