<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const route = useRoute()
const router = useRouter()

// 메뉴 이름과 라우터의 고유 name을 한 배열로 관리해 template 중복을 줄입니다.
const tabs = [
  { label: '학습 현황', name: 'student-overview' },
  { label: '커리큘럼 관리', name: 'student-curriculum' },
  { label: '훈련 이력', name: 'student-training-history' },
  { label: '테스트 이력', name: 'student-test-history' },
  { label: '보고서', name: 'student-report' },
]

function selectTab(value: string | number) {
  const tab = tabs.find((item) => item.name === String(value))
  if (tab) router.push({ name: tab.name, params: { id: route.params.id ?? 1 } })
}
</script>

<template>
  <Tabs :model-value="String(route.name)" @update:model-value="selectTab">
    <TabsList class="student-tabs" aria-label="아동 관리 메뉴">
      <TabsTrigger v-for="tab in tabs" :key="tab.name" :value="tab.name">
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>

<style scoped>
.student-tabs {
  /* 탭들을 가로로 나열하고 공통 흰 배경과 테두리로 하나의 메뉴처럼 묶습니다. */
  display: flex;
  gap: 4px;
  margin-top: 12px;
  padding: 6px;
  border: 1px solid var(--slate-200);
  border-radius: 10px;
  background: var(--white);
}

.student-tabs :deep([data-slot='tabs-trigger']) {
  min-width: 112px;
  padding: 10px 14px;
  border-radius: 7px;
  color: var(--slate-500);
  font-weight: 700;
  text-align: center;
}

.student-tabs :deep([data-slot='tabs-trigger']:hover) {
  background: var(--slate-50);
  color: var(--slate-950);
}

.student-tabs :deep([data-slot='tabs-trigger'][data-active]) {
  background: var(--primary-50);
  color: var(--primary-700);
}
</style>
