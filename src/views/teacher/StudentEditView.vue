<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import StudentForm from '@/components/teacher/StudentForm.vue'
import { Button } from '@/components/ui/button'
import { useStudentStore } from '@/stores/students'

const route = useRoute()
const studentStore = useStudentStore()
const studentId = computed(() => Number(route.params.id))
const student = computed(() => studentStore.detailsById[studentId.value])
const detailStatus = computed(() => studentStore.detailStatusById[studentId.value] ?? 'idle')
const detailError = computed(
  () => studentStore.detailErrorById[studentId.value] ?? '아동 정보를 불러오지 못했습니다.',
)

watch(
  studentId,
  async (nextStudentId) => {
    if (
      Number.isInteger(nextStudentId) &&
      nextStudentId > 0 &&
      (!studentStore.detailsById[nextStudentId] ||
        studentStore.detailStaleById[nextStudentId] === true) &&
      studentStore.detailStatusById[nextStudentId] !== 'loading'
    ) {
      await studentStore.loadDetail(nextStudentId)
    }
  },
  { immediate: true },
)
</script>

<template>
  <StudentForm v-if="student" mode="edit" :initial-value="student" />
  <p v-else-if="!Number.isInteger(studentId) || studentId <= 0" class="load-state" role="alert">
    올바르지 않은 아동 주소입니다.
  </p>
  <section v-else-if="detailStatus === 'error'" class="load-state" role="alert">
    <p>{{ detailError }}</p>
    <Button variant="outline" type="button" @click="studentStore.loadDetail(studentId)">
      다시 시도
    </Button>
  </section>
  <p v-else class="load-state" aria-live="polite">아동 정보를 불러오는 중입니다.</p>
</template>

<style scoped>
.load-state {
  display: grid;
  min-height: 240px;
  place-content: center;
  justify-items: center;
  gap: 12px;
  color: var(--slate-600);
}
</style>
