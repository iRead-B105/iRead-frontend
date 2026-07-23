<script setup lang="ts">
import { shareLinkStatusLabels } from '@/features/teacher/displayLabels'
import type { AsyncContentState, ShareLink } from '@/features/teacher/types'

withDefaults(
  defineProps<{
    versionLabel: string
    publishedAt?: string
    shareLink: ShareLink | null
    guardianCommentCreated: boolean
    guardianEncouragementStatus?: string
    state?: AsyncContentState
  }>(),
  { publishedAt: undefined, guardianEncouragementStatus: undefined, state: 'ready' },
)

function valueOrEmpty(value: string | undefined, emptyLabel: string) {
  return value || emptyLabel
}
</script>

<template>
  <section class="share-status screen-only" aria-labelledby="share-status-title">
    <header>
      <h3 id="share-status-title">공유 현황</h3>
      <p>보호자 공유와 열람 기록을 확인합니다.</p>
    </header>

    <p v-if="state === 'loading'" class="status-state" aria-live="polite">공유 현황을 불러오는 중입니다.</p>
    <p v-else-if="state === 'error'" class="status-state is-error" role="alert">
      공유 현황을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.
    </p>
    <dl v-else>
      <div><dt>보고서 버전</dt><dd>{{ versionLabel }} · {{ valueOrEmpty(publishedAt, '아직 발행하지 않음') }}</dd></div>
      <div>
        <dt>공유 링크</dt>
        <dd v-if="shareLink">{{ shareLinkStatusLabels[shareLink.status] }} · {{ shareLink.expiresAt }}까지</dd>
        <dd v-else>생성된 공유 링크 없음</dd>
      </div>
      <div><dt>최초 열람</dt><dd>{{ valueOrEmpty(shareLink?.firstViewedAt, '아직 열람하지 않음') }}</dd></div>
      <div><dt>최근 열람</dt><dd>{{ valueOrEmpty(shareLink?.lastViewedAt, '아직 열람하지 않음') }}</dd></div>
      <div><dt>보호자 의견</dt><dd>{{ guardianCommentCreated ? '작성된 의견 있음' : '작성된 의견 없음' }}</dd></div>
      <div><dt>아동 응원</dt><dd>{{ guardianEncouragementStatus || '작성된 응원 없음' }}</dd></div>
      <div><dt>PDF 저장</dt><dd>{{ valueOrEmpty(shareLink?.pdfSavedAt, '저장 기록 없음') }}</dd></div>
      <div>
        <dt>보호자 확인</dt>
        <dd v-if="shareLink">
          {{ shareLink.guardianContactHint }} ·
          {{ shareLink.guardianAuthentication === 'verified' ? '인증 성공' : shareLink.guardianAuthentication === 'failed' ? '인증 실패' : '인증 전' }}
        </dd>
        <dd v-else>인증 기록 없음</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.share-status { margin-top: 24px; padding: 22px 0 2px; border-top: 1px solid var(--slate-300); }
.share-status header h3 { margin: 0; font-size: 14px; }
.share-status header p { margin: 3px 0 0; color: var(--slate-500); font-size: 10px; }
.share-status dl { display: grid; margin: 14px 0 0; border-top: 1px solid var(--slate-200); grid-template-columns: repeat(2, minmax(0, 1fr)); }
.share-status dl > div { display: grid; gap: 4px; padding: 11px 10px; border-bottom: 1px solid var(--slate-200); grid-template-columns: 88px minmax(0, 1fr); }
.share-status dl > div:nth-child(odd) { border-right: 1px solid var(--slate-200); }
.share-status dt { color: var(--slate-500); font-size: 10px; }
.share-status dd { margin: 0; color: var(--slate-700); font-size: 10px; font-weight: 600; }
.status-state { margin: 12px 0 0; padding: 18px; color: var(--slate-500); font-size: 11px; text-align: center; }
.status-state.is-error { background: #fff1f2; color: var(--danger-600); }
</style>
