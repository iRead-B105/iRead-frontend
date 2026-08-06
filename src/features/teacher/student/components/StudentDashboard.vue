<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { Search, RotateCcw, Settings2 } from '@lucide/vue'
import AuthenticatedImage from '@/components/common/AuthenticatedImage.vue'
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import SaveToast from '@/components/common/SaveToast.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import {
  formatLearningDate,
  formatLearningMinutes,
  formatWeeklyParticipation,
  toStudentNavigationItem,
  type StudentListItem,
} from '@/features/teacher/student'
import { asyncStateKind } from '@/features/teacher/error'
import { useTemporaryNotice } from '@/composables/useTemporaryNotice'
import { useStudentStore } from '@/stores/students'

const route = useRoute()
const router = useRouter()
const studentStore = useStudentStore()
const { visible: mutationNoticeVisible, show: showMutationNotice } = useTemporaryNotice()
const mutationNoticeMessage = ref('')
const {
  students,
  totalElements,
  totalPages,
  listStatus,
  listError,
  listUiError,
  hasActiveFilters,
} = storeToRefs(studentStore)

const keyword = ref(studentStore.query.keyword ?? '')
const age = ref(studentStore.query.age ? String(studentStore.query.age) : 'all')
const recentDays = ref(
  studentStore.query.recentDays ? String(studentStore.query.recentDays) : 'all',
)
let searchTimer: ReturnType<typeof setTimeout> | undefined

const currentPage = computed(() => studentStore.query.page + 1)
const pageNumbers = computed(() => {
  const current = currentPage.value
  const total = totalPages.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 3) return [1, 2, 3, 4, '...', total]
  if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
})
const isInitialLoading = computed(
  () => listStatus.value === 'loading' && students.value.length === 0,
)
const hasRetainedStudents = computed(() => students.value.length > 0)
const listErrorKind = computed(() => asyncStateKind(listUiError.value))
const isEmptyAccount = computed(
  () => listStatus.value === 'success' && totalElements.value === 0 && !hasActiveFilters.value,
)
const isEmptySearch = computed(
  () =>
    listStatus.value === 'success' &&
    totalElements.value === 0 &&
    !isEmptyAccount.value &&
    hasActiveFilters.value,
)

function studentInitial(name: string): string {
  return name.trim().charAt(0) || '?'
}

function applyFilters(): void {
  studentStore.setListFilters({
    keyword: keyword.value,
    age: age.value === 'all' ? undefined : Number(age.value),
    recentDays: recentDays.value === 'all' ? undefined : (Number(recentDays.value) as 7 | 30),
  })
  void studentStore.loadList()
}

function scheduleKeywordSearch(): void {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(applyFilters, 300)
}

function clearFilters(): void {
  if (searchTimer) clearTimeout(searchTimer)
  keyword.value = ''
  age.value = 'all'
  recentDays.value = 'all'
  studentStore.clearListFilters()
  void studentStore.loadList()
}

function goToPage(page: number): void {
  studentStore.setListPage(page - 1)
  void studentStore.loadList()
}

function openStudent(student: StudentListItem): void {
  studentStore.rememberStudent(toStudentNavigationItem(student))
  void router.push({ name: 'student-overview', params: { id: student.studentId } })
}

function editStudent(student: StudentListItem): void {
  void router.push({ name: 'student-edit', params: { id: student.studentId } })
}

watch(keyword, scheduleKeywordSearch)
watch([age, recentDays], applyFilters)

onMounted(() => {
  const mutation = Array.isArray(route.query.studentSaved)
    ? route.query.studentSaved[0]
    : route.query.studentSaved
  if (mutation === 'created' || mutation === 'deleted') {
    mutationNoticeMessage.value =
      mutation === 'created' ? '아동이 등록되었습니다.' : '아동이 삭제되었습니다.'
    showMutationNotice()
    const query = { ...route.query }
    delete query.studentSaved
    void router.replace({ query })
  }
  void studentStore.loadList()
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <section class="student-dashboard page-stack">
    <header class="page-heading">
      <div>
        <h1>아동 목록</h1>
      </div>
    </header>

    <SaveToast :visible="mutationNoticeVisible" :message="mutationNoticeMessage" inline />

    <Card class="filters">
      <label class="search" for="student-search">
        <Search class="search-icon" aria-hidden="true" />
        <span class="sr-only">이름 또는 학교 검색</span>
        <Input
          id="student-search"
          v-model="keyword"
          type="search"
          placeholder="이름 또는 학교 검색"
        />
      </label>
      <Select v-model="age">
        <SelectTrigger aria-label="만 나이 선택">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 나이</SelectItem>
          <SelectItem v-for="value in [6, 7, 8, 9, 10, 11, 12]" :key="value" :value="String(value)">
            만 {{ value }}세
          </SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="recentDays">
        <SelectTrigger aria-label="최근 학습 기간 선택">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 기간</SelectItem>
          <SelectItem value="7">최근 7일</SelectItem>
          <SelectItem value="30">최근 30일</SelectItem>
        </SelectContent>
      </Select>
      <Button
        class="student-create-button"
        type="button"
        @click="router.push({ name: 'student-create' })"
      >
        ＋ 아동 등록
      </Button>
      <Button
        v-if="hasActiveFilters"
        variant="ghost"
        class="clear-filters-button"
        type="button"
        aria-label="검색 조건 초기화"
        @click="clearFilters"
      >
        <RotateCcw class="w-4 h-4" style="margin-right: 6px;" />
        초기화
      </Button>
    </Card>

    <AsyncStatePanel
      v-if="isInitialLoading"
      kind="loading"
      title="아동 목록을 불러오는 중입니다"
      message="잠시만 기다려 주세요."
    />

    <AsyncStatePanel
      v-else-if="listStatus === 'error' && !hasRetainedStudents"
      :kind="listErrorKind"
      title="아동 목록을 불러오지 못했습니다"
      :message="listError ?? '잠시 후 다시 시도해 주세요.'"
      :retry-label="listUiError?.retryable ? '다시 시도' : undefined"
      :action-label="hasActiveFilters ? '검색 조건 초기화' : undefined"
      @retry="studentStore.loadList()"
      @action="clearFilters"
    />

    <AsyncStatePanel
      v-else-if="isEmptyAccount"
      kind="empty"
      title="등록된 아동이 없습니다"
      message="첫 아동을 등록하면 학습 현황을 확인할 수 있습니다."
      action-label="아동 등록"
      @action="router.push({ name: 'student-create' })"
    />

    <AsyncStatePanel
      v-else-if="isEmptySearch"
      kind="empty"
      title="검색 조건에 맞는 아동이 없습니다"
      message="검색어나 필터를 변경해 주세요."
      action-label="검색 조건 초기화"
      @action="clearFilters"
    />

    <AsyncStatePanel
      v-if="listStatus === 'error' && hasRetainedStudents"
      :kind="listErrorKind"
      title="최신 목록을 불러오지 못했습니다"
      :message="`${listError ?? '잠시 후 다시 시도해 주세요.'} 이전 목록을 계속 표시합니다.`"
      :retry-label="listUiError?.retryable ? '다시 시도' : undefined"
      compact
      @retry="studentStore.loadList()"
    />

    <!-- Desktop Table View -->
    <Card
      v-if="
        !isInitialLoading &&
        !isEmptyAccount &&
        !isEmptySearch &&
        (listStatus !== 'error' || hasRetainedStudents)
      "
      class="table-card desktop-view"
    >
      <Table caption="담당 아동 목록">
        <TableHeader>
          <TableRow>
            <TableHead>아동</TableHead>
            <TableHead class="text-center">현재 학습</TableHead>
            <TableHead class="text-center">최근 학습</TableHead>
            <TableHead class="text-center">이번 주 상태</TableHead>
            <TableHead class="text-center">누적 학습</TableHead>
            <TableHead class="text-center"><span class="sr-only">정보 수정</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="student in students"
            :key="student.studentId"
            class="student-row"
            tabindex="0"
            :aria-label="`${student.name} 학습 현황으로 이동`"
            @click="openStudent(student)"
            @keydown.enter="openStudent(student)"
            @keydown.space.prevent="openStudent(student)"
          >
            <TableCell>
              <div class="student-link">
                <AuthenticatedImage v-if="student.imageUrl" :src="student.imageUrl" alt="" />
                <span v-else class="avatar" aria-hidden="true">{{
                  studentInitial(student.name)
                }}</span>
                <span class="student-identity">
                  <strong>{{ student.name }}</strong>
                  <small>
                    {{ student.school ?? '학교 미입력' }} ·
                    {{ student.age === null ? '나이 미입력' : `만 ${student.age}세` }}
                  </small>
                </span>
              </div>
            </TableCell>
            <TableCell class="text-center">{{ student.recentTraining ?? '완료 훈련 없음' }}</TableCell>
            <TableCell class="text-center">{{ formatLearningDate(student.recentLearningDate) }}</TableCell>
            <TableCell class="text-center">
              {{
                formatWeeklyParticipation(
                  student.weeklyParticipationRate,
                  student.weeklyCompletedCount,
                  student.weeklyScheduledCount,
                )
              }}
            </TableCell>
            <TableCell class="text-center">{{ formatLearningMinutes(student.totalLearningMinutes) }}</TableCell>
            <TableCell class="text-center">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                :aria-label="`${student.name} 정보 수정`"
                title="정보 수정"
                @click.stop="editStudent(student)"
                @keydown.stop
              >
                <Settings2 class="w-5 h-5 text-slate-500" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>

    <!-- Mobile Card View -->
    <div
      v-if="
        !isInitialLoading &&
        !isEmptyAccount &&
        !isEmptySearch &&
        (listStatus !== 'error' || hasRetainedStudents)
      "
      class="mobile-view"
    >
      <Card
        v-for="student in students"
        :key="student.studentId"
        class="student-mobile-card"
        tabindex="0"
        :aria-label="`${student.name} 학습 현황으로 이동`"
        @click="openStudent(student)"
        @keydown.enter="openStudent(student)"
        @keydown.space.prevent="openStudent(student)"
      >
        <div class="mobile-card-header">
          <div class="student-link">
            <AuthenticatedImage v-if="student.imageUrl" :src="student.imageUrl" alt="" />
            <span v-else class="avatar" aria-hidden="true">{{
              studentInitial(student.name)
            }}</span>
            <span class="student-identity">
              <strong>{{ student.name }}</strong>
              <small>
                {{ student.school ?? '학교 미입력' }} ·
                {{ student.age === null ? '나이 미입력' : `만 ${student.age}세` }}
              </small>
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="mobile-edit-btn"
            type="button"
            :aria-label="`${student.name} 정보 수정`"
            @click.stop="editStudent(student)"
            @keydown.stop
          >
            <Settings2 class="w-5 h-5 text-slate-500" />
          </Button>
        </div>
        <div class="mobile-card-body">
          <div class="stat-item">
            <span class="stat-label">현재 학습</span>
            <span class="stat-value">{{ student.recentTraining ?? '완료 훈련 없음' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">최근 학습</span>
            <span class="stat-value">{{ formatLearningDate(student.recentLearningDate) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">이번 주 상태</span>
            <span class="stat-value">
              {{
                formatWeeklyParticipation(
                  student.weeklyParticipationRate,
                  student.weeklyCompletedCount,
                  student.weeklyScheduledCount,
                )
              }}
            </span>
          </div>
        </div>
      </Card>
    </div>

    <nav v-if="totalPages > 1" class="pagination" aria-label="아동 목록 페이지 이동">
      <Button
        type="button"
        variant="outline"
        size="sm"
        :disabled="currentPage === 1 || listStatus === 'loading'"
        @click="goToPage(currentPage - 1)"
      >
        이전
      </Button>
      <Button
        v-for="(page, idx) in pageNumbers"
        :key="idx"
        type="button"
        size="sm"
        :variant="currentPage === page ? 'default' : (page === '...' ? 'ghost' : 'outline')"
        :disabled="listStatus === 'loading' || page === '...'"
        :aria-current="currentPage === page ? 'page' : undefined"
        :aria-label="page === '...' ? '생략됨' : `${page}페이지${currentPage === page ? ', 현재 페이지' : ''}`"
        @click="page !== '...' && goToPage(Number(page))"
      >
        {{ page }}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        :disabled="currentPage === totalPages || listStatus === 'loading'"
        @click="goToPage(currentPage + 1)"
      >
        다음
      </Button>
    </nav>
  </section>
</template>

<style scoped>
.student-dashboard {
  display: grid;
  width: 100%;
  min-width: 0;
  max-width: 1200px;
  margin: 0 auto;
  gap: 20px;
}
.page-heading {
  display: flex;
  min-height: 76px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--slate-200);
}
.page-heading h1,
.state-card h2 {
  margin: 0;
  color: var(--slate-950);
}
.page-heading h1 {
  font-size: 26px;
}
.state-card p {
  margin: 5px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}
.filters {
  display: grid;
  min-width: 0;
  align-items: center;
  grid-template-columns: minmax(200px, 1fr) 130px 130px auto auto;
  gap: 12px;
  padding: 14px;
}
.search {
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-icon {
  width: 20px;
  height: 20px;
  color: var(--slate-400);
}
.clear-filters-button {
  justify-self: end;
  color: var(--slate-500);
}
.state-card {
  display: grid;
  min-height: 240px;
  place-content: center;
  justify-items: center;
  gap: 12px;
  padding: 36px;
  text-align: center;
}
.table-card {
  min-width: 0;
  overflow-x: auto;
  padding: 0;
}
.table-card :deep(th:first-child),
.table-card :deep(td:first-child) {
  padding-left: 24px;
}
.table-card :deep(th:last-child),
.table-card :deep(td:last-child) {
  padding-right: 24px;
}
.student-row {
  cursor: pointer;
  transition: background-color 0.2s;
}
.student-row:hover {
  background-color: var(--slate-50);
}
.student-row:focus-visible {
  outline: 3px solid color-mix(in oklch, var(--ring) 48%, transparent);
  outline-offset: -3px;
}
.student-link {
  display: flex;
  min-width: 150px;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  overflow: hidden;
}
.student-identity {
  display: grid;
  justify-items: start;
  gap: 2px;
  overflow: hidden;
  width: 100%;
}
.student-identity strong {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.student-identity small {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 500;
}
.student-link img,
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
}
.student-link img {
  object-fit: cover;
}
.avatar {
  display: grid;
  background: var(--primary-50);
  color: var(--primary-700);
  font-weight: 800;
  place-items: center;
}
.pagination {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.mobile-view {
  display: none;
}
.student-mobile-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.student-mobile-card:hover {
  background-color: var(--slate-50);
}
.student-mobile-card:focus-visible {
  outline: 3px solid color-mix(in oklch, var(--ring) 48%, transparent);
  outline-offset: -3px;
}
.mobile-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.mobile-edit-btn {
  margin-left: auto;
}
.mobile-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}
.stat-item {
  display: flex;
  justify-content: space-between;
}
.stat-label {
  color: var(--slate-500);
}
.stat-value {
  font-weight: 500;
}

@media (max-width: 760px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
    min-height: 0;
  }
  .filters {
    grid-template-columns: 1fr 1fr;
    padding: 16px;
  }

  .search {
    grid-column: 1 / -1;
  }

  .student-create-button {
    grid-column: 1 / -1;
    justify-self: end;
  }

  .clear-filters-button {
    grid-column: 1 / -1;
    justify-self: end;
  }
}

@media (max-width: 480px) {
  .desktop-view {
    display: none;
  }
  .mobile-view {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .page-heading h1 {
    font-size: 22px;
  }

  .state-card {
    min-height: 200px;
    padding: 24px 16px;
  }

  .filters {
    grid-template-columns: 1fr;
  }

  .search {
    grid-column: auto;
  }

  .student-create-button {
    width: 100%;
  }

  .clear-filters-button {
    justify-self: center;
  }

  .pagination :deep([data-slot='button']) {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
