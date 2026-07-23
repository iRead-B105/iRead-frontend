<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import GazeAnalysisPanel from '@/components/teacher/GazeAnalysisPanel.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const route = useRoute()
const feedback = ref('')
const submittedFeedback = ref('')
const sending = ref(false)
const reportToken = computed(() => String(route.params.token ?? ''))
const remaining = computed(() => 500 - feedback.value.length)
const sharedReport = computed(() =>
  reportToken.value === 'demo-8K2P'
    ? {
        versionLabel: '2026-06-18-v1',
        periodLabel: '2026. 5. 15. – 2026. 6. 14.',
      }
    : {
        versionLabel: '2026-07-21-v2',
        periodLabel: '2026. 6. 15. – 2026. 7. 15.',
      },
)

async function submitFeedback() {
  const message = feedback.value.trim()
  if (!message || sending.value) return
  sending.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 420))
  submittedFeedback.value = message
  feedback.value = ''
  sending.value = false
}
</script>

<template>
  <div class="guardian-report-page">
    <header class="guardian-header">
      <a href="/" aria-label="iRead 로그인으로 이동">
        <img src="/images/iread-logo.png" alt="iRead" />
      </a>
      <div>
        <strong>김OO 아동 학습 보고서</strong>
        <span>{{ sharedReport.versionLabel }}</span>
      </div>
      <Badge class="verified-badge">보호자 확인 완료</Badge>
    </header>

    <main>
      <section class="share-notice" aria-label="공유 안내">
        <div>
          <strong>이OO 선생님이 공유한 학습 보고서입니다.</strong>
          <p>공유 기한은 2026년 8월 20일까지이며, 링크를 전달받은 보호자만 확인해 주세요.</p>
        </div>
        <small>공유 코드 {{ reportToken.slice(-6) }}</small>
      </section>

      <article class="guardian-document">
        <header class="document-title">
          <div>
            <span>학습 기간</span>
            <strong>{{ sharedReport.periodLabel }}</strong>
          </div>
          <h1>김OO 아동 학습 보고서</h1>
        </header>

        <dl class="child-profile">
          <div><dt>아동</dt><dd>김OO</dd></div>
          <div><dt>학교 / 나이</dt><dd>OO초등학교 · 10세</dd></div>
          <div><dt>담당 교수자</dt><dd>이OO 선생님</dd></div>
          <div><dt>보고서 버전</dt><dd>{{ sharedReport.versionLabel }}</dd></div>
        </dl>

        <section class="document-section">
          <header><h2>학습 요약</h2><p>선택 기간의 핵심 결과입니다.</p></header>
          <dl class="summary-grid">
            <div><dt>총 학습 시간</dt><dd>13시간 20분</dd><small>이전 기간보다 2시간 증가</small></div>
            <div><dt>학습 완료율</dt><dd>88%</dd><small>계획한 8단계 중 7단계</small></div>
            <div><dt>읽기 정확도</dt><dd>84점</dd><small>기간 첫 기록보다 30점 향상</small></div>
            <div><dt>출석률</dt><dd>92%</dd><small>예정 13회 중 12회 참여</small></div>
          </dl>
        </section>

        <section class="document-section">
          <header><h2>영역별 변화</h2><p>첫 기록과 최근 기록을 비교했습니다.</p></header>
          <table>
            <thead><tr><th>영역</th><th>첫 기록</th><th>최근 기록</th><th>변화</th><th>판단</th></tr></thead>
            <tbody>
              <tr><th>음운 인식</th><td>68점</td><td>82점</td><td>+14점</td><td>양호</td></tr>
              <tr><th>파닉스</th><td>64점</td><td>76점</td><td>+12점</td><td>양호</td></tr>
              <tr><th>유창성</th><td>55점</td><td>71점</td><td>+16점</td><td>양호</td></tr>
              <tr><th>이해력</th><td>52점</td><td>58점</td><td>+6점</td><td class="needs-review">확인 필요</td></tr>
            </tbody>
          </table>
        </section>

        <section class="document-section">
          <GazeAnalysisPanel
            title="읽기 시선 분석"
            description="학습 중 읽기 어려움이 나타난 구간을 보호자용 설명으로 정리했습니다."
            compact
          />
        </section>

        <section class="document-section teacher-opinion">
          <header><h2>교수자 의견</h2><p>다음 지도 계획을 포함한 안내입니다.</p></header>
          <p>
            읽기 정확도와 유창성이 함께 향상되고 있습니다. 이해력은 상승 중이지만 다른
            영역보다 최근 점수가 낮아, 다음 학습에서는 낯선 낱말의 뜻을 문맥으로 추론하는
            활동을 강화할 예정입니다.
          </p>
        </section>
      </article>

      <section class="guardian-feedback" aria-labelledby="feedback-title">
        <header>
          <div>
            <span>교수자에게만 전달됩니다</span>
            <h2 id="feedback-title">보고서 피드백 작성</h2>
            <p>가정에서 관찰한 변화나 다음 상담에서 확인하고 싶은 내용을 남겨 주세요.</p>
          </div>
        </header>

        <div v-if="submittedFeedback" class="feedback-complete" role="status">
          <strong>피드백을 전달했습니다.</strong>
          <p>{{ submittedFeedback }}</p>
          <Button variant="outline" size="sm" type="button" @click="submittedFeedback = ''">
            추가 피드백 작성
          </Button>
        </div>

        <form v-else @submit.prevent="submitFeedback">
          <Label for="guardian-feedback">보호자 피드백</Label>
          <Textarea
            id="guardian-feedback"
            v-model="feedback"
            class="textarea"
            maxlength="500"
            placeholder="예: 집에서도 소리 내어 읽는 시간이 늘었습니다. 다음 단계에서 도울 방법이 궁금합니다."
          />
          <div class="feedback-actions">
            <span>{{ remaining }}자 남음</span>
            <Button type="submit" :disabled="!feedback.trim() || sending">
              {{ sending ? '전달 중…' : '피드백 전달' }}
            </Button>
          </div>
        </form>
      </section>
    </main>

    <footer class="guardian-footer">
      <span>iRead 학습 관리</span>
      <span>문의 · 이OO 선생님 / OO복지센터</span>
    </footer>
  </div>
</template>

<style scoped>
.guardian-report-page {
  min-height: 100vh;
  background: #f5f7fb;
}
.guardian-header {
  display: grid;
  min-height: 72px;
  align-items: center;
  gap: 18px;
  padding: 0 max(32px, calc((100vw - 980px) / 2));
  border-bottom: 1px solid var(--slate-200);
  background: var(--white);
  grid-template-columns: 82px minmax(0, 1fr) auto;
}
.guardian-header img {
  width: 64px;
}
.guardian-header > div {
  display: grid;
  gap: 1px;
}
.guardian-header > div strong {
  font-size: 13px;
}
.guardian-header > div span {
  color: var(--slate-500);
  font-size: 10px;
}
.verified-badge {
  padding: 6px 10px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-size: 10px;
  font-weight: 800;
}
main {
  display: grid;
  width: 980px;
  margin: 0 auto;
  gap: 18px;
  padding: 28px 0 40px;
}
.share-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 20px;
  border: 1px solid #c7d2fe;
  background: var(--primary-50);
}
.share-notice p {
  margin: 3px 0 0;
  color: var(--primary-700);
  font-size: 11px;
}
.share-notice small {
  color: var(--primary-700);
  font-weight: 700;
}
.guardian-document,
.guardian-feedback {
  padding: 38px 44px;
  border: 1px solid var(--slate-200);
  background: var(--white);
  box-shadow: var(--shadow-card);
}
.document-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 24px;
  border-bottom: 2px solid var(--slate-950);
}
.document-title > div {
  display: grid;
  gap: 4px;
}
.document-title span,
.document-section header p {
  color: var(--slate-500);
  font-size: 11px;
}
.document-title h1 {
  margin: 0;
  font-size: 25px;
}
.child-profile,
.summary-grid {
  display: grid;
  margin: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.child-profile {
  gap: 10px 28px;
  padding: 16px 0;
  border-bottom: 1px solid var(--slate-200);
}
.child-profile > div {
  display: grid;
  grid-template-columns: 90px 1fr;
}
.child-profile dt,
.summary-grid dt,
.summary-grid small {
  color: var(--slate-500);
  font-size: 11px;
}
.child-profile dd {
  margin: 0;
  font-weight: 700;
}
.document-section {
  padding-top: 28px;
}
.document-section > header {
  margin-bottom: 15px;
}
.document-section h2 {
  margin: 0;
  font-size: 17px;
}
.document-section header p {
  margin: 3px 0 0;
}
.summary-grid {
  border-top: 1px solid var(--slate-200);
  border-bottom: 1px solid var(--slate-200);
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.summary-grid > div {
  display: grid;
  gap: 3px;
  padding: 14px 12px;
}
.summary-grid > div + div {
  border-left: 1px solid var(--slate-200);
}
.summary-grid dd {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 10px;
  border-top: 1px solid var(--slate-200);
  font-size: 12px;
  text-align: left;
}
thead th {
  color: var(--slate-500);
}
.needs-review {
  color: #b45309;
  font-weight: 800;
}
.teacher-opinion > p {
  margin: 0;
  color: var(--slate-700);
  line-height: 1.8;
}
.guardian-feedback {
  padding: 28px 32px;
}
.guardian-feedback header span {
  color: var(--primary-600);
  font-size: 10px;
  font-weight: 800;
}
.guardian-feedback h2 {
  margin: 3px 0 0;
  font-size: 19px;
}
.guardian-feedback header p {
  margin: 4px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}
.guardian-feedback form {
  display: grid;
  gap: 9px;
  margin-top: 20px;
}
.guardian-feedback form label {
  color: var(--slate-700);
  font-size: 12px;
  font-weight: 700;
}
.feedback-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.feedback-actions span {
  color: var(--slate-500);
  font-size: 10px;
}
.feedback-complete {
  margin-top: 20px;
  padding: 18px;
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
}
.feedback-complete p {
  margin: 5px 0 14px;
  color: #166534;
}
.guardian-footer {
  display: flex;
  width: 980px;
  justify-content: space-between;
  gap: 20px;
  margin: 0 auto;
  padding: 18px 0 30px;
  color: var(--slate-500);
  font-size: 10px;
}
</style>
