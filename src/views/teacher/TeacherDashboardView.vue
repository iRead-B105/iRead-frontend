<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Student } from '@/features/teacher/types'
import { studentApi } from '@/features/teacher/adminApi'
import { useTeacherAdmin } from '@/features/teacher/useTeacherAdmin'

const router = useRouter()
const { students, loadAdminData } = useTeacherAdmin()
const query = ref('')
const ageFilter = ref('전체 나이')
const periodFilter = ref('전체 기간')
const page = ref(1)
const pageSize = 10
const studentPendingDeletion = ref<Student>()
const referenceDate = new Date('2026-07-20T00:00:00')

function daysSince(date: string) {
  return Math.floor((referenceDate.getTime() - new Date(`${date}T00:00:00`).getTime()) / 86_400_000)
}

function formatLearningRecency(date: string) {
  const days = daysSince(date)
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  return `${days}일 전`
}

function formatDate(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)}월 ${Number(day)}일`
}

function weeklyAttendanceRate(student: Student) {
  return Number.parseInt(student.weeklyAttendance, 10)
}

function needsAttention(student: Student) {
  return weeklyAttendanceRate(student) < 50
}

function studentInitial(name: string) {
  return name.trim().charAt(0) || '?'
}

const filteredStudents = computed(() => {
  const periodDays =
    periodFilter.value === '최근 7일' ? 7 : periodFilter.value === '최근 30일' ? 30 : null
  return students.filter((student) => {
    const normalizedQuery = query.value.trim().toLowerCase()
    const matchesQuery =
      !normalizedQuery ||
      student.name.toLowerCase().includes(normalizedQuery) ||
      student.school.toLowerCase().includes(normalizedQuery)
    const matchesAge = ageFilter.value === '전체 나이' || student.age === Number(ageFilter.value)
    const daysSinceLearning = daysSince(student.lastLearningDate)
    const matchesPeriod =
      periodDays === null || (daysSinceLearning >= 0 && daysSinceLearning <= periodDays)
    return matchesQuery && matchesAge && matchesPeriod
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredStudents.value.length / pageSize)))
const attentionStudentCount = computed(
  () => students.filter((student) => needsAttention(student)).length,
)
const pageStudents = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredStudents.value.slice(start, start + pageSize)
})

watch([query, ageFilter, periodFilter], () => (page.value = 1))
watch(totalPages, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

function openStudent(student: Student) {
  router.push(`/teacher/students/${student.id}`)
}

function editStudent(student: Student) {
  router.push(`/teacher/students/${student.id}/edit`)
}

function requestStudentDeletion(student: Student) {
  studentPendingDeletion.value = student
}

async function confirmStudentDeletion() {
  if (!studentPendingDeletion.value) return
  await studentApi.remove(studentPendingDeletion.value.id)
  studentPendingDeletion.value = undefined
  await loadAdminData(true)
}

onMounted(() => void loadAdminData())
</script>

<template>
  <div class="dashboard">
    <section class="student-list">
      <div class="list-toolbar">
        <div class="list-toolbar__copy">
          <h1>아동 목록</h1>
          <p>담당 아동을 검색하고 학습 현황을 확인합니다.</p>
        </div>
        <Button
          class="register-button"
          type="button"
          @click="router.push('/teacher/students/new')"
        >
          ＋ 아동 등록
        </Button>
      </div>

      <Card class="list-controls">
        <div class="filter-row">
          <label class="search-field">
            <span aria-hidden="true">⌕</span>
            <Input v-model="query" class="search-input" type="search" placeholder="이름 또는 학교 검색" />
          </label>
          <Select v-model="ageFilter">
            <SelectTrigger class="select filter-select" aria-label="나이 선택">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체 나이">전체 나이</SelectItem>
              <SelectItem v-for="age in [6, 7, 8, 9, 10, 11, 12]" :key="age" :value="String(age)">
                {{ age }}세
              </SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="periodFilter">
            <SelectTrigger class="select filter-select" aria-label="기간 선택">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체 기간">전체 기간</SelectItem>
              <SelectItem value="최근 7일">최근 7일</SelectItem>
              <SelectItem value="최근 30일">최근 30일</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <dl class="list-summary" aria-label="담당 아동 요약">
          <div>
            <dt>전체 아동</dt>
            <dd>{{ students.length }}명</dd>
          </div>
          <div>
            <dt>검색 결과</dt>
            <dd>{{ filteredStudents.length }}명</dd>
          </div>
          <div class="list-summary__attention">
            <dt>확인 필요</dt>
            <dd>{{ attentionStudentCount }}명</dd>
          </div>
        </dl>
      </Card>

      <Card class="table-scroll">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>아동</TableHead>
              <TableHead>현재 학습</TableHead>
              <TableHead>최근 학습</TableHead>
              <TableHead>이번 주 상태</TableHead>
              <TableHead>누적 학습</TableHead>
              <TableHead><span class="visually-hidden">관리 메뉴</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="student in pageStudents" :key="student.id" class="student-row">
              <TableCell>
                <Button variant="ghost" class="student-cell" type="button" @click="openStudent(student)">
                  <img v-if="student.profileImage" :src="student.profileImage" alt="" />
                  <span v-else class="student-initial" aria-hidden="true">{{
                    studentInitial(student.name)
                  }}</span>
                  <div>
                    <strong>{{ student.name }}</strong>
                    <span>{{ student.school }} · {{ student.age }}세</span>
                  </div>
                </Button>
              </TableCell>
              <TableCell>
                <span class="current-training">{{ student.latestTraining }}</span>
              </TableCell>
              <TableCell>
                <div class="learning-date">
                  <strong>{{ formatLearningRecency(student.lastLearningDate) }}</strong>
                  <span>{{ formatDate(student.lastLearningDate) }}</span>
                </div>
              </TableCell>
              <TableCell>
                <div
                  class="weekly-status"
                  :class="{ 'weekly-status--attention': needsAttention(student) }"
                >
                  <strong>{{ needsAttention(student) ? '확인 필요' : '양호' }}</strong>
                  <span>참여 {{ student.weeklyAttendance }}</span>
                </div>
              </TableCell>
              <TableCell>{{ student.totalLearningTime }}</TableCell>
              <TableCell class="action-cell">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button
                      class="more-button"
                      variant="ghost"
                      size="icon"
                      type="button"
                      :aria-label="`${student.name} 관리 메뉴`"
                    >
                      ···
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @select="openStudent(student)">아동 상세</DropdownMenuItem>
                    <DropdownMenuItem @select="editStudent(student)">정보 수정</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" @select="requestStudentDeletion(student)">
                      아동 삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
            <TableRow v-if="pageStudents.length === 0">
              <TableCell colspan="6" class="empty-row">검색 조건에 맞는 아동이 없습니다.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      <footer v-if="totalPages > 1" class="table-footer">
        <nav class="pagination" aria-label="페이지 이동">
          <Button variant="outline" size="sm" type="button" :disabled="page === 1" @click="page--">이전</Button>
          <Button
            v-for="number in totalPages"
            :key="number"
            :variant="page === number ? 'default' : 'outline'"
            size="sm"
            type="button"
            @click="page = number"
          >
            {{ number }}
          </Button>
          <Button variant="outline" size="sm" type="button" :disabled="page === totalPages" @click="page++">다음</Button>
        </nav>
      </footer>
    </section>

    <ConfirmDialog
      :open="Boolean(studentPendingDeletion)"
      title="아동을 삭제할까요?"
      :message="`${studentPendingDeletion?.name ?? ''} 아동의 목업 정보를 목록에서 삭제합니다.`"
      confirm-label="아동 삭제"
      @cancel="studentPendingDeletion = undefined"
      @confirm="confirmStudentDeletion"
    />
  </div>
</template>

<style scoped>
.dashboard {
  display: grid;
}
.student-list {
  display: grid;
  min-width: 0;
  gap: 20px;
}
.list-toolbar {
  display: flex;
  min-height: 76px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--slate-200);
}
.list-toolbar h1 {
  margin: 0;
  color: var(--slate-950);
  font-size: 26px;
  line-height: 1.25;
}
.list-toolbar__copy {
  display: grid;
  gap: 5px;
}
.list-toolbar__copy p {
  margin: 0;
  color: var(--slate-500);
  font-size: 12px;
  line-height: 1.55;
}
.filter-row {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
  gap: 9px;
  padding: 0;
}
.filter-row .select {
  width: 132px;
}
.list-controls {
  display: flex;
  align-items: flex-end;
  flex-direction: row;
  gap: 24px;
  overflow: visible;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.list-summary {
  display: flex;
  min-height: 40px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 0;
  margin: 0 0 0 auto;
  padding: 0;
}
.list-summary > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 14px;
}
.list-summary > div:first-child {
  padding-left: 0;
}
.list-summary > div + div {
  border-left: 1px solid var(--border);
}
.list-summary dt {
  color: var(--slate-500);
  font-size: 11px;
}
.list-summary dd {
  margin: 0;
  color: var(--slate-900);
  font-size: 18px;
  font-weight: 800;
}
.list-summary__attention dd {
  color: var(--danger-600);
}
.register-button {
  min-height: 40px;
  white-space: nowrap;
}
.search-field {
  display: flex;
  min-width: 240px;
  flex: 1 1 340px;
  max-width: 440px;
  height: 40px;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--slate-300);
  border-radius: var(--radius-sm);
  background: var(--white);
}
.search-field span {
  color: var(--slate-400);
  font-size: 20px;
}
.search-field input {
  width: 100%;
  border: 0;
  outline: 0;
}
.table-scroll {
  gap: 0;
  overflow: hidden auto;
  padding: 0;
  border-radius: var(--radius-lg);
}
table {
  width: 100%;
  border-collapse: collapse;
  background: var(--white);
}
th,
td {
  height: 68px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--slate-200);
  text-align: left;
  white-space: nowrap;
}
th {
  height: 44px;
  background: var(--slate-50);
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 700;
}
th:first-child,
td:first-child {
  padding-left: 18px;
}
th:last-child,
td:last-child {
  width: 60px;
  padding-right: 14px;
  text-align: right;
}
.student-row {
  transition: background 120ms ease;
}
.student-row:hover {
  background: var(--interactive-hover-background);
}
.student-cell {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}
.student-cell img {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
}
.student-cell div {
  display: grid;
  gap: 2px;
}
.student-cell strong {
  color: var(--slate-950);
}
.student-cell:hover strong,
.student-cell:focus-visible strong {
  color: var(--primary-600);
}
.student-initial {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 50%;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 14px;
  font-weight: 800;
  place-items: center;
}
.student-cell div span,
.learning-date span,
.weekly-status span {
  color: var(--slate-500);
  font-size: 11px;
}
.current-training {
  color: var(--slate-700);
}
.learning-date,
.weekly-status {
  display: grid;
  gap: 2px;
}
.learning-date strong,
.weekly-status strong {
  font-size: 12px;
}
.weekly-status strong {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--slate-700);
}
.weekly-status strong::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success-600);
  content: '';
}
.weekly-status--attention strong {
  color: var(--danger-600);
}
.weekly-status--attention strong::before {
  background: var(--danger-600);
}
.action-cell {
  position: relative;
}
.more-button {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--slate-500);
  font-size: 18px;
  letter-spacing: 1px;
}
.more-button:hover,
.more-button[aria-expanded='true'] {
  background: var(--slate-100);
  color: var(--slate-950);
}
.row-menu {
  position: absolute;
  z-index: 10;
  top: 50px;
  right: 12px;
  display: grid;
  width: 132px;
  padding: 6px;
  border: 1px solid var(--slate-200);
  border-radius: 8px;
  background: var(--white);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
}
.row-menu button {
  min-height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--slate-700);
  font-size: 12px;
  text-align: left;
}
.row-menu button:hover {
  background: var(--slate-50);
}
.row-menu .row-menu__danger {
  color: var(--danger-600);
}
.empty-row {
  padding: 40px;
  color: var(--slate-500);
  text-align: center;
}
.table-footer {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 16px;
  color: var(--slate-500);
  font-size: 12px;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 5px;
}
.pagination button {
  min-width: 32px;
  height: 32px;
  border: 1px solid var(--slate-200);
  border-radius: 7px;
  background: var(--white);
}
.pagination button.active {
  border-color: var(--primary-600);
  background: var(--primary-600);
  color: var(--white);
}

@media (max-width: 900px) {
  .list-controls {
    align-items: stretch;
    flex-direction: column;
    flex-wrap: wrap;
    gap: 12px;
  }

  .filter-row {
    flex-wrap: wrap;
  }

  .search-field {
    max-width: none;
    flex-basis: 100%;
  }

  .list-summary {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .list-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .register-button {
    align-self: flex-start;
  }

  .list-summary > div,
  .list-summary > div:first-child {
    padding: 0 10px;
  }

  .list-summary > div + div {
    border-left: 1px solid var(--border);
  }
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
