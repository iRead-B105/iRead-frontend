<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { asyncStateKind } from '@/features/teacher/error'
import {
  formatStoryActivityAt,
  normalizeStoryHistoryQuery,
  storyGazeStatusLabel,
  storyReadingStatusLabel,
  storyStatusLabel,
  type StoryHistoryItem,
} from '@/features/teacher/story'
import { useStoryHistoryStore } from '@/stores/storyHistory'

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
  totalElements,
  totalPages,
  selectedStory,
  selectedStoryId,
  listStatus,
  listError,
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

watch(
  studentId,
  async (id) => {
    if (id === null) {
      storyStore.reset()
      return
    }
    await storyStore.loadList(id)
  },
  { immediate: true },
)

async function applyFilters(): Promise<void> {
  const id = studentId.value
  if (id === null) return

  try {
    const normalized = normalizeStoryHistoryQuery({
      from: filterFrom.value || undefined,
      to: filterTo.value || undefined,
      storyTemplateId: filterTemplateId.value
        ? Number(filterTemplateId.value)
        : undefined,
      page: 0,
      size: query.value.size,
    })
    filterError.value = ''
    storyStore.setFilters(normalized)
    await storyStore.loadList(id)
  } catch (error) {
    filterError.value =
      error instanceof Error ? error.message : '조회 조건을 다시 확인해 주세요.'
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
  storyStore.selectStory(story.storyId)
}

function storyStatusClass(story: StoryHistoryItem): string {
  return story.storyStatus === 'IN_PROGRESS' ? 'is-running' : 'is-completed'
}

function gazeStatusClass(story: StoryHistoryItem): string {
  return `is-${story.gazeAnalysisStatus.toLowerCase().replace('_', '-')}`
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
            <Label for="story-template">원본 이야기 종류</Label>
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

      <div class="story-history-layout">
        <section class="story-list-panel" aria-labelledby="story-list-title">
          <div class="story-list-heading">
            <div>
              <h2 id="story-list-title">이야기 목록</h2>
              <p>최근 읽기 활동 순으로 표시됩니다.</p>
            </div>
            <strong>{{ totalElements }}개</strong>
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
          <div v-else class="story-list" :aria-busy="listStatus === 'loading'">
            <button
              v-for="story in stories"
              :key="story.storyId"
              class="story-list-item"
              :class="{ 'is-selected': selectedStoryId === story.storyId }"
              type="button"
              :aria-pressed="selectedStoryId === story.storyId"
              @click="selectStory(story)"
            >
              <span class="story-list-item__thumbnail" aria-hidden="true">
                <img v-if="story.imageUrl" :src="story.imageUrl" alt="" />
                <span v-else>이야기</span>
              </span>
              <span class="story-list-item__content">
                <span class="story-list-item__top">
                  <strong>{{ story.title }}</strong>
                  <time :datetime="story.activityAt">
                    {{ formatStoryActivityAt(story.activityAt) }}
                  </time>
                </span>
                <span class="story-list-item__badges">
                  <span class="story-badge" :class="storyStatusClass(story)">
                    {{ storyStatusLabel(story.storyStatus) }}
                  </span>
                  <span class="story-badge is-reading">
                    {{ storyReadingStatusLabel(story) }}
                  </span>
                  <span class="story-badge" :class="gazeStatusClass(story)">
                    {{ storyGazeStatusLabel(story.gazeAnalysisStatus) }}
                  </span>
                </span>
                <span class="story-progress">
                  <span>
                    <span :style="{ width: `${story.readingProgress}%` }" />
                  </span>
                  <small>{{ story.readLineCount }}/{{ story.totalLineCount }}문장</small>
                </span>
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
        </section>

        <section class="story-detail-shell" aria-labelledby="story-detail-title">
          <template v-if="selectedStory">
            <div class="story-detail-heading">
              <div>
                <p>선택한 이야기</p>
                <h2 id="story-detail-title">{{ selectedStory.title }}</h2>
              </div>
              <time :datetime="selectedStory.activityAt">
                최근 활동 {{ formatStoryActivityAt(selectedStory.activityAt) }}
              </time>
            </div>
            <div class="story-detail-summary">
              <dl>
                <div>
                  <dt>이야기 상태</dt>
                  <dd>{{ storyStatusLabel(selectedStory.storyStatus) }}</dd>
                </div>
                <div>
                  <dt>읽기 상태</dt>
                  <dd>{{ storyReadingStatusLabel(selectedStory) }}</dd>
                </div>
                <div>
                  <dt>시선 분석</dt>
                  <dd>{{ storyGazeStatusLabel(selectedStory.gazeAnalysisStatus) }}</dd>
                </div>
              </dl>
            </div>
          </template>
          <AsyncStatePanel
            v-else
            kind="empty"
            title="아직 이야기를 읽지 않았어요"
            message="왼쪽 이야기 목록에서 상세 기록을 확인할 이야기를 선택해 주세요."
          />
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.story-history {
  width: 100%;
}

.story-filter-card,
.story-list-panel,
.story-detail-shell {
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

.story-history-layout {
  display: grid;
  min-height: 560px;
  align-items: stretch;
  gap: 18px;
  grid-template-columns: minmax(320px, 0.78fr) minmax(0, 1.7fr);
}

.story-list-panel,
.story-detail-shell {
  min-width: 0;
  padding: 20px;
}

.story-list-heading,
.story-detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--slate-200);
}

.story-list-heading h2,
.story-detail-heading h2,
.story-list-heading p,
.story-detail-heading p {
  margin: 0;
}

.story-list-heading h2,
.story-detail-heading h2 {
  font-size: 18px;
}

.story-list-heading p,
.story-detail-heading p,
.story-detail-heading time {
  margin-top: 3px;
  color: var(--slate-500);
  font-size: 12px;
}

.story-list-heading > strong {
  color: var(--primary-700);
  font-size: 13px;
}

.story-list {
  display: grid;
  gap: 10px;
  padding-top: 14px;
}

.story-list[aria-busy='true'] {
  opacity: 0.64;
}

.story-list-item {
  display: grid;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  background: var(--white);
  color: var(--slate-800);
  text-align: left;
  grid-template-columns: 58px minmax(0, 1fr);
  transition:
    border-color 150ms ease,
    background-color 150ms ease;
}

.story-list-item:hover {
  border-color: var(--primary-100);
  background: var(--interactive-hover-background);
}

.story-list-item.is-selected {
  border-color: var(--primary-500);
  background: var(--active-selection-background);
}

.story-list-item__thumbnail {
  display: grid;
  width: 58px;
  height: 72px;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: linear-gradient(145deg, var(--primary-50), var(--slate-100));
  color: var(--primary-700);
  font-size: 11px;
  font-weight: 700;
  place-items: center;
}

.story-list-item__thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.story-list-item__content {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.story-list-item__top {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.story-list-item__top strong {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-list-item__top time {
  color: var(--slate-500);
  font-size: 11px;
}

.story-list-item__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.story-badge {
  padding: 3px 7px;
  border-radius: 999px;
  background: var(--slate-100);
  color: var(--slate-600);
  font-size: 10px;
  font-weight: 650;
}

.story-badge.is-running,
.story-badge.is-not-collected {
  background: var(--slate-100);
}

.story-badge.is-completed,
.story-badge.is-available {
  background: color-mix(in oklch, var(--success-600) 12%, white);
  color: color-mix(in oklch, var(--success-600) 82%, black);
}

.story-badge.is-reading {
  background: var(--primary-50);
  color: var(--primary-700);
}

.story-badge.is-failed {
  background: color-mix(in oklch, var(--danger-600) 10%, white);
  color: var(--danger-600);
}

.story-progress {
  display: grid;
  align-items: center;
  gap: 7px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.story-progress > span {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--slate-100);
}

.story-progress > span > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary-500);
}

.story-progress small {
  color: var(--slate-500);
  font-size: 10px;
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
  align-content: start;
}

.story-detail-shell > :deep(.async-state-panel) {
  min-height: 430px;
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

@media (prefers-reduced-motion: reduce) {
  .story-list-item {
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

  .story-history-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .story-filter-card,
  .story-list-panel,
  .story-detail-shell {
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

  .story-detail-heading,
  .story-list-heading {
    flex-direction: column;
  }

  .story-detail-summary dl {
    grid-template-columns: 1fr;
  }
}
</style>
