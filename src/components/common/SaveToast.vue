<script setup lang="ts">
import { computed } from 'vue'
import { Alert, AlertDescription } from '@/components/ui/alert'

const props = withDefaults(
  defineProps<{
    visible: boolean
    message?: string
    showIcon?: boolean
    inline?: boolean
    tone?: 'success' | 'error' | 'warning' | 'info'
  }>(),
  {
    message: '변경 사항이 저장되었습니다.',
    showIcon: false,
    inline: false,
    tone: undefined,
  },
)

const resolvedTone = computed(() => {
  if (props.tone) return props.tone
  const msg = props.message ?? ''
  if (/실패|오류|에러|없습니다|못했습니다|거부|제약|잘못된/.test(msg)) {
    return 'error'
  }
  return 'success'
})
</script>

<template>
  <Transition name="save-toast">
    <Alert
      v-if="visible"
      class="save-toast !w-auto"
      :class="[
        `save-toast--${resolvedTone}`,
        { 'save-toast--inline': inline }
      ]"
      :role="resolvedTone === 'error' ? 'alert' : 'status'"
      aria-live="polite"
    >
      <AlertDescription class="save-toast__desc">{{ message }}</AlertDescription>
    </Alert>
  </Transition>
</template>

<style scoped>
.save-toast {
  position: fixed;
  z-index: 9999;
  bottom: 36px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  width: auto;
  min-width: 200px;
  max-width: 420px;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  padding: 9px 20px;
  border: 1px solid #334155;
  border-radius: 9999px;
  box-shadow: 0 12px 28px -5px rgba(15, 23, 42, 0.3), 0 4px 6px -2px rgba(15, 23, 42, 0.15);
  background: #0f172a;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.save-toast--error {
  border-color: #f87171;
  background: #450a0a;
  color: #fef2f2;
}

.save-toast__desc {
  margin: 0;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}

.save-toast--error .save-toast__desc {
  color: #fef2f2;
}

.save-toast--inline {
  position: static;
  top: auto;
  bottom: auto;
  left: auto;
  transform: none;
  min-height: 34px;
  padding: 6px 12px;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  box-shadow: none;
  background: #f0fdf4;
  color: #166534;
  font-size: 12px;
}

.save-toast--inline .save-toast__desc {
  color: #166534;
  font-size: 12px;
}

.save-toast--inline.save-toast--error {
  border-color: #fca5a5;
  background: #fef2f2;
  color: #991b1b;
}

.save-toast--inline.save-toast--error .save-toast__desc {
  color: #991b1b;
}

.save-toast-enter-active,
.save-toast-leave-active {
  transition:
    opacity 240ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 240ms cubic-bezier(0.4, 0, 0.2, 1);
}

.save-toast-enter-from,
.save-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px) scale(0.95);
}

@media print {
  .save-toast {
    display: none;
  }
}
</style>

