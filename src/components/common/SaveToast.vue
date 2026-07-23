<script setup lang="ts">
import { CheckCircle2 } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'

// visible은 표시 여부를 부모가 결정하고, message가 없으면 아래 기본 문구를 사용합니다.
withDefaults(
  defineProps<{
    visible: boolean
    message?: string
    showIcon?: boolean
    inline?: boolean
  }>(),
  {
    message: '변경 사항이 저장되었습니다.',
    showIcon: true,
    inline: false,
  },
)
</script>

<template>
  <!-- Transition은 요소가 생기고 사라질 때 아래 enter/leave CSS 애니메이션을 적용합니다. -->
  <Transition name="save-toast">
    <!-- v-if가 false면 HTML 자체를 제거합니다. role=status는 보조 기술에도 알림을 전달합니다. -->
    <Alert
      v-if="visible"
      class="save-toast"
      :class="{ 'save-toast--inline': inline }"
      role="status"
      aria-live="polite"
    >
      <CheckCircle2 v-if="showIcon" class="save-toast__icon" :size="20" aria-hidden="true" />
      <AlertDescription>{{ message }}</AlertDescription>
    </Alert>
  </Transition>
</template>

<style scoped>
.save-toast {
  /* position:absolute와 top/right로 부모 영역의 오른쪽 위에 떠 있는 알림을 만듭니다. */
  position: absolute;
  z-index: 2;
  top: 14px;
  right: 20px;
  display: flex;
  min-height: 46px;
  align-items: center;
  gap: 9px;
  padding: 11px 16px;
  border: 1px solid color-mix(in oklch, var(--secondary) 55%, white);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  background: color-mix(in oklch, var(--secondary) 18%, white);
  color: var(--secondary-foreground);
  font-size: 13px;
  font-weight: 700;
}

.save-toast__icon {
  color: var(--teal-500);
}

.save-toast--inline {
  position: static;
  min-height: 36px;
  padding: 7px 12px;
  border-radius: 7px;
  box-shadow: none;
  font-size: 12px;
}

.save-toast-enter-active,
.save-toast-leave-active {
  /* 나타남/사라짐 과정의 투명도와 위치 변화를 0.18초 동안 부드럽게 처리합니다. */
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.save-toast-enter-from,
.save-toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media print {
  /* 종이 또는 PDF로 인쇄할 때 순간 알림은 의미가 없으므로 숨깁니다. */
  .save-toast {
    display: none;
  }
}
</style>
