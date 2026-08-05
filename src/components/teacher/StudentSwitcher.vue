<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Search, Settings2, Check } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { StudentNavigationItem } from '@/features/teacher/student'
import { useStudentStore } from '@/stores/students'
import { resolveImageUrl } from '@/lib/image'

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
        :src="resolveImageUrl(currentStudent.imageUrl) || ''"
        :alt="currentStudent.name"
      />
      <span v-else class="student-avatar" aria-hidden="true">
        {{ studentInitial(currentStudent.name) }}
      </span>
      <span class="student-switcher__identity">
        <strong>{{ currentStudent.name }}</strong>
        <small>{{ currentStudent.school }}</small>
      </span>
      <span aria-hidden="true" class="trigger-icon">⌄</span>
    </Button>

    <Transition name="popover-fade">
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
        <Badge variant="secondary" class="student-count-badge" aria-live="polite">
          {{ navigationItems.length }}명 표시 중
        </Badge>
      </header>

      <div class="student-switcher__search-wrapper">
        <label class="student-switcher__search" for="student-switcher-search">
          <Search class="search-icon" aria-hidden="true" />
          <span class="sr-only">이름 또는 학교 검색</span>
          <Input
            id="student-switcher-search"
            v-model="keyword"
            type="search"
            class="search-input"
            placeholder="이름 또는 학교 검색"
          />
        </label>
      </div>

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
          <img v-if="student.imageUrl" :src="resolveImageUrl(student.imageUrl) || ''" alt="" />
          <span v-else class="student-avatar" aria-hidden="true">{{
            studentInitial(student.name)
          }}</span>
          <span
            ><strong>{{ student.name }}</strong
            ><small>{{ student.school ?? '학교 미입력' }}</small></span
          >
          <span v-if="student.studentId === currentStudent.studentId" class="selected-indicator" aria-label="현재 학습자">
            <Check class="w-4 h-4" />
          </span>
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
          <img v-if="student.imageUrl" :src="resolveImageUrl(student.imageUrl) || ''" alt="" />
          <span v-else class="student-avatar" aria-hidden="true">{{
            studentInitial(student.name)
          }}</span>
          <span
            ><strong>{{ student.name }}</strong
            ><small>{{ student.school ?? '학교 미입력' }}</small></span
          >
          <span v-if="student.studentId === currentStudent.studentId" class="selected-indicator" aria-label="현재 학습자">
            <Check class="w-4 h-4" />
          </span>
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
        <Settings2 class="w-4 h-4 mr-2" />
        전체 학습자 목록에서 관리
      </Button>
    </section>
    </Transition>
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
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trigger-icon {
  color: var(--slate-400);
  font-size: 18px;
  margin-top: -6px;
}
.student-switcher__popover {
  position: absolute;
  z-index: 50;
  top: 0;
  left: calc(100% + 14px);
  width: 320px;
  overflow: hidden;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06);
  transform-origin: top left;
}
.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
  transform: scale(0.96) translateX(-4px);
}
.student-switcher__popover header {
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  background: var(--popover);
  border-bottom: 1px solid var(--slate-100);
}
.student-switcher__popover header strong {
  font-size: 15px;
  color: var(--slate-900);
}
.student-count-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
}
.student-switcher__search-wrapper {
  padding: 12px 14px 4px;
}
.student-switcher__search {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 12px;
  width: 18px;
  height: 18px;
  color: var(--slate-400);
  pointer-events: none;
}
.search-input {
  padding-left: 36px;
  border-radius: var(--radius-full);
  background: var(--slate-50);
  border: 1px solid transparent;
  transition: all 0.2s;
  height: 38px;
}
.search-input:focus-visible {
  background: var(--background);
  border-color: var(--primary-400);
  box-shadow: 0 0 0 3px var(--primary-50);
}
.student-switcher__list {
  max-height: 340px;
  padding: 4px 14px 14px;
  overflow-y: auto;
}
.student-switcher__list::-webkit-scrollbar {
  width: 6px;
}
.student-switcher__list::-webkit-scrollbar-thumb {
  background: var(--slate-200);
  border-radius: 4px;
}
.student-switcher__list::-webkit-scrollbar-thumb:hover {
  background: var(--slate-300);
}
.section-label {
  margin: 14px 6px 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--slate-400);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.student-option {
  display: grid;
  width: 100%;
  min-height: 56px;
  gap: 12px;
  margin-top: 4px;
  padding: 8px 12px;
  border: none;
  border-radius: var(--radius-lg);
  background: transparent;
  grid-template-columns: 36px minmax(0, 1fr) 20px;
  transition: all 0.2s ease;
}
.student-option[data-selected='true'] {
  background: var(--primary-50);
  color: var(--primary-900);
}
.student-option[data-selected='true'] .student-avatar {
  background: var(--primary-100);
  color: var(--primary-700);
}
.student-option:hover {
  background: var(--slate-100);
  transform: translateX(2px);
}
.student-option[data-selected='true']:hover {
  background: var(--primary-100);
}
.student-option img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.selected-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-600);
}
.state-copy {
  display: grid;
  justify-items: center;
  gap: 8px;
  margin: 30px 8px;
  text-align: center;
  color: var(--slate-500);
  font-size: 13px;
}
.state-copy p {
  margin: 0;
}
.load-more {
  width: 100%;
  margin-top: 12px;
  border-radius: var(--radius-lg);
}
.manage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  background: var(--slate-50);
  border-top: 1px solid var(--slate-100);
  border-radius: 0;
  color: var(--slate-600);
  font-weight: 600;
  transition: all 0.2s;
}
.manage:hover {
  background: var(--slate-100);
  color: var(--slate-900);
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
