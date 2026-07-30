<script setup lang="ts">
import { computed } from 'vue'
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import GazeAnalysisPanel from '@/components/teacher/GazeAnalysisPanel.vue'
import { formatGazeDuration, type GazeAnalysisState } from '@/features/teacher/gaze'
import type {
  StoryGazeAnalysis,
  StoryGazeAnalysisStatus,
  StoryRequestStatus,
} from '@/features/teacher/story'

const props = defineProps<{
  storyStatus: StoryGazeAnalysisStatus
  analysis: StoryGazeAnalysis | null
  requestStatus: StoryRequestStatus
  error: string | null
}>()

defineEmits<{
  retry: []
}>()

const aggregateState = computed<GazeAnalysisState | null>(() => {
  if (props.analysis === null) return null
  return {
    status: 'AVAILABLE',
    analysis: {
      gazeSessionId: props.analysis.gazeSessionId,
      gazeAnalysisResultId: props.analysis.gazeAnalysisId,
      totalVisitedDurationMs: props.analysis.totalVisitedDurationMs,
      totalVisitedCount: props.analysis.totalVisitedCount,
      reverseReadCount: props.analysis.reverseReadCount,
      avgVisitedDurationMs: props.analysis.avgVisitedDurationMs,
    },
  }
})

const maximumSentenceDuration = computed(() =>
  Math.max(0, ...(props.analysis?.sentenceMetrics.map((metric) => metric.dwellDurationMs) ?? [])),
)

function sentenceBarWidth(duration: number): string {
  return maximumSentenceDuration.value === 0
    ? '0%'
    : `${Math.max(4, Math.round((duration / maximumSentenceDuration.value) * 100))}%`
}

function formatOffset(milliseconds: number): string {
  return `${Number((milliseconds / 1_000).toFixed(2))}초`
}
</script>

<template>
  <div class="story-gaze-tab">
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
      message="분석이 완료되면 이 탭에서 결과를 확인할 수 있습니다."
      compact
    />
    <AsyncStatePanel
      v-else-if="storyStatus === 'FAILED'"
      kind="error"
      title="시선 분석을 완료하지 못했어요"
      message="최신 시선 수집 또는 분석 작업이 실패했습니다."
      compact
    />
    <template v-else>
      <AsyncStatePanel
        v-if="requestStatus === 'success' && analysis === null"
        kind="empty"
        title="분석 결과가 아직 준비되지 않았어요"
        message="최신 상태를 확인한 뒤 다시 시도해 주세요."
        compact
      />
      <GazeAnalysisPanel
        v-else
        title="이야기 시선 분석"
        :state="aggregateState"
        :status="requestStatus"
        :error="error"
        compact
        @retry="$emit('retry')"
      />

      <template v-if="requestStatus === 'success' && analysis">
        <section class="story-gaze-section" aria-labelledby="sentence-gaze-title">
          <div class="story-gaze-section__heading">
            <h3 id="sentence-gaze-title">문장별 시선 분석</h3>
            <span>{{ analysis.sentenceMetrics.length }}개 문장</span>
          </div>
          <AsyncStatePanel
            v-if="analysis.sentenceMetrics.length === 0"
            kind="empty"
            title="문장별 분석 결과가 없어요"
            message="저장된 문장별 시선 지표가 없습니다."
            compact
          />
          <ol v-else class="sentence-gaze-list">
            <li v-for="metric in analysis.sentenceMetrics" :key="metric.storyLineId">
              <div class="sentence-gaze-list__heading">
                <span>{{ metric.sequenceNo }}</span>
                <p>{{ metric.surfaceText }}</p>
              </div>
              <div class="sentence-gaze-list__bar" aria-hidden="true">
                <span :style="{ width: sentenceBarWidth(metric.dwellDurationMs) }"></span>
              </div>
              <dl>
                <div>
                  <dt>응시 시간</dt>
                  <dd>{{ formatGazeDuration(metric.dwellDurationMs) }}</dd>
                </div>
                <div>
                  <dt>응시 횟수</dt>
                  <dd>{{ metric.fixationCount }}회</dd>
                </div>
                <div>
                  <dt>첫 진입</dt>
                  <dd>{{ formatOffset(metric.firstGazeOffsetMs) }}</dd>
                </div>
                <div>
                  <dt>마지막 이탈</dt>
                  <dd>{{ formatOffset(metric.lastGazeOffsetMs) }}</dd>
                </div>
              </dl>
            </li>
          </ol>
        </section>

        <section class="story-gaze-section" aria-labelledby="regression-title">
          <div class="story-gaze-section__heading">
            <h3 id="regression-title">역행 기록</h3>
            <span>{{ analysis.regressions.length }}회</span>
          </div>
          <AsyncStatePanel
            v-if="analysis.regressions.length === 0"
            kind="empty"
            title="역행 기록이 없어요"
            message="저장된 역행 기록이 없습니다."
            compact
          />
          <ol v-else class="regression-list">
            <li v-for="(regression, index) in analysis.regressions" :key="`${regression.offsetMs}-${index}`">
              <strong>{{ index + 1 }}번째 역행</strong>
              <span>
                {{ regression.fromTargetIndex }}번 문장 {{ regression.fromTokenIndex }}번 위치 →
                {{ regression.toTargetIndex }}번 문장 {{ regression.toTokenIndex }}번 위치
              </span>
              <time>{{ formatOffset(regression.offsetMs) }}</time>
            </li>
          </ol>
        </section>

        <dl class="analysis-meta">
          <div>
            <dt>보정 상태</dt>
            <dd>{{ analysis.calibrationStatus }}</dd>
          </div>
          <div>
            <dt>분석 기준</dt>
            <dd>{{ analysis.analysisMeta?.calculationSource ?? '-' }}</dd>
          </div>
          <div>
            <dt>세션 길이</dt>
            <dd>
              {{
                analysis.analysisMeta
                  ? formatGazeDuration(analysis.analysisMeta.gazeSessionDurationMs)
                  : '-'
              }}
            </dd>
          </div>
        </dl>
      </template>
    </template>
  </div>
</template>

<style scoped>
.story-gaze-tab,
.story-gaze-section {
  display: grid;
  gap: 16px;
}

.story-gaze-section {
  padding-top: 20px;
  border-top: 1px solid var(--slate-200);
}

.story-gaze-section__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.story-gaze-section__heading h3 {
  margin: 0;
  color: var(--slate-900);
  font-size: 15px;
}

.story-gaze-section__heading span {
  color: var(--slate-500);
  font-size: 11px;
}

.sentence-gaze-list,
.regression-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sentence-gaze-list > li {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  background: var(--white);
}

.sentence-gaze-list__heading {
  display: grid;
  align-items: start;
  gap: 10px;
  grid-template-columns: 24px 1fr;
}

.sentence-gaze-list__heading > span {
  display: grid;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 11px;
  font-weight: 800;
  place-items: center;
}

.sentence-gaze-list__heading p {
  margin: 2px 0 0;
  color: var(--slate-800);
  font-size: 13px;
  line-height: 1.6;
}

.sentence-gaze-list__bar {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--slate-100);
}

.sentence-gaze-list__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--primary-500), var(--primary-300));
}

.sentence-gaze-list dl,
.analysis-meta {
  display: grid;
  margin: 0;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.sentence-gaze-list dl > div,
.analysis-meta > div {
  min-width: 0;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  background: var(--slate-50);
}

.sentence-gaze-list dt,
.analysis-meta dt {
  color: var(--slate-500);
  font-size: 10px;
}

.sentence-gaze-list dd,
.analysis-meta dd {
  margin: 3px 0 0;
  overflow-wrap: anywhere;
  color: var(--slate-800);
  font-size: 12px;
  font-weight: 700;
}

.regression-list li {
  display: grid;
  align-items: center;
  gap: 8px 12px;
  padding: 12px 14px;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-md);
  grid-template-columns: auto 1fr auto;
}

.regression-list strong {
  color: var(--slate-800);
  font-size: 12px;
}

.regression-list span,
.regression-list time {
  color: var(--slate-600);
  font-size: 11px;
}

.analysis-meta {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 720px) {
  .sentence-gaze-list dl {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .regression-list li {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .analysis-meta {
    grid-template-columns: 1fr;
  }
}
</style>
