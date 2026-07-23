<script setup lang="ts">
// 부모 레이아웃이 전달한 현재 페이지 제목을 문자열 props로 받습니다.
defineProps<{ title: string }>()
</script>

<template>
  <!-- 교수자 영역의 모든 페이지에 고정적으로 나타나는 상단 헤더입니다. -->
  <header class="teacher-header">
    <div class="teacher-header__logo-frame">
      <img src="/images/iread-logo.png" alt="iRead" class="teacher-header__logo" />
    </div>
    <!-- 이중 중괄호는 title 값을 안전한 텍스트로 화면에 출력하는 Vue 문법입니다. -->
    <h1>{{ title }}</h1>
    <div class="teacher-header__account">
      <span class="teacher-header__status"></span>
      교수자 모드
    </div>
  </header>
</template>

<style scoped>
.teacher-header {
  /* sticky는 스크롤해도 상단에 붙게 하고, z-index는 본문보다 위에 보이게 합니다. */
  position: sticky;
  z-index: 20;
  top: 0;
  display: grid;
  height: var(--header-height);
  align-items: center;
  padding: 0 28px;
  border-bottom: 1px solid var(--slate-200);
  background: rgba(255, 255, 255, 0.96);
  /* 좌우 폭을 같게 하여 가운데 제목이 화면 중심에 오도록 합니다. */
  grid-template-columns: 180px 1fr 180px;
  backdrop-filter: blur(14px);
}

.teacher-header__logo-frame {
  display: grid;
  width: 112px;
  height: 58px;
  place-items: center;
  overflow: hidden;
}

.teacher-header__logo {
  width: 96px;
  height: 56px;
  max-width: none;
  object-fit: contain;
  transform: scale(1.85);
}

.teacher-header h1 {
  margin: 0;
  font-size: 22px;
  text-align: center;
}

.teacher-header__account {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  color: var(--slate-500);
  font-size: 13px;
  font-weight: 700;
}

.teacher-header__status {
  /* 작은 초록 점과 바깥 그림자로 현재 사용 가능 상태를 시각화합니다. */
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success-600);
  box-shadow: 0 0 0 4px #dcfce7;
}
</style>
