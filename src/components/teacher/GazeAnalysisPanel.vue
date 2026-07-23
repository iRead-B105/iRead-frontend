<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    description?: string
    compact?: boolean
  }>(),
  {
    title: '시선 분석',
    description: '읽는 동안 시선이 머문 위치와 되돌아본 구간을 분석했습니다.',
    compact: false,
  },
)

const metrics = [
  { label: '평균 시선 체류', value: '0.82초', note: '이전 기록보다 0.14초 감소' },
  { label: '되돌아보기', value: '4회', note: '문장 후반에 3회 집중' },
  { label: '읽기 이탈', value: '1회', note: '보조 안내 후 학습 재개' },
]

const segments = [
  { label: '문장 시작', value: 34, tone: 'stable' },
  { label: '받침 낱말', value: 82, tone: 'attention' },
  { label: '연결 문장', value: 58, tone: 'watch' },
  { label: '문장 마무리', value: 41, tone: 'stable' },
]
</script>

<template>
  <section class="gaze-analysis" :class="{ 'gaze-analysis--compact': compact }" aria-labelledby="gaze-analysis-title">
    <header>
      <div>
        <span>시선트래킹</span>
        <h2 id="gaze-analysis-title">{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
      <strong class="analysis-status">확인 필요 1개 구간</strong>
    </header>

    <div class="gaze-analysis__body">
      <dl class="gaze-metrics">
        <div v-for="metric in metrics" :key="metric.label">
          <dt>{{ metric.label }}</dt>
          <dd>{{ metric.value }}</dd>
          <small>{{ metric.note }}</small>
        </div>
      </dl>

      <div class="gaze-map" aria-label="문장 구간별 시선 체류 강도">
        <div v-for="segment in segments" :key="segment.label">
          <div class="gaze-map__label">
            <span>{{ segment.label }}</span>
            <strong>{{ segment.value }}%</strong>
          </div>
          <span class="gaze-map__track">
            <i :class="`is-${segment.tone}`" :style="{ width: `${segment.value}%` }"></i>
          </span>
        </div>
      </div>
    </div>

    <p class="gaze-insight">
      받침이 연속되는 낱말에서 체류 시간이 길고 되돌아보기가 반복되었습니다. 다음 학습에서는
      해당 구간을 짧게 나누어 읽도록 안내하는 것을 권장합니다.
    </p>
  </section>
</template>

<style scoped>
.gaze-analysis {
  display: grid;
  gap: 18px;
  padding: 22px 0 4px;
  border-top: 1px solid var(--slate-200);
}
.gaze-analysis > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}
.gaze-analysis header span {
  color: var(--primary-600);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
}
.gaze-analysis h2 {
  margin: 3px 0 0;
  font-size: 17px;
}
.gaze-analysis header p {
  margin: 4px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}
.analysis-status {
  padding: 5px 9px;
  border-radius: 999px;
  background: #fff7ed;
  color: #c2410c;
  font-size: 10px;
}
.gaze-analysis__body {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 0.95fr) minmax(320px, 1.05fr);
}
.gaze-metrics {
  display: grid;
  margin: 0;
  border-top: 1px solid var(--slate-200);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.gaze-metrics > div {
  display: grid;
  gap: 3px;
  padding: 13px 12px;
  border-bottom: 1px solid var(--slate-200);
}
.gaze-metrics > div + div {
  border-left: 1px solid var(--slate-200);
}
.gaze-metrics dt,
.gaze-metrics small {
  color: var(--slate-500);
  font-size: 10px;
}
.gaze-metrics dd {
  margin: 0;
  color: var(--slate-900);
  font-size: 18px;
  font-weight: 800;
}
.gaze-map {
  display: grid;
  gap: 10px;
}
.gaze-map__label {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--slate-600);
  font-size: 11px;
  font-weight: 500;
}
.gaze-map__label strong {
  color: var(--slate-800);
}
.gaze-map__track {
  display: block;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--muted);
}
.gaze-map__track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary-600);
}
.gaze-map__track i.is-watch {
  background: var(--warning-500);
}
.gaze-map__track i.is-attention {
  background: var(--danger-600);
}
.gaze-insight {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--slate-600);
  font-size: 11px;
  line-height: 1.65;
}
.gaze-analysis--compact {
  gap: 12px;
  padding-top: 18px;
}
.gaze-analysis--compact .gaze-analysis__body {
  grid-template-columns: 1fr;
}
.gaze-analysis--compact .gaze-metrics dd {
  font-size: 15px;
}
</style>
