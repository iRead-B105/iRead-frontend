<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import ChartPanel from '@/components/common/ChartPanel.vue'
import GazeAnalysisPanel from '@/components/teacher/GazeAnalysisPanel.vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Student } from '@/features/teacher/types'

defineProps<{
  student: Student
  startDate: string
  endDate: string
  versionLabel: string
  teacherOpinion: string
  editable: boolean
  internalMemoAvailable: boolean
  trendChart: EChartsOption
}>()

const emit = defineEmits<{
  'update:teacherOpinion': [value: string]
  importInternalMemo: []
}>()

const summaryItems = [
  { label: '총 학습 시간', value: '13시간 20분', note: '이전 4주보다 2시간 2분 증가' },
  { label: '학습 완료율', value: '88%', note: '계획한 8단계 중 7단계 완료' },
  { label: '읽기 정확도', value: '84점', note: '기간 첫 기록보다 30점 향상' },
  { label: '출석률', value: '92%', note: '예정 13회 중 12회 참여' },
]

const domainChanges = [
  { domain: '음운 인식', previous: 68, current: 82, change: '+14점', status: '양호' },
  { domain: '파닉스', previous: 64, current: 76, change: '+12점', status: '양호' },
  { domain: '유창성', previous: 55, current: 71, change: '+16점', status: '양호' },
  { domain: '어휘', previous: 58, current: 64, change: '+6점', status: '확인 필요' },
  { domain: '이해력', previous: 52, current: 58, change: '+6점', status: '확인 필요' },
]

const recentTraining = [
  { date: '7월 14일 15:44', step: '1단계 · 받침 소리 구분', domain: '파닉스', result: '88점', status: '양호' },
  { date: '7월 14일 15:41', step: '2단계 · 짧은 문장 읽기', domain: '유창성', result: '100점', status: '양호' },
  { date: '7월 14일 15:38', step: '3단계 · 핵심 내용 찾기', domain: '이해력', result: '50점', status: '확인 필요' },
]

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return `${year}. ${month}. ${day}.`
}
</script>

<template>
  <article class="learning-report" aria-label="아동 보고서 문서">
    <header class="learning-report__header">
      <div class="learning-report__brand">
        <span><img src="/images/iread-logo.png" alt="iRead" /></span>
      </div>
      <div class="learning-report__title">
        <h1>{{ student.name }} 아동 학습 보고서</h1>
        <span>{{ formatDate(startDate) }} – {{ formatDate(endDate) }}</span>
      </div>
    </header>

    <dl class="report-profile">
      <div><dt>아동</dt><dd>{{ student.name }}</dd></div>
      <div><dt>학교 / 나이</dt><dd>{{ student.school }} · {{ student.age }}세</dd></div>
      <div><dt>보고서 기간</dt><dd>{{ formatDate(startDate) }} – {{ formatDate(endDate) }}</dd></div>
      <div><dt>담당 교수자</dt><dd>이OO 선생님</dd></div>
      <div><dt>보고서 버전</dt><dd>{{ versionLabel }}</dd></div>
    </dl>

    <section class="report-section" aria-labelledby="summary-title">
      <div class="report-section__heading">
        <div>
          <h2 id="summary-title">학습 요약</h2>
          <p>선택 기간의 핵심 결과입니다.</p>
        </div>
      </div>
      <div class="report-summary">
        <dl v-for="item in summaryItems" :key="item.label">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
          <small>{{ item.note }}</small>
        </dl>
      </div>
      <p class="report-summary__interpretation">
        읽기 정확도와 유창성이 함께 향상되고 있습니다. 이해력은 상승 중이지만 다른 영역보다
        최근 점수가 낮아 다음 지도에서 우선 확인이 필요합니다.
      </p>
    </section>

    <section class="report-section" aria-labelledby="change-title">
      <div class="report-section__heading">
        <div>
          <h2 id="change-title">영역별 변화</h2>
          <p>첫 기록과 최근 기록을 비교했습니다.</p>
        </div>
      </div>

      <div class="report-trend">
        <h3>읽기 정확도·유창성 추이</h3>
        <ChartPanel
          :option="trendChart"
          height="248px"
          aria-label="6월 15일부터 7월 15일까지 읽기 정확도와 유창성 변화 차트"
        />
      </div>

      <table class="report-table report-domain-table">
        <thead>
          <tr><th>영역</th><th>기간 첫 기록</th><th>최근 기록</th><th>변화</th><th>학습 판단</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in domainChanges" :key="item.domain">
            <th>{{ item.domain }}</th>
            <td>{{ item.previous }}점</td>
            <td><strong>{{ item.current }}점</strong></td>
            <td>{{ item.change }}</td>
            <td :class="{ 'is-review': item.status === '확인 필요' }">{{ item.status }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="report-section" aria-labelledby="training-title">
      <div class="report-section__heading">
        <div>
          <h2 id="training-title">최근 훈련</h2>
          <p>가장 최근 훈련 3건입니다.</p>
        </div>
      </div>
      <table class="report-table report-training-table">
        <thead>
          <tr><th>학습일</th><th>단계</th><th>영역</th><th>결과</th><th>학습 판단</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in recentTraining" :key="item.step">
            <td>{{ item.date }}</td>
            <th>{{ item.step }}</th>
            <td>{{ item.domain }}</td>
            <td><strong>{{ item.result }}</strong></td>
            <td :class="{ 'is-review': item.status === '확인 필요' }">{{ item.status }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="report-section" aria-label="시선 분석 결과">
      <GazeAnalysisPanel
        title="읽기 시선 분석"
        description="선택 기간에 저장된 시선 분석 결과를 학습 변화와 함께 정리했습니다."
        compact
      />
    </section>

    <section class="report-section report-opinion" aria-labelledby="opinion-title">
      <div class="report-section__heading">
        <div>
          <h2 id="opinion-title">교수자 의견</h2>
          <p class="screen-only">보호자에게 전달할 학습 결과와 다음 지도 계획입니다.</p>
        </div>
      </div>
      <div v-if="editable && internalMemoAvailable" class="opinion-import screen-only">
        <span>내부 메모는 자동으로 공개되지 않습니다.</span>
        <Button variant="outline" size="sm" type="button" @click="emit('importInternalMemo')">
          내부 메모에서 불러오기
        </Button>
      </div>
      <Textarea
        v-if="editable"
        class="textarea screen-only"
        :value="teacherOpinion"
        aria-label="보호자에게 전달할 교수자 의견"
        @input="emit('update:teacherOpinion', ($event.target as HTMLTextAreaElement).value)"
      />
      <p v-else class="report-opinion__published screen-only">{{ teacherOpinion }}</p>
      <p class="report-opinion__print print-only">{{ teacherOpinion }}</p>
      <slot name="actions"></slot>
    </section>

    <slot name="share-status"></slot>

    <footer class="learning-report__footer">
      <span>iRead 학습 관리</span>
      <span>{{ student.name }} · {{ formatDate(startDate) }} – {{ formatDate(endDate) }}</span>
    </footer>
  </article>
</template>

<style scoped>
.learning-report {
  width: min(100%, 900px);
  margin: 0 auto;
  padding: 46px 52px 30px;
  border: 1px solid var(--slate-300);
  border-radius: 2px;
  background: var(--white);
  color: var(--slate-950);
}

.learning-report__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32px;
  padding-bottom: 26px;
  border-bottom: 2px solid var(--slate-950);
}

.learning-report__brand {
  display: grid;
  min-width: 90px;
}

.learning-report__brand span {
  display: grid;
  width: 74px;
  height: 36px;
  overflow: hidden;
  place-items: center;
}

.learning-report__brand img {
  width: 64px;
  height: 36px;
  max-width: none;
  object-fit: contain;
  transform: scale(1.8);
}

.learning-report__title {
  text-align: right;
}

.learning-report__title h1 {
  margin: 0 0 5px;
  font-size: 25px;
  line-height: 1.3;
}

.learning-report__title > span {
  color: var(--slate-500);
  font-size: 12px;
}

.report-profile {
  display: grid;
  margin: 0;
  padding: 17px 0;
  border-bottom: 1px solid var(--slate-300);
  gap: 12px 28px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.report-profile div {
  display: grid;
  gap: 12px;
  grid-template-columns: 78px minmax(0, 1fr);
}

.report-profile dt {
  color: var(--slate-500);
  font-size: 12px;
}

.report-profile dd {
  margin: 0;
  color: var(--slate-700);
  font-size: 13px;
  font-weight: 600;
}

.report-section {
  padding: 28px 0 2px;
  break-inside: avoid;
}

.report-section + .report-section {
  margin-top: 26px;
}

.report-section__heading {
  display: grid;
  align-items: start;
  margin-bottom: 18px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.report-section__heading h2 {
  margin: 0;
  font-size: 17px;
}

.report-section__heading p {
  margin: 2px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}

.report-summary {
  display: grid;
  border-top: 1px solid var(--slate-300);
  border-bottom: 1px solid var(--slate-300);
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.report-summary dl {
  display: grid;
  margin: 0;
  gap: 2px;
  padding: 15px 13px;
}

.report-summary dl + dl {
  border-left: 1px solid var(--slate-200);
}

.report-summary dt,
.report-summary small {
  color: var(--slate-500);
  font-size: 12px;
}

.report-summary dd {
  margin: 2px 0 1px;
  font-size: 18px;
  font-weight: 700;
}

.report-summary__interpretation {
  margin: 13px 0 0;
  color: var(--slate-600);
  font-size: 13px;
  line-height: 1.7;
}

.report-trend {
  margin-bottom: 16px;
}

.report-trend h3 {
  margin: 0;
  color: var(--slate-700);
  font-size: 13px;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.report-table th,
.report-table td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--slate-200);
  color: var(--slate-600);
  font-size: 12px;
  text-align: left;
}

.report-table thead th {
  border-top: 1px solid var(--slate-300);
  border-bottom-color: var(--slate-300);
  color: var(--slate-500);
  font-weight: 600;
}

.report-table tbody th,
.report-table strong {
  color: var(--slate-800);
  font-weight: 700;
}

.report-table .is-review {
  color: #b45309;
  font-weight: 700;
}

.report-domain-table th:first-child {
  width: 24%;
}

.report-training-table th:nth-child(1) {
  width: 19%;
}

.report-training-table th:nth-child(2) {
  width: 31%;
}

.report-opinion .textarea {
  min-height: 124px;
  border-radius: 3px;
  line-height: 1.7;
}

.opinion-import {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 8px;
}

.opinion-import span {
  color: var(--slate-500);
  font-size: 10px;
}

.report-opinion__print,
.report-opinion__published {
  margin: 0;
  min-height: 80px;
  color: var(--slate-700);
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.print-only {
  display: none;
}

.learning-report__footer {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: 30px;
  padding-top: 10px;
  border-top: 1px solid var(--slate-300);
  color: var(--slate-400);
  font-size: 9px;
}

@media print {
  .learning-report {
    width: 100%;
    margin: 0;
    padding: 10mm 11mm 7mm;
    border: 0;
  }

  .screen-only {
    display: none !important;
  }

  .print-only {
    display: block;
  }

  .report-section {
    padding-top: 20px;
  }

  .report-section + .report-section {
    margin-top: 20px;
  }

  .report-profile dt,
  .report-section__heading p,
  .report-summary dt,
  .report-summary small {
    font-size: 7.5pt;
  }

  .report-profile dd,
  .report-table th,
  .report-table td {
    font-size: 8pt;
  }

  .report-summary__interpretation,
  .report-opinion__print {
    font-size: 8.5pt;
  }
}
</style>
