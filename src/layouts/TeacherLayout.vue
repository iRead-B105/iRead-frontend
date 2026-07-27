<script setup lang="ts">
// 교수자 화면을 좌측 사이드바와 우측 메인 영역으로 나누는 공통 레이아웃입니다.
import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView } from 'vue-router'
import DataSourceNotice from '@/components/common/DataSourceNotice.vue'
import TeacherSidebar from '@/components/teacher/TeacherSidebar.vue'
import { dataSource } from '@/config/dataSource'
import { useSessionStore } from '@/stores/session'
import { useStudentStore } from '@/stores/students'
import { useTestStore } from '@/stores/test'
import { useTrainingStore } from '@/stores/training'

const sessionStore = useSessionStore()
const studentStore = useStudentStore()
const testStore = useTestStore()
const trainingStore = useTrainingStore()
const { status, teacher } = storeToRefs(sessionStore)

watch(
  () => teacher.value?.email ?? null,
  (nextEmail, previousEmail) => {
    if (previousEmail && nextEmail !== previousEmail) {
      studentStore.reset()
      testStore.reset()
      trainingStore.reset()
    }
  },
)
watch(status, (nextStatus) => {
  if (nextStatus === 'anonymous') {
    studentStore.reset()
    testStore.reset()
    trainingStore.reset()
  }
})
</script>

<template>
  <!-- shell은 교수자 페이지 전체를 감싸는 가장 바깥 컨테이너입니다. -->
  <div class="teacher-shell">
    <TeacherSidebar />
    <main class="teacher-content">
      <DataSourceNotice :data-source="dataSource" />
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* scoped는 아래 CSS가 이 컴포넌트 내부 요소에만 적용되도록 범위를 제한합니다. */
.teacher-shell {
  display: grid;
  min-height: 100vh;
  align-items: start;
  background: var(--content-background);
  grid-template-columns: 224px minmax(0, 1fr);
}

.teacher-content {
  min-height: 100vh;
  min-width: 0;
  padding: 28px 36px 48px;
  background: var(--content-background);
}

@media (max-width: 900px) {
  .teacher-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .teacher-content {
    min-height: auto;
    padding: 24px;
  }
}

@media (max-width: 640px) {
  .teacher-content {
    padding: 20px 16px 36px;
  }
}
</style>
