<script setup lang="ts">
// 교수자 화면을 좌측 사이드바와 우측 메인 영역으로 나누는 공통 레이아웃입니다.
import { RouterView } from 'vue-router'
import DataSourceNotice from '@/components/common/DataSourceNotice.vue'
import TeacherSidebar from '@/components/teacher/TeacherSidebar.vue'
import { dataSource } from '@/config/dataSource'
</script>

<template>
  <!-- shell은 교수자 페이지 전체를 감싸는 가장 바깥 컨테이너입니다. -->
  <div class="teacher-shell">
    <a class="skip-link" href="#main-content">본문으로 건너뛰기</a>
    <TeacherSidebar />
    <main id="main-content" class="teacher-content" tabindex="-1">
      <DataSourceNotice :data-source="dataSource" />
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* scoped는 아래 CSS가 이 컴포넌트 내부 요소에만 적용되도록 범위를 제한합니다. */
.teacher-shell {
  display: grid;
  width: 100%;
  min-height: 100vh;
  min-width: 0;
  align-items: start;
  background: var(--content-background);
  grid-template-columns: 224px minmax(0, 1fr);
}

.teacher-content {
  width: 100%;
  min-height: 100vh;
  min-width: 0;
  padding: 28px 36px 48px;
  background: var(--content-background);
}

.skip-link {
  position: fixed;
  z-index: 100;
  top: 12px;
  left: 12px;
  padding: 10px 14px;
  border: 2px solid var(--primary-700);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--primary-700);
  font-weight: 800;
  transform: translateY(calc(-100% - 24px));
}

.skip-link:focus {
  transform: translateY(0);
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
    padding: 18px 14px 32px;
  }
}
</style>
