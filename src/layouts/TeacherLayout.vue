<script setup lang="ts">
// 교수자 화면을 좌측 사이드바와 우측 메인 영역으로 나누는 공통 레이아웃입니다.
import { RouterView } from 'vue-router'
import TeacherSidebar from '@/components/teacher/TeacherSidebar.vue'
</script>

<template>
  <!-- shell은 교수자 페이지 전체를 감싸는 가장 바깥 컨테이너입니다. -->
  <div class="teacher-shell">
    <TeacherSidebar />
    <main class="teacher-content"><RouterView /></main>
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
</style>
