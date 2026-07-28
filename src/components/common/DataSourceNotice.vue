<script setup lang="ts">
import type { DataSource } from '@/config/env'

defineProps<{
  dataSource: DataSource
}>()
</script>

<template>
  <p v-if="dataSource === 'mock'" class="data-source-notice" role="status">
    Backend와 연동 전 입니다. 변경한 mock 데이터는 새로고침하면 초기화됩니다.
  </p>
</template>

<style scoped>
.data-source-notice {
  margin: 0 0 16px;
  padding: 9px 12px;
  border: 1px solid var(--amber-200, #fde68a);
  border-radius: var(--radius-sm);
  background: var(--amber-50, #fffbeb);
  color: var(--amber-900, #78350f);
  font-size: 12px;
  font-weight: 600;
}
</style>
