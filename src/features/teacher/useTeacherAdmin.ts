import { computed, reactive, readonly, ref } from 'vue'
import { authApi, studentApi, teacherApi, type StudentListItem, type TeacherInfo } from './adminApi'
import type { Student } from './types'

const students = reactive<Student[]>([])
const teacher = ref<TeacherInfo | null>(null)
const loading = ref(false)
const loaded = ref(false)

function mapStudent(item: StudentListItem): Student {
  return {
    id: item.id,
    name: item.name,
    age: item.age,
    birthDate: '',
    gender: '남자',
    phone: '',
    school: '',
    guardianName: '',
    guardianRelation: '',
    guardianPhone: '',
    guardianEmail: '',
    address: '',
    lastLearningDate: item.recentLearningDate ?? '',
    lastTestDate: '',
    totalLearningTime: `${Math.round((item.totalLearningTime ?? 0) / 60)}시간`,
    latestTraining: item.recentTraining ?? '-',
    lastAccess: item.recentLearningDate ?? '-',
    learningStartDate: '',
    weeklyAttendance: '0%',
  }
}

async function loadAdminData(force = false) {
  if (loading.value || (loaded.value && !force)) return
  loading.value = true
  try {
    const [teacherInfo, studentItems] = await Promise.all([teacherApi.getInfo(), studentApi.list()])
    teacher.value = teacherInfo
    students.splice(0, students.length, ...studentItems.map(mapStudent))
    loaded.value = true
  } finally {
    loading.value = false
  }
}

async function logout() {
  await authApi.logout()
  teacher.value = null
  students.splice(0)
  loaded.value = false
}

export function useTeacherAdmin() {
  return {
    students,
    teacher: readonly(teacher),
    loading: readonly(loading),
    hasStudents: computed(() => students.length > 0),
    loadAdminData,
    logout,
  }
}
