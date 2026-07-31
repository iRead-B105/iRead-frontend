<script setup lang="ts">
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import { formatGazeDuration } from '@/features/teacher/gaze'
import type {
  StoryGazeAnalysis,
  StoryGazeAnalysisStatus,
  StoryPageGazeMetric,
  StoryRequestStatus,
} from '@/features/teacher/story'

defineProps<{
  storyStatus: StoryGazeAnalysisStatus
  analysis: StoryGazeAnalysis | null
  metric: StoryPageGazeMetric | null
  requestStatus: StoryRequestStatus
  error: string | null
  contractError: string | null
}>()

defineEmits<{
  retry: []
}>()

function formatOffset(milliseconds: number): string {
  return `${Number((milliseconds / 1_000).toFixed(2))}초`
}
</script>

<template>
  <aside class="story-page-analysis" aria-labelledby="story-page-analysis-title">
    <header class="story-page-analysis__heading">
      <p>선택 페이지</p>
      <h3 id="story-page-analysis-title">시선 분석 기록</h3>
    </header>

    <AsyncStatePanel
      v-if="storyStatus === 'NOT_COLLECTED'"
      kind="empty"
      title="시선 분석 데이터가 없어요"
      message="이 이야기에서 수집된 시선 기록이 없습니다."
      compact
    />
    <AsyncStatePanel
      v-else-if="storyStatus === 'RUNNING'"
      kind="loading"
      title="시선 분석을 준비하고 있어요"
      message="분석이 완료되면 페이지별 결과를 확인할 수 있습니다."
      compact
    />
    <AsyncStatePanel
      v-else-if="storyStatus === 'FAILED'"
      kind="error"
      title="시선 분석을 완료하지 못했어요"
      message="최신 시선 수집 또는 분석 작업이 실패했습니다."
      compact
    />
    <AsyncStatePanel
      v-else-if="requestStatus === 'loading' && analysis === null"
      kind="loading"
      title="시선 분석을 불러오고 있어요"
      message="이야기 페이지는 먼저 확인할 수 있습니다."
      compact
    />
    <AsyncStatePanel
      v-else-if="requestStatus === 'error'"
      kind="error"
      title="시선 분석을 불러오지 못했어요"
      :message="error ?? '잠시 후 다시 시도해 주세요.'"
      retry-label="다시 불러오기"
      compact
      @retry="$emit('retry')"
    />
    <AsyncStatePanel
      v-else-if="contractError"
      kind="error"
      title="페이지 분석을 연결하지 못했어요"
      :message="contractError"
      retry-label="다시 불러오기"
      compact
      @retry="$emit('retry')"
    />
    <AsyncStatePanel
      v-else-if="requestStatus === 'success' && analysis === null"
      kind="empty"
      title="분석 결과가 아직 준비되지 않았어요"
      message="최신 상태를 확인한 뒤 다시 시도해 주세요."
      compact
    />
    <AsyncStatePanel
      v-else-if="analysis && metric === null"
      kind="empty"
      title="이 페이지의 분석 기록이 없어요"
      message="이야기 전체 분석은 완료됐지만 현재 페이지에 저장된 시선 지표가 없습니다."
      compact
    />

    <template v-else-if="analysis && metric">
      <p v-if="requestStatus === 'loading'" class="story-page-analysis__updating" role="status">
        최신 시선 분석을 다시 불러오고 있습니다.
      </p>

      <dl class="story-page-analysis__metrics">
        <div>
          <dt>총 시선 체류 시간</dt>
          <dd>{{ formatGazeDuration(metric.dwellDurationMs) }}</dd>
        </div>
        <div>
          <dt>평균 시선 체류 시간</dt>
          <dd>
            {{
              metric.averageFixationTimeMs === null
                ? '-'
                : formatGazeDuration(metric.averageFixationTimeMs)
            }}
          </dd>
        </div>
        <div>
          <dt>시선 체류 횟수</dt>
          <dd>{{ metric.fixationCount }}회</dd>
        </div>
        <div>
          <dt>되돌아보기 횟수</dt>
          <dd>{{ metric.regressionCount }}회</dd>
        </div>
      </dl>

      <dl class="story-page-analysis__timing">
        <div>
          <dt>첫 시선 진입</dt>
          <dd>{{ formatOffset(metric.firstGazeOffsetMs) }}</dd>
        </div>
        <div>
          <dt>마지막 시선 이탈</dt>
          <dd>{{ formatOffset(metric.lastGazeOffsetMs) }}</dd>
        </div>
      </dl>

      <section class="story-page-regressions" aria-labelledby="story-page-regressions-title">
        <div class="story-page-regressions__heading">
          <h4 id="story-page-regressions-title">되돌아보기 상세</h4>
          <span>{{ metric.regressions.length }}회</span>
        </div>
        <p v-if="metric.regressions.length === 0" class="story-page-regressions__empty">
          이 페이지에서 되돌아본 기록이 없습니다.
        </p>
        <ol v-else>
          <li
            v-for="(regression, index) in metric.regressions"
            :key="`${regression.offsetMs}-${index}`"
          >
            <strong>{{ index + 1 }}번째</strong>
            <span>
              {{ regression.fromTokenIndex }}번 위치 → {{ regression.toTokenIndex }}번 위치
            </span>
            <time>{{ formatOffset(regression.offsetMs) }}</time>
          </li>
        </ol>
      </section>

      <section class="story-overall-summary" aria-labelledby="story-overall-summary-title">
        <h4 id="story-overall-summary-title">이야기 전체 요약</h4>
        <dl>
          <div>
            <dt>전체 체류</dt>
            <dd>{{ formatGazeDuration(analysis.totalVisitedDurationMs) }}</dd>
          </div>
          <div>
            <dt>전체 체류 횟수</dt>
            <dd>{{ analysis.totalVisitedCount }}회</dd>
          </div>
          <div>
            <dt>전체 되돌아보기</dt>
            <dd>{{ analysis.reverseReadCount }}회</dd>
          </div>
          <div>
            <dt>보정 상태</dt>
            <dd>{{ analysis.calibrationStatus }}</dd>
          </div>
        </dl>
      </section>
    </template>
  </aside>
</template>

<style scoped>
.story-page-analysis {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  background: var(--white);
}

.story-page-analysis__heading p,
.story-page-analysis__heading h3 {
  margin: 0;
}

.story-page-analysis__heading p {
  color: var(--primary-700);
  font-size: 11px;
}

.story-page-analysis__heading h3 {
  margin-top: 3px;
  color: var(--slate-900);
  font-size: 16px;
}

.story-page-analysis :deep(.async-state-panel) {
  min-height: 240px;
}

.story-page-analysis__updating {
  margin: 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 11px;
}

.story-page-analysis__metrics,
.story-page-analysis__timing,
.story-overall-summary dl {
  display: grid;
  margin: 0;
  gap: 8px;
}

.story-page-analysis__metrics {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.story-page-analysis__timing,
.story-overall-summary dl {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.story-page-analysis__metrics > div,
.story-page-analysis__timing > div,
.story-overall-summary dl > div {
  min-width: 0;
  padding: 11px 12px;
  border-radius: var(--radius-sm);
  background: var(--slate-50);
}

.story-page-analysis dt,
.story-overall-summary dt {
  color: var(--slate-500);
  font-size: 10px;
}

.story-page-analysis dd,
.story-overall-summary dd {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  color: var(--slate-900);
  font-size: 13px;
  font-weight: 750;
}

.story-page-regressions,
.story-overall-summary {
  display: grid;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--slate-200);
}

.story-page-regressions__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.story-page-regressions h4,
.story-overall-summary h4 {
  margin: 0;
  color: var(--slate-800);
  font-size: 13px;
}

.story-page-regressions__heading span,
.story-page-regressions__empty {
  color: var(--slate-500);
  font-size: 11px;
}

.story-page-regressions__empty {
  margin: 0;
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--slate-50);
}

.story-page-regressions ol {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.story-page-regressions li {
  display: grid;
  align-items: center;
  gap: 5px 8px;
  padding: 10px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-sm);
  grid-template-columns: auto 1fr auto;
}

.story-page-regressions strong,
.story-page-regressions span,
.story-page-regressions time {
  font-size: 10px;
}

.story-page-regressions strong {
  color: var(--slate-800);
}

.story-page-regressions span,
.story-page-regressions time {
  color: var(--slate-600);
}

@media (max-width: 540px) {
  .story-page-analysis__metrics,
  .story-page-analysis__timing,
  .story-overall-summary dl {
    grid-template-columns: 1fr;
  }

  .story-page-regressions li {
    grid-template-columns: 1fr;
  }
}
</style>
