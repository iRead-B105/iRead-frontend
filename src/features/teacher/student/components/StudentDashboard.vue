<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import SaveToast from '@/components/common/SaveToast.vue'
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
import {
  formatLearningDate,
  formatLearningMinutes,
  formatWeeklyParticipation,
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
  summary,
  summaryStatus,
  summaryError,
  hasActiveFilters,
} = storeToRefs(studentStore)

const keyword = ref(studentStore.query.keyword ?? '')
const age = ref(studentStore.query.age ? String(studentStore.query.age) : 'all')
const recentDays = ref(
  studentStore.query.recentDays ? String(studentStore.query.recentDays) : 'all',
)
let searchTimer: ReturnType<typeof setTimeout> | undefined

const currentPage = computed(() => studentStore.query.page + 1)
const pageNumbers = computed(() =>
  Array.from({ length: totalPages.value }, (_, index) => index + 1),
)
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
      mutation === 'created' ? '학습자가 등록되었습니다.' : '학습자가 삭제되었습니다.'
    showMutationNotice()
    const query = { ...route.query }
    delete query.studentSaved
    void router.replace({ query })
  }
  void Promise.all([studentStore.loadList(), studentStore.loadSummary()])
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <section class="student-dashboard">
    <header class="page-heading">
      <div>
        <h1>학습자 목록</h1>
      </div>
      <Button type="button" @click="router.push({ name: 'student-create' })">
        ＋ 학습자 등록
      </Button>
    </header>

    <SaveToast :visible="mutationNoticeVisible" :message="mutationNoticeMessage" inline />

    <Card class="filters">
      <label class="search" for="student-search">
        <span aria-hidden="true">⌕</span>
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
    </Card>

    <div class="summary" aria-label="담당 학습자 요약">
      <Card>
        <span>전체 학습자</span>
        <strong v-if="summary">{{ summary.totalStudents }}명</strong>
        <strong v-else>—</strong>
      </Card>
      <Card>
        <span>오늘 학습 예정</span>
        <strong v-if="summary">{{ summary.scheduledTodayCount }}명</strong>
        <strong v-else>—</strong>
      </Card>
      <Card v-if="hasActiveFilters">
        <span>검색 결과</span>
        <strong>{{ totalElements }}명</strong>
      </Card>
    </div>

    <AsyncStatePanel
      v-if="summaryStatus === 'error'"
      kind="error"
      title="학습자 요약을 불러오지 못했습니다"
      :message="summaryError ?? '잠시 후 다시 시도해 주세요.'"
      retry-label="요약 다시 불러오기"
      compact
      @retry="studentStore.loadSummary()"
    />

    <AsyncStatePanel
      v-if="isInitialLoading"
      kind="loading"
      title="학습자 목록을 불러오는 중입니다"
      message="잠시만 기다려 주세요."
    />

    <AsyncStatePanel
      v-else-if="listStatus === 'error' && !hasRetainedStudents"
      :kind="listErrorKind"
      title="학습자 목록을 불러오지 못했습니다"
      :message="listError ?? '잠시 후 다시 시도해 주세요.'"
      :retry-label="listUiError?.retryable ? '다시 시도' : undefined"
      :action-label="hasActiveFilters ? '검색 조건 초기화' : undefined"
      @retry="studentStore.loadList()"
      @action="clearFilters"
    />

    <AsyncStatePanel
      v-else-if="isEmptyAccount"
      kind="empty"
      title="등록된 학습자가 없습니다"
      message="첫 학습자를 등록하면 학습 현황을 확인할 수 있습니다."
      action-label="학습자 등록"
      @action="router.push({ name: 'student-create' })"
    />

    <AsyncStatePanel
      v-else-if="isEmptySearch"
      kind="empty"
      title="검색 조건에 맞는 학습자가 없습니다"
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

    <Card
      v-if="
        !isInitialLoading &&
        !isEmptyAccount &&
        !isEmptySearch &&
        (listStatus !== 'error' || hasRetainedStudents)
      "
      class="table-card"
    >
      <Table caption="담당 학습자 목록">
        <TableHeader>
          <TableRow>
            <TableHead>학습자</TableHead>
            <TableHead>학교·만 나이</TableHead>
            <TableHead>최근 훈련</TableHead>
            <TableHead>최근 학습</TableHead>
            <TableHead>이번 주 참여</TableHead>
            <TableHead>누적 학습</TableHead>
            <TableHead><span class="sr-only">관리 메뉴</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="student in students" :key="student.studentId">
            <TableCell>
              <Button
                class="student-link"
                variant="ghost"
                type="button"
                @click="openStudent(student)"
              >
                <img v-if="student.imageUrl" :src="student.imageUrl" alt="" />
                <span v-else class="avatar" aria-hidden="true">{{
                  studentInitial(student.name)
                }}</span>
                <strong>{{ student.name }}</strong>
              </Button>
            </TableCell>
            <TableCell>
              {{ student.school ?? '학교 미입력' }} ·
              {{ student.age === null ? '나이 미입력' : `만 ${student.age}세` }}
            </TableCell>
            <TableCell>{{ student.recentTraining ?? '완료 훈련 없음' }}</TableCell>
            <TableCell>{{ formatLearningDate(student.recentLearningDate) }}</TableCell>
            <TableCell>
              {{
                formatWeeklyParticipation(
                  student.weeklyParticipationRate,
                  student.weeklyCompletedCount,
                  student.weeklyScheduledCount,
                )
              }}
            </TableCell>
            <TableCell>{{ formatLearningMinutes(student.totalLearningMinutes) }}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    :aria-label="`${student.name} 관리 메뉴`"
                  >
                    ···
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem @select="openStudent(student)">학습자 상세</DropdownMenuItem>
                  <DropdownMenuItem @select="editStudent(student)">정보 수정</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>

    <nav v-if="totalPages > 1" class="pagination" aria-label="학습자 목록 페이지 이동">
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
        v-for="page in pageNumbers"
        :key="page"
        type="button"
        size="sm"
        :variant="currentPage === page ? 'default' : 'outline'"
        :disabled="listStatus === 'loading'"
        :aria-current="currentPage === page ? 'page' : undefined"
        :aria-label="`${page}페이지${currentPage === page ? ', 현재 페이지' : ''}`"
        @click="goToPage(page)"
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
  min-width: 0;
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
  grid-template-columns: minmax(260px, 1fr) 150px 150px;
  gap: 10px;
  padding: 14px;
}
.search {
  display: flex;
  align-items: center;
  gap: 8px;
}
.search > span {
  color: var(--slate-400);
  font-size: 20px;
}
.summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.summary > * {
  display: grid;
  min-height: 88px;
  align-content: center;
  gap: 6px;
  padding: 16px 18px;
}
.summary span {
  color: var(--slate-500);
  font-size: 12px;
}
.summary strong {
  color: var(--slate-900);
  font-size: 22px;
}
.summary small {
  color: var(--danger-600);
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
.student-link {
  display: inline-flex;
  justify-content: flex-start;
  gap: 10px;
  padding: 0;
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
@media (max-width: 760px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
    min-height: 0;
  }
  .filters,
  .summary {
    grid-template-columns: 1fr;
  }

  .filters {
    padding: 12px;
  }

  .page-heading > :deep([data-slot='button']) {
    align-self: flex-start;
  }
}

@media (max-width: 480px) {
  .page-heading h1 {
    font-size: 22px;
  }

  .state-card {
    min-height: 200px;
    padding: 24px 16px;
  }

  .pagination :deep([data-slot='button']) {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
