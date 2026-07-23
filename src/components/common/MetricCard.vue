<script setup lang="ts">
import { Card } from '@/components/ui/card'

// defineProps는 부모가 이 카드에 반드시 전달해야 할 데이터를 TypeScript로 선언합니다.
defineProps<{
  label: string
  value: string
  description: string
  // ?는 선택 입력값이며, tone에 따라 아이콘의 강조 색을 바꿉니다.
  tone?: 'primary' | 'sky' | 'warning'
}>()
</script>

<template>
  <!-- :class는 tone 값으로 metric-card--sky 같은 CSS 클래스 이름을 동적으로 만듭니다. -->
  <Card class="metric-card surface" :class="`metric-card--${tone ?? 'primary'}`">
    <!-- slot은 부모가 카드 안에 아이콘이나 문자를 자유롭게 넣을 수 있는 빈 자리입니다. -->
    <div class="metric-card__icon"><slot /></div>
    <div>
      <p>{{ label }}</p>
      <strong>{{ value }}</strong>
      <span>{{ description }}</span>
    </div>
  </Card>
</template>

<style scoped>
/* 카드 본문을 아이콘 열과 텍스트 열로 나누는 2열 Grid입니다. */
.metric-card {
  display: grid;
  align-items: center;
  gap: 16px;
  padding: 22px;
  grid-template-columns: 54px 1fr;
}

.metric-card__icon {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 16px;
  background: var(--primary-50);
  color: var(--primary-600);
  font-size: 23px;
  font-weight: 800;
}

.metric-card--sky .metric-card__icon {
  /* tone="sky"가 전달된 카드만 하늘색 계열로 덮어씁니다. */
  background: color-mix(in oklch, var(--primary) 14%, white);
  color: var(--primary-700);
}

.metric-card--warning .metric-card__icon {
  background: color-mix(in oklch, var(--chart-3) 18%, white);
  color: var(--warning-500);
}

.metric-card p {
  margin: 0 0 5px;
  color: var(--slate-500);
  font-size: 13px;
  font-weight: 700;
}

.metric-card strong {
  margin-right: 8px;
  font-size: 26px;
}

.metric-card span {
  color: var(--slate-500);
  font-size: 12px;
}
</style>
