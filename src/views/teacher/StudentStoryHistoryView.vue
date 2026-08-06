<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import StoryPageAnalysisPanel from '@/components/teacher/story/StoryPageAnalysisPanel.vue'
import StoryPageNavigator from '@/components/teacher/story/StoryPageNavigator.vue'
import StoryPagePreview from '@/components/teacher/story/StoryPagePreview.vue'
import StoryPageEditor from '@/components/teacher/story/StoryPageEditor.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { asyncStateKind } from '@/features/teacher/error'
import {
  formatStoryActivityAt,
  normalizeStoryHistoryQuery,
  type StoryHistoryItem,
} from '@/features/teacher/story'
import { useStoryHistoryStore } from '@/stores/storyHistory'

type StoryReplayPreviewState = {
  readonly kind: 'read' | 'regression' | 'skip'
  readonly tokenIndexes: readonly number[]
  readonly fromTokenIndex: number | null
  readonly toTokenIndex: number
  readonly dwellMs: number
} | null

function parseStudentId(value: unknown): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  const parsed = typeof normalized === 'string' ? Number(normalized) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const route = useRoute()
const router = useRouter()
const storyStore = useStoryHistoryStore()
const {
  query,
  storyTemplates,
  stories,
  totalPages,
  selectedStory,
  selectedStoryId,
  currentPageNo,
  currentDetail,
  currentGazeAnalysis,
  selectedPage,
  selectedPageMetric,
  pageMetricContractError,
  listStatus,
  detailStatus,
  gazeStatus,
  listError,
  detailError,
  gazeError,
  listUiError,
  hasFilters,
} = storeToRefs(storyStore)
const studentId = computed(() => parseStudentId(route.params.id))
const invalidStudentId = computed(() => studentId.value === null)
const listErrorKind = computed(() => asyncStateKind(listUiError.value))
const filterFrom = ref('')
const filterTo = ref('')
const filterTemplateId = ref('')
const filterError = ref('')
const activeStoryReplayStep = ref<StoryReplayPreviewState>(null)
const storyHeatmapVisible = ref(false)

watch(
  studentId,
  async (id) => {
    if (id === null) {
      storyStore.reset()
      return
    }
    await storyStore.loadList(id)
    const latestStory = stories.value[0]
    if (studentId.value === id && selectedStoryId.value === null && latestStory) {
      await storyStore.selectAndLoad(id, latestStory.storyId)
    }
  },
  { immediate: true },
)

watch(
  () => selectedPage.value?.storyLineId ?? null,
  () => {
    activeStoryReplayStep.value = null
    storyHeatmapVisible.value = false
  },
)

async function applyFilters(): Promise<void> {
  const id = studentId.value
  if (id === null) return

  try {
    const normalized = normalizeStoryHistoryQuery({
      from: filterFrom.value || undefined,
      to: filterTo.value || undefined,
      storyTemplateId: filterTemplateId.value ? Number(filterTemplateId.value) : undefined,
      page: 0,
      size: query.value.size,
    })
    filterError.value = ''
    storyStore.setFilters(normalized)
    await storyStore.loadList(id)
  } catch (error) {
    filterError.value = error instanceof Error ? error.message : '조회 조건을 다시 확인해 주세요.'
  }
}

async function clearFilters(): Promise<void> {
  const id = studentId.value
  if (id === null) return
  filterFrom.value = ''
  filterTo.value = ''
  filterTemplateId.value = ''
  filterError.value = ''
  storyStore.setFilters({})
  await storyStore.loadList(id)
}

async function changePage(page: number): Promise<void> {
  const id = studentId.value
  if (id === null || page < 0 || (totalPages.value > 0 && page >= totalPages.value)) return
  storyStore.setPage(page)
  await storyStore.loadList(id)
}

function selectStory(story: StoryHistoryItem): void {
  const id = studentId.value
  if (id === null) return
  void storyStore.selectAndLoad(id, story.storyId)
}

function retryDetail(): void {
  const id = studentId.value
  const storyId = selectedStoryId.value
  if (id === null || storyId === null) return
  void storyStore.loadDetail(id, storyId)
}

function retryGaze(): void {
  const id = studentId.value
  const storyId = selectedStoryId.value
  if (id === null || storyId === null) return
  void storyStore.loadGazeAnalysis(id, storyId)
}

function refreshEditedPage(): void {
  retryDetail()
}
</script>

<template>
  <div class="story-history page-stack">
    <PageHeader title="이야기 이력" />

    <AsyncStatePanel
      v-if="invalidStudentId"
      kind="not-found"
      title="올바른 학습자를 선택해 주세요."
      message="이야기 이력을 조회하려면 아동 목록에서 대상을 다시 선택해야 합니다."
      action-label="아동 목록으로 이동"
      @action="router.push({ name: 'teacher-students' })"
    />

    <template v-else>
      <Card class="story-filter-card">
        <form class="story-filters" @submit.prevent="applyFilters">
          <div class="story-filter-field">
            <Label for="story-from">시작일</Label>
            <input id="story-from" v-model="filterFrom" type="date" />
          </div>
          <div class="story-filter-field">
            <Label for="story-to">종료일</Label>
            <input id="story-to" v-model="filterTo" type="date" />
          </div>
          <div class="story-filter-field story-filter-field--template">
            <Label for="story-template">이야기 종류</Label>
            <select id="story-template" v-model="filterTemplateId">
              <option value="">전체</option>
              <option
                v-for="template in storyTemplates"
                :key="template.storyTemplateId"
                :value="String(template.storyTemplateId)"
              >
                {{ template.title }}
              </option>
            </select>
          </div>
          <div class="story-filter-actions">
            <Button type="submit" :disabled="listStatus === 'loading'">조회</Button>
            <Button
              type="button"
              variant="outline"
              :disabled="listStatus === 'loading' || !hasFilters"
              @click="clearFilters"
            >
              초기화
            </Button>
          </div>
        </form>
        <p v-if="filterError" class="story-filter-error" role="alert">{{ filterError }}</p>
      </Card>

      <section class="story-workspace" aria-labelledby="story-selector-title">
        <div class="story-selector">
          <div class="story-selector-heading">
            <div>
              <h2 id="story-selector-title">이야기 선택</h2>
            </div>
          </div>

          <AsyncStatePanel
            v-if="listStatus === 'loading' && stories.length === 0"
            kind="loading"
            message="이야기 이력을 불러오고 있습니다."
            compact
          />
          <AsyncStatePanel
            v-else-if="listStatus === 'error'"
            :kind="listErrorKind"
            :message="listError ?? '이야기 이력을 불러오지 못했습니다.'"
            retry-label="다시 불러오기"
            compact
            @retry="storyStore.loadList(studentId!)"
          />
          <AsyncStatePanel
            v-else-if="listStatus === 'success' && stories.length === 0"
            kind="empty"
            title="아직 이야기를 읽지 않았어요"
            message="선택한 기간과 이야기 종류에 해당하는 읽기 이력이 없습니다."
            compact
          />
          <div
            v-else
            class="story-title-tabs"
            role="tablist"
            aria-label="이야기 선택"
            :aria-busy="listStatus === 'loading'"
          >
            <button
              v-for="story in stories"
              :id="`story-selector-tab-${story.storyId}`"
              :key="story.storyId"
              class="story-title-tab"
              :class="{ 'is-selected': selectedStoryId === story.storyId }"
              type="button"
              role="tab"
              :aria-selected="selectedStoryId === story.storyId"
              aria-controls="story-selected-panel"
              :tabindex="selectedStoryId === story.storyId ? 0 : -1"
              @click="selectStory(story)"
            >
              <strong>{{ story.title }}</strong>
              <small v-if="story.chapterTitle" class="story-title-tab__chapter">{{ story.chapterTitle }}</small>
              <time :datetime="story.activityAt">
                {{ formatStoryActivityAt(story.activityAt) }}
              </time>
              <span class="story-title-tab__progress">
                {{ story.generationProgress }}% ·
                {{ story.readLineCount }}/{{ story.totalLineCount }}페이지
              </span>
            </button>
          </div>

          <nav v-if="totalPages > 1" class="story-pagination" aria-label="이야기 목록 페이지">
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="query.page <= 0 || listStatus === 'loading'"
              @click="changePage(query.page - 1)"
            >
              이전
            </Button>
            <span>{{ query.page + 1 }} / {{ totalPages }}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="query.page + 1 >= totalPages || listStatus === 'loading'"
              @click="changePage(query.page + 1)"
            >
              다음
            </Button>
          </nav>
        </div>

        <div
          id="story-selected-panel"
          class="story-detail-shell"
          :role="selectedStory ? 'tabpanel' : undefined"
          :aria-labelledby="
            selectedStory ? `story-selector-tab-${selectedStory.storyId}` : undefined
          "
        >
          <template v-if="selectedStory">
            <div class="story-page-detail">
              <p
                v-if="detailStatus === 'loading' && currentDetail"
                class="story-detail-updating"
                role="status"
              >
                최신 이야기 페이지를 불러오고 있습니다.
              </p>
              <AsyncStatePanel
                v-if="detailStatus === 'loading' && !currentDetail"
                kind="loading"
                message="이야기 페이지를 불러오고 있습니다."
                compact
              />
              <AsyncStatePanel
                v-else-if="detailStatus === 'error' && !currentDetail"
                kind="error"
                :message="detailError ?? '이야기 상세를 불러오지 못했습니다.'"
                retry-label="다시 불러오기"
                compact
                @retry="retryDetail"
              />
              <template v-else-if="currentDetail">
                <AsyncStatePanel
                  v-if="currentDetail.totalPages === 0 || !selectedPage"
                  kind="empty"
                  title="표시할 이야기 페이지가 없어요"
                  message="이야기 본문이 생성되면 이곳에서 페이지별 기록을 확인할 수 있습니다."
                  compact
                />
                <template v-else>
                  <div class="story-page-layout">
                    <div class="story-page-main">
                        <StoryPagePreview
                          :student-id="studentId!"
                          :story-id="selectedStory.storyId"
                          :page="selectedPage"
                          :active-replay-kind="activeStoryReplayStep?.kind ?? null"
                          :active-replay-token-indexes="activeStoryReplayStep?.tokenIndexes ?? []"
                          :active-replay-from-token-index="activeStoryReplayStep?.fromTokenIndex ?? null"
                          :active-replay-to-token-index="activeStoryReplayStep?.toTokenIndex ?? null"
                          :active-replay-dwell-ms="activeStoryReplayStep?.dwellMs ?? 0"
                          :heatmap-words="currentGazeAnalysis?.wordMetrics.filter((word) => word.storyLineId === selectedPage?.storyLineId && word.pageNo === selectedPage?.pageNo) ?? []"
                          :heatmap-events="currentGazeAnalysis?.replay?.events.filter((event) => event.pageNo === selectedPage?.pageNo) ?? []"
                          :heatmap-visible="storyHeatmapVisible"
                        />
                      <StoryPageEditor
                        v-if="selectedPage.editable"
                        :student-id="studentId!"
                        :story-id="selectedStory.storyId"
                        :page="selectedPage"
                        @updated="refreshEditedPage"
                      />
                    </div>
                    <StoryPageAnalysisPanel
                      :story-status="selectedStory.gazeAnalysisStatus"
                      :page="selectedPage"
                      :analysis="currentGazeAnalysis"
                      :metric="selectedPageMetric"
                      :request-status="gazeStatus"
                      :error="gazeError"
                      :contract-error="pageMetricContractError"
                      :heatmap-visible="storyHeatmapVisible"
                      @replay-step-change="activeStoryReplayStep = $event"
                      @heatmap-visibility-change="storyHeatmapVisible = $event"
                      @retry="retryGaze"
                    />
                  </div>
                  <StoryPageNavigator
                    :current-page-no="currentPageNo"
                    :total-pages="currentDetail.totalPages"
                    @previous="storyStore.goToPreviousPage"
                    @next="storyStore.goToNextPage"
                  />
                </template>
              </template>
            </div>
          </template>
          <AsyncStatePanel
            v-else
            kind="empty"
            title="아직 이야기를 읽지 않았어요"
            message="위 이야기 제목 탭에서 상세 기록을 확인할 이야기를 선택해 주세요."
          />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.story-history {
  width: 100%;
}

.story-filter-card,
.story-workspace {
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-lg);
  background: var(--white);
  box-shadow: var(--shadow-card);
}

.story-filter-card {
  padding: 18px 20px;
}

.story-filters {
  display: grid;
  align-items: end;
  gap: 14px;
  grid-template-columns: minmax(148px, 0.8fr) minmax(148px, 0.8fr) minmax(200px, 1.3fr) auto;
}

.story-filter-field {
  display: grid;
  gap: 7px;
}

.story-filter-field input,
.story-filter-field select {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--slate-300);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--slate-800);
}

.story-filter-actions {
  display: flex;
  gap: 8px;
}

.story-filter-error {
  margin: 10px 0 0;
  color: var(--danger-600);
  font-size: 12px;
}

.story-workspace {
  min-width: 0;
  min-height: 620px;
  padding: 24px;
}

.story-selector {
  padding-bottom: 22px;
  border-bottom: 1px solid var(--slate-200);
}

.story-selector-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.story-selector-heading h2,
.story-selector-heading p {
  margin: 0;
}

.story-selector-heading h2 {
  color: var(--slate-900);
  font-size: 17px;
  font-weight: 700;
}

.story-selector-heading p {
  margin-top: 3px;
  color: var(--slate-500);
  font-size: 12px;
}

.story-selector-heading > strong {
  color: var(--primary-700);
  font-size: 13px;
}

.story-title-tabs {
  display: flex;
  gap: 10px;
  margin-top: 18px;
  overflow-x: auto;
  padding: 2px 2px 6px;
  scrollbar-width: thin;
}

.story-title-tabs[aria-busy='true'] {
  opacity: 0.64;
}

.story-title-tab {
  position: relative;
  display: grid;
  min-width: 190px;
  max-width: 260px;
  flex: 1 0 190px;
  gap: 5px;
  padding: 14px 16px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  background: var(--white);
  color: var(--slate-800);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    box-shadow 150ms ease;
}

.story-title-tab:hover {
  border-color: var(--primary-300);
  background: var(--interactive-hover-background);
}

.story-title-tab.is-selected {
  border-color: var(--primary-500);
  background: var(--active-selection-background);
  box-shadow: 0 0 0 1px color-mix(in oklch, var(--primary-500) 24%, transparent);
}

.story-title-tab.is-selected::after {
  position: absolute;
  right: 16px;
  bottom: -1px;
  left: 16px;
  height: 3px;
  border-radius: 999px 999px 0 0;
  background: var(--primary-600);
  content: '';
}

.story-title-tab strong {
  overflow: hidden;
  color: var(--primary-700);
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-title-tab__chapter {
  overflow: hidden;
  color: var(--slate-700);
  font-size: 12px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-title-tab time {
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 600;
}

.story-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-top: 16px;
}

.story-pagination span {
  color: var(--slate-600);
  font-size: 12px;
  font-weight: 650;
}

.story-detail-shell {
  display: grid;
  min-width: 0;
  align-content: start;
  padding-top: 24px;
}

.story-detail-shell > :deep(.async-state-panel) {
  min-height: 360px;
  border: 0;
}

.story-detail-summary {
  padding-top: 18px;
}

.story-detail-summary dl {
  display: grid;
  margin: 0;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.story-detail-summary dl > div {
  padding: 16px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  background: var(--slate-50);
}

.story-detail-summary dt {
  color: var(--slate-500);
  font-size: 11px;
}

.story-detail-summary dd {
  margin: 5px 0 0;
  color: var(--slate-800);
  font-size: 14px;
  font-weight: 700;
}

.story-page-detail {
  display: grid;
  min-height: 430px;
  gap: 18px;
  padding-top: 20px;
}

.story-page-detail > :deep(.async-state-panel) {
  min-height: 220px;
}

.story-page-layout {
  display: grid;
  min-width: 0;
  align-items: start;
  gap: 18px;
  grid-template-columns: minmax(0, 1.65fr) minmax(280px, 0.85fr);
  animation: story-page-fade 140ms ease-out;
}

.story-page-main {
  display: grid;
  min-width: 0;
  gap: 18px;
}

.story-detail-updating {
  margin: 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 11px;
}

@keyframes story-page-fade {
  from {
    opacity: 0.45;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .story-title-tab,
  .story-page-layout {
    animation: none;
    transition: none;
  }
}

@media (max-width: 1040px) {
  .story-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .story-filter-actions {
    justify-content: flex-end;
  }

  .story-page-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .story-filter-card,
  .story-workspace {
    padding: 16px;
  }

  .story-filters {
    grid-template-columns: 1fr;
  }

  .story-filter-actions {
    justify-content: stretch;
  }

  .story-filter-actions > * {
    flex: 1;
  }

  .story-selector-heading {
    flex-direction: column;
  }

  .story-title-tab {
    min-width: 168px;
    flex-basis: 168px;
  }

  .story-detail-summary dl {
    grid-template-columns: 1fr;
  }
}
</style>
