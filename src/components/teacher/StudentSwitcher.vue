<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Student } from '@/features/teacher/types'

const props = defineProps<{
  students: Student[]
  currentStudent: Student
}>()

const emit = defineEmits<{
  select: [student: Student]
  manage: []
}>()

const root = ref<HTMLElement>()
const isOpen = ref(false)
const query = ref('')
const recentStudentIds = ref<number[]>([props.currentStudent.id])

const normalizedQuery = computed(() => query.value.trim().toLowerCase())
const searchResults = computed(() =>
  props.students.filter((student) => {
    if (!normalizedQuery.value) return true
    return (
      student.name.toLowerCase().includes(normalizedQuery.value) ||
      student.school.toLowerCase().includes(normalizedQuery.value)
    )
  }),
)
const recentStudents = computed(() =>
  recentStudentIds.value
    .map((id) => props.students.find((student) => student.id === id))
    .filter((student): student is Student => Boolean(student)),
)
const remainingStudents = computed(() =>
  props.students.filter((student) => !recentStudentIds.value.includes(student.id)),
)

watch(
  () => props.currentStudent.id,
  (studentId) => rememberStudent(studentId),
)

function studentInitial(name: string) {
  return name.trim().charAt(0) || '?'
}

function rememberStudent(studentId: number) {
  recentStudentIds.value = [
    studentId,
    ...recentStudentIds.value.filter((id) => id !== studentId),
  ].slice(0, 5)
}

function toggle() {
  isOpen.value = !isOpen.value
  query.value = ''
}

function close() {
  isOpen.value = false
  query.value = ''
}

function selectStudent(student: Student) {
  if (student.id === props.currentStudent.id) return
  rememberStudent(student.id)
  close()
  emit('select', student)
}

function manageStudents() {
  close()
  emit('manage')
}

function closeOnOutsideClick(event: MouseEvent) {
  if (!(event.target instanceof Node)) return
  if (root.value && !root.value.contains(event.target)) close()
}

function closeOnEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isOpen.value) return
  close()
}

onMounted(() => {
  document.addEventListener('click', closeOnOutsideClick)
  document.addEventListener('keydown', closeOnEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeOnOutsideClick)
  document.removeEventListener('keydown', closeOnEscape)
})
</script>

<template>
  <div ref="root" class="student-switcher">
    <Button
      class="student-switcher__trigger"
      variant="ghost"
      type="button"
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      aria-label="아동 변경"
      @click="toggle"
    >
      <img
        v-if="currentStudent.profileImage"
        :src="currentStudent.profileImage"
        :alt="currentStudent.name"
      />
      <span v-else class="student-avatar" aria-hidden="true">{{
        studentInitial(currentStudent.name)
      }}</span>
      <span class="student-switcher__identity">
        <strong>{{ currentStudent.name }}</strong>
        <small>{{ currentStudent.age }}세 · {{ currentStudent.school }}</small>
      </span>
      <span class="student-switcher__chevron" aria-hidden="true">⌄</span>
    </Button>

    <section v-if="isOpen" class="student-switcher__popover" role="dialog" aria-label="아동 변경">
      <header>
        <strong>아동 변경</strong>
        <span>{{ students.length }}명</span>
      </header>

      <label class="student-switcher__search">
        <span aria-hidden="true">⌕</span>
        <Input v-model="query" class="border-0 shadow-none" type="search" placeholder="이름 또는 학교 검색" autofocus />
      </label>

      <div class="student-switcher__list">
        <template v-if="normalizedQuery">
          <p class="student-switcher__section-label">검색 결과</p>
          <Button
            v-for="student in searchResults"
            :key="student.id"
            class="student-option"
            type="button"
            :aria-current="student.id === currentStudent.id ? 'true' : undefined"
            :disabled="student.id === currentStudent.id"
            @click="selectStudent(student)"
          >
            <img v-if="student.profileImage" :src="student.profileImage" alt="" />
            <span v-else class="student-avatar" aria-hidden="true">{{
              studentInitial(student.name)
            }}</span>
            <span
              ><strong>{{ student.name }}</strong
              ><small>{{ student.school }} · {{ student.age }}세</small></span
            >
            <span
              v-if="student.id === currentStudent.id"
              class="student-option__check"
              aria-label="현재 아동"
              >✓</span
            >
          </Button>
          <p v-if="searchResults.length === 0" class="student-switcher__empty">
            검색 결과가 없습니다.
          </p>
        </template>

        <template v-else>
          <p class="student-switcher__section-label">최근 본 아동</p>
          <Button
            v-for="student in recentStudents"
            :key="`recent-${student.id}`"
            class="student-option"
            type="button"
            :aria-current="student.id === currentStudent.id ? 'true' : undefined"
            :disabled="student.id === currentStudent.id"
            @click="selectStudent(student)"
          >
            <img v-if="student.profileImage" :src="student.profileImage" alt="" />
            <span v-else class="student-avatar" aria-hidden="true">{{
              studentInitial(student.name)
            }}</span>
            <span
              ><strong>{{ student.name }}</strong
              ><small>{{ student.school }} · {{ student.age }}세</small></span
            >
            <span
              v-if="student.id === currentStudent.id"
              class="student-option__check"
              aria-label="현재 아동"
              >✓</span
            >
          </Button>

          <template v-if="remainingStudents.length">
            <p class="student-switcher__section-label student-switcher__section-label--all">
              전체 아동
            </p>
            <Button
              v-for="student in remainingStudents"
              :key="student.id"
              class="student-option"
              type="button"
              @click="selectStudent(student)"
            >
              <img v-if="student.profileImage" :src="student.profileImage" alt="" />
              <span v-else class="student-avatar" aria-hidden="true">{{
                studentInitial(student.name)
              }}</span>
              <span
                ><strong>{{ student.name }}</strong
                ><small>{{ student.school }} · {{ student.age }}세</small></span
              >
            </Button>
          </template>
        </template>
      </div>

      <Button variant="ghost" class="student-switcher__manage" type="button" @click="manageStudents">
        전체 아동 목록에서 관리
      </Button>
    </section>
  </div>
</template>

<style scoped>
.student-switcher {
  position: relative;
}
.student-switcher__trigger {
  display: grid;
  width: 100%;
  min-height: 58px;
  align-items: center;
  gap: 9px;
  padding: 8px 9px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-sm);
  background: var(--sidebar);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 5px 14px rgba(15, 23, 42, 0.055);
  color: inherit;
  text-align: left;
  grid-template-columns: 40px minmax(0, 1fr) 16px;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease,
    transform 150ms ease;
}
.student-switcher__trigger:hover,
.student-switcher__trigger[aria-expanded='true'] {
  border-color: color-mix(in oklch, var(--primary) 24%, var(--slate-200));
  background: var(--sidebar-accent);
  box-shadow:
    0 2px 4px rgba(15, 23, 42, 0.05),
    0 8px 20px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}
.student-switcher__trigger img,
.student-avatar {
  width: 38px;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: 50%;
  object-fit: cover;
}
.student-avatar {
  display: grid;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 13px;
  font-weight: 800;
  place-items: center;
}
.student-switcher__identity {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.student-switcher__identity strong {
  color: var(--slate-900);
  font-size: 14px;
}
.student-switcher__identity small {
  overflow: hidden;
  color: var(--slate-500);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.student-switcher__chevron {
  color: var(--slate-400);
  font-size: 16px;
  transition: transform 140ms ease;
}
.student-switcher__trigger[aria-expanded='true'] .student-switcher__chevron {
  transform: rotate(180deg);
}
.student-switcher__popover {
  position: absolute;
  z-index: 30;
  top: 0;
  left: calc(100% + 14px);
  width: 300px;
  overflow: hidden;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  background: var(--popover);
  box-shadow: var(--shadow-card);
}
.student-switcher__popover header {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid var(--slate-200);
}
.student-switcher__popover header strong {
  font-size: 14px;
}
.student-switcher__popover header span {
  color: var(--slate-500);
  font-size: 11px;
}
.student-switcher__search {
  display: flex;
  height: 38px;
  align-items: center;
  gap: 7px;
  margin: 12px;
  padding: 0 10px;
  border: 1px solid var(--input);
  border-radius: var(--radius-sm);
  background: var(--background);
}
.student-switcher__search > span {
  color: var(--slate-400);
  font-size: 17px;
}
.student-switcher__search input {
  width: 100%;
  border: 0;
  outline: 0;
  font-size: 11px;
}
.student-switcher__list {
  max-height: 308px;
  padding: 0 7px 8px;
  overflow-y: auto;
}
.student-switcher__section-label {
  margin: 4px 7px 5px;
  color: var(--slate-500);
  font-size: 9px;
  font-weight: 800;
}
.student-switcher__section-label--all {
  margin-top: 12px;
}
.student-option {
  display: grid;
  width: 100%;
  min-height: 50px;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  text-align: left;
  grid-template-columns: 34px minmax(0, 1fr) 18px;
}
.student-option:hover:not(:disabled) {
  background: var(--accent);
}
.student-option:disabled {
  cursor: default;
  opacity: 1;
}
.student-option img,
.student-option .student-avatar {
  width: 32px;
  height: 32px;
  font-size: 11px;
}
.student-option > span:nth-child(2) {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.student-option strong {
  color: var(--slate-800);
  font-size: 11px;
}
.student-option small {
  overflow: hidden;
  color: var(--slate-500);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.student-option__check {
  color: var(--primary-600);
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}
.student-switcher__empty {
  margin: 24px 8px;
  color: var(--slate-500);
  font-size: 11px;
  text-align: center;
}
.student-switcher__manage {
  width: 100%;
  min-height: 42px;
  border: 0;
  border-top: 1px solid var(--slate-200);
  background: var(--popover);
  color: var(--primary-700);
  font-size: 10px;
  font-weight: 800;
}
.student-switcher__manage:hover {
  background: var(--sidebar-accent);
}
</style>
            variant="ghost"
            variant="ghost"
              variant="ghost"
