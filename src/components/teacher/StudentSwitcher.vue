<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { StudentNavigationItem } from '@/features/teacher/student'
import { useStudentStore } from '@/stores/students'

const props = defineProps<{
  currentStudent: StudentNavigationItem
}>()

const emit = defineEmits<{
  select: [student: StudentNavigationItem]
  manage: []
}>()

const studentStore = useStudentStore()
const {
  navigationItems,
  navigationHasNextPage,
  navigationStatus,
  navigationError,
  recentStudents,
} = storeToRefs(studentStore)
const root = ref<HTMLElement>()
const popover = ref<HTMLElement>()
const isOpen = ref(false)
const keyword = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined

const recentIds = computed(() => new Set(recentStudents.value.map((student) => student.studentId)))
const remainingStudents = computed(() =>
  navigationItems.value.filter((student) => !recentIds.value.has(student.studentId)),
)

watch(
  () => props.currentStudent.studentId,
  () => studentStore.rememberStudent(props.currentStudent),
  { immediate: true },
)
watch(keyword, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void studentStore.searchNavigation(value), 300)
})

function studentInitial(name: string): string {
  return name.trim().charAt(0) || '?'
}

async function open(): Promise<void> {
  isOpen.value = true
  if (studentStore.navigationStatus === 'idle') {
    void studentStore.loadNavigation({ reset: true })
  }
  await nextTick()
  popover.value?.querySelector<HTMLInputElement>('input')?.focus()
}

function focusTrigger(): void {
  void nextTick(() => {
    root.value?.querySelector<HTMLButtonElement>('.student-switcher__trigger')?.focus()
  })
}

function close(restoreFocus = true): void {
  if (!isOpen.value) return
  isOpen.value = false
  if (restoreFocus) focusTrigger()
}

function toggle(): void {
  if (isOpen.value) {
    close()
  } else {
    void open()
  }
}

function selectStudent(student: StudentNavigationItem): void {
  if (student.studentId === props.currentStudent.studentId) return
  studentStore.rememberStudent(student)
  close(false)
  emit('select', student)
}

function manageStudents(): void {
  close(false)
  emit('manage')
}

function closeOnOutsideClick(event: MouseEvent): void {
  if (!(event.target instanceof Node)) return
  if (root.value && !root.value.contains(event.target)) close(false)
}

function handlePopoverKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !popover.value) return

  const focusable = [
    ...popover.value.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => !element.hasAttribute('hidden'))
  const first = popover.value.querySelector<HTMLElement>('#student-switcher-search') ?? focusable[0]
  const last = popover.value.querySelector<HTMLElement>('.manage') ?? focusable.at(-1)
  if (!first || !last) return
  const eventTarget = event.target instanceof HTMLElement ? event.target : null

  if (event.shiftKey && (document.activeElement === first || eventTarget === first)) {
    event.preventDefault()
    last.focus()
  } else if (
    !event.shiftKey &&
    (document.activeElement === last ||
      eventTarget === last ||
      eventTarget?.classList.contains('manage'))
  ) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  document.addEventListener('click', closeOnOutsideClick)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  document.removeEventListener('click', closeOnOutsideClick)
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
      aria-controls="student-switcher-popover"
      aria-label="학습자 변경"
      @click="toggle"
    >
      <img
        v-if="currentStudent.imageUrl"
        :src="currentStudent.imageUrl"
        :alt="currentStudent.name"
      />
      <span v-else class="student-avatar" aria-hidden="true">
        {{ studentInitial(currentStudent.name) }}
      </span>
      <span class="student-switcher__identity">
        <strong>{{ currentStudent.name }}</strong>
        <small>{{ currentStudent.school }}</small>
      </span>
      <span aria-hidden="true">⌄</span>
    </Button>

    <section
      v-if="isOpen"
      id="student-switcher-popover"
      ref="popover"
      class="student-switcher__popover"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-switcher-title"
      aria-describedby="student-switcher-count"
      @keydown="handlePopoverKeydown"
    >
      <header>
        <strong id="student-switcher-title">학습자 변경</strong>
        <span id="student-switcher-count" aria-live="polite">
          {{ navigationItems.length }}명 표시 중
        </span>
      </header>

      <label class="student-switcher__search" for="student-switcher-search">
        <span aria-hidden="true">⌕</span>
        <span class="sr-only">이름 또는 학교 검색</span>
        <Input
          id="student-switcher-search"
          v-model="keyword"
          type="search"
          placeholder="이름 또는 학교 검색"
        />
      </label>

      <div class="student-switcher__list">
        <p v-if="!keyword && recentStudents.length" class="section-label">최근 본 학습자</p>
        <Button
          v-for="student in !keyword ? recentStudents : []"
          :key="`recent-${student.studentId}`"
          class="student-option"
          variant="ghost"
          type="button"
          :data-selected="student.studentId === currentStudent.studentId"
          :aria-current="student.studentId === currentStudent.studentId ? 'true' : undefined"
          @click="selectStudent(student)"
        >
          <img v-if="student.imageUrl" :src="student.imageUrl" alt="" />
          <span v-else class="student-avatar" aria-hidden="true">{{
            studentInitial(student.name)
          }}</span>
          <span
            ><strong>{{ student.name }}</strong
            ><small>{{ student.school ?? '학교 미입력' }}</small></span
          >
          <span v-if="student.studentId === currentStudent.studentId" aria-label="현재 학습자"
            >✓</span
          >
        </Button>

        <p class="section-label">{{ keyword ? '검색 결과' : '전체 학습자' }}</p>
        <Button
          v-for="student in keyword ? navigationItems : remainingStudents"
          :key="student.studentId"
          class="student-option"
          variant="ghost"
          type="button"
          :data-selected="student.studentId === currentStudent.studentId"
          :aria-current="student.studentId === currentStudent.studentId ? 'true' : undefined"
          @click="selectStudent(student)"
        >
          <img v-if="student.imageUrl" :src="student.imageUrl" alt="" />
          <span v-else class="student-avatar" aria-hidden="true">{{
            studentInitial(student.name)
          }}</span>
          <span
            ><strong>{{ student.name }}</strong
            ><small>{{ student.school ?? '학교 미입력' }}</small></span
          >
          <span v-if="student.studentId === currentStudent.studentId" aria-label="현재 학습자"
            >✓</span
          >
        </Button>

        <p v-if="navigationStatus === 'loading'" class="state-copy" role="status">
          학습자 목록을 불러오는 중입니다.
        </p>
        <div v-else-if="navigationStatus === 'error'" class="state-copy" role="alert">
          <p>{{ navigationError }}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            @click="studentStore.loadNavigation({ reset: true })"
          >
            다시 시도
          </Button>
        </div>
        <p v-else-if="navigationItems.length === 0" class="state-copy" role="status">
          검색 결과가 없습니다.
        </p>
        <Button
          v-if="navigationHasNextPage"
          class="load-more"
          type="button"
          variant="outline"
          size="sm"
          :disabled="navigationStatus === 'loading'"
          @click="studentStore.loadMoreNavigation()"
        >
          더 불러오기
        </Button>
      </div>

      <Button variant="ghost" class="manage" type="button" @click="manageStudents">
        전체 학습자 목록에서 관리
      </Button>
    </section>
  </div>
</template>

<style scoped>
.student-switcher {
  position: relative;
  min-width: 0;
  max-width: 100%;
}
.student-switcher__trigger {
  display: grid;
  width: 100%;
  min-height: 58px;
  align-items: center;
  gap: 9px;
  padding: 8px 9px;
  border: 1px solid var(--slate-200);
  grid-template-columns: 38px minmax(0, 1fr) 16px;
}
.student-switcher__trigger:hover {
  background: var(--interactive-hover-background);
  color: var(--sidebar-accent-foreground);
}
.student-switcher__trigger[aria-expanded='true'] {
  background: var(--active-selection-background);
  color: var(--active-selection-foreground);
}
.student-switcher__trigger img,
.student-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
}
.student-switcher__trigger img,
.student-option img {
  object-fit: cover;
}
.student-avatar {
  display: grid;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 12px;
  font-weight: 800;
  place-items: center;
}
.student-switcher__identity,
.student-option > span:nth-child(2) {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.student-switcher__identity strong,
.student-option strong {
  overflow: hidden;
  color: var(--slate-900);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.student-switcher__identity small,
.student-option small {
  overflow: hidden;
  color: var(--slate-500);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.student-switcher__popover {
  position: absolute;
  z-index: 50;
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
.student-switcher__popover header span,
.section-label,
.state-copy {
  color: var(--slate-500);
  font-size: 10px;
}
.student-switcher__search {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 12px;
}
.student-switcher__list {
  max-height: 330px;
  padding: 0 8px 10px;
  overflow-y: auto;
}
.section-label {
  margin: 8px;
  font-weight: 800;
}
.student-option {
  display: grid;
  width: 100%;
  min-height: 50px;
  gap: 9px;
  margin-top: 4px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-sm);
  background: var(--card);
  grid-template-columns: 34px minmax(0, 1fr) 18px;
}
.student-option[data-selected='true'] {
  background: var(--active-selection-background);
  color: var(--active-selection-foreground);
}
.student-option:hover {
  background: var(--interactive-hover-background);
  color: var(--sidebar-accent-foreground);
}
.student-option img {
  width: 34px;
  height: 34px;
  border-radius: 50%;
}
.state-copy {
  display: grid;
  justify-items: center;
  gap: 8px;
  margin: 20px 8px;
  text-align: center;
}
.state-copy p {
  margin: 0;
}
.load-more {
  width: 100%;
  margin-top: 8px;
}
.manage {
  width: 100%;
  min-height: 42px;
  border-top: 1px solid var(--slate-200);
  border-radius: 0;
  color: var(--primary-700);
}
@media (max-width: 900px) {
  .student-switcher__popover {
    top: calc(100% + 8px);
    left: 0;
    width: min(300px, calc(100vw - 32px));
    max-height: min(520px, calc(100dvh - 24px));
  }
}

@media (max-width: 480px) {
  .student-switcher__popover {
    width: min(300px, calc(100vw - 24px));
  }
}
</style>
