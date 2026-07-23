<script setup lang="ts">
// RouterView는 현재 브라우저 주소와 일치하는 화면 컴포넌트를 표시하는 자리입니다.
// <script setup>을 사용하면 여기서 가져온 값을 아래 template에서 바로 쓸 수 있습니다.
import { RouterView } from 'vue-router'
</script>

<template>
  <!-- App.vue는 앱의 뿌리이며, 실제 페이지는 라우터가 이 위치에 끼워 넣습니다. -->
  <RouterView />
</template>
