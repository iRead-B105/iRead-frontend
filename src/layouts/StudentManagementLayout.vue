<script setup lang="ts">
// 아동 메뉴는 공통 사이드바에서 제공하므로 이 레이아웃은 하위 화면만 표시합니다.
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="student-layout">
    <RouterView />
  </div>
</template>

<style scoped>
.student-layout {
  width: 100%;
}
</style>
