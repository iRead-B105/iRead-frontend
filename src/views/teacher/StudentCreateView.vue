<script setup lang="ts">
// 실제 입력 UI는 공통 StudentForm에 맡기고, 이 페이지는 '등록 모드'만 지정합니다.
import StudentForm from '@/components/teacher/StudentForm.vue'
</script>

<template>
  <!-- mode=create를 받은 폼은 빈 초기값과 등록용 제목·버튼을 표시합니다. -->
  <StudentForm mode="create" />
</template>
