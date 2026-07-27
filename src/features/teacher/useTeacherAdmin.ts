import { computed, inject, provide, reactive, readonly, ref, type InjectionKey } from 'vue'
import { storeToRefs } from 'pinia'
import {
  AdminContractBlockedError,
  teacherAdminRepository,
  type TeacherAdminRepository,
} from './repositories'
import type { Student } from './types'
import { useSessionStore } from '@/stores/session'

function mapStudent(
  item: Awaited<ReturnType<TeacherAdminRepository['listStudents']>>[number],
): Student {
  if (item.id === null) {
    throw new AdminContractBlockedError(
      'ADMIN-STUDENT-LIST',
      '확정된 아동 목록 계약에 식별자가 없어 화면 모델로 변환할 수 없습니다.',
    )
  }

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

export function createTeacherAdminState(
  repository: TeacherAdminRepository = teacherAdminRepository,
) {
  const students = reactive<Student[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const sessionStore = useSessionStore()
  const { teacher } = storeToRefs(sessionStore)

  async function loadAdminData(force = false) {
    if (loading.value || (loaded.value && !force)) return
    loading.value = true
    try {
      const [teacherInfo, studentItems] = await Promise.all([
        repository.getTeacherInfo(),
        repository.listStudents(),
      ])
      const mappedStudents = studentItems.map(mapStudent)
      sessionStore.initialize(teacherInfo)
      students.splice(0, students.length, ...mappedStudents)
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await sessionStore.logout()
    students.splice(0)
    loaded.value = false
  }

  return {
    students,
    teacher: readonly(teacher),
    loading: readonly(loading),
    hasStudents: computed(() => students.length > 0),
    loadAdminData,
    logout,
  }
}

export type TeacherAdminState = ReturnType<typeof createTeacherAdminState>

const teacherAdminKey: InjectionKey<TeacherAdminState> = Symbol('teacher-admin')

export function provideTeacherAdmin(
  repository: TeacherAdminRepository = teacherAdminRepository,
): TeacherAdminState {
  const state = createTeacherAdminState(repository)
  provide(teacherAdminKey, state)
  return state
}

export function useTeacherAdmin(): TeacherAdminState {
  return inject(teacherAdminKey, () => createTeacherAdminState(), true)
}
