<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import StudentForm from '@/components/teacher/StudentForm.vue'
import { studentApi } from '@/features/teacher/adminApi'
import type { Student } from '@/features/teacher/types'

const route = useRoute()
const student = ref<Student>()
const errorMessage = ref('')

onMounted(async () => {
  try {
    const data = await studentApi.get(Number(route.params.id))
    student.value = {
      id: data.id,
      name: data.name,
      age: Math.max(0, new Date().getFullYear() - Number(data.birthday.slice(0, 4))),
      birthDate: data.birthday,
      gender: data.gender === 'Boy' ? '남자' : '여자',
      phone: '',
      school: data.school,
      guardianName: data.guardian,
      guardianRelation: '',
      guardianPhone: data.guardianContact,
      guardianEmail: data.guardianEmail,
      address: data.address,
      lastLearningDate: '',
      lastTestDate: '',
      totalLearningTime: '0시간',
      latestTraining: '-',
      lastAccess: '-',
      learningStartDate: '',
      weeklyAttendance: '0%',
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '학생 정보를 불러오지 못했습니다.'
  }
})
</script>

<template>
  <StudentForm v-if="student" mode="edit" :initial-value="student" />
  <p v-else-if="errorMessage" role="alert">{{ errorMessage }}</p>
  <p v-else>학생 정보를 불러오는 중입니다.</p>
</template>
