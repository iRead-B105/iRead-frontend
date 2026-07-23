<script setup lang="ts">
import { computed, ref } from 'vue'
import SaveToast from '@/components/common/SaveToast.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { reportStatusLabels } from '@/features/teacher/displayLabels'
import type { ReportStatus, ShareLink } from '@/features/teacher/types'

const props = defineProps<{
  status: ReportStatus
  versionLabel: string
  expiresAt: string
  shareLink: ShareLink | null
  guardianPreviewUrl?: string
  busyAction: string | null
  saved: boolean
  previousShareMessage?: string
}>()

const emit = defineEmits<{
  'update:expiresAt': [value: string]
  resetPeriod: []
  saveDraft: []
  publish: []
  newDraft: []
  createShare: []
  copyLink: []
  revokeLink: []
  reissueLink: []
  viewHistory: []
}>()

const manageOpen = ref(false)
const isBusy = computed(() => props.busyAction !== null)
</script>

<template>
  <section class="report-actions screen-only" aria-labelledby="report-action-title">
    <header>
      <div>
        <span>보고서 {{ versionLabel }}</span>
        <h3 id="report-action-title">{{ reportStatusLabels[status] }}</h3>
      </div>
      <SaveToast :visible="saved" message="보고서 초안을 저장했습니다." inline />
    </header>

    <p v-if="previousShareMessage" class="previous-share">{{ previousShareMessage }}</p>

    <div v-if="status === 'draft'" class="action-row">
      <div>
        <Button variant="outline" type="button" :disabled="isBusy" @click="emit('resetPeriod')">
          기간 다시 설정
        </Button>
        <Button variant="outline" type="button" :disabled="isBusy" @click="emit('saveDraft')">
          {{ busyAction === 'save' ? '저장 중…' : '임시 저장' }}
        </Button>
      </div>
      <Button type="button" :disabled="isBusy" @click="emit('publish')">
        보고서 발행
      </Button>
    </div>

    <div v-else-if="status === 'published'" class="published-actions">
      <label class="expiry-field">
        <span>공유 링크 만료일 <b>필수</b></span>
        <Input
          class="input"
          type="date"
          min="2026-07-22"
          :value="expiresAt"
          @input="emit('update:expiresAt', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <div class="action-row">
        <Button variant="outline" type="button" :disabled="isBusy" @click="emit('newDraft')">
          새 초안 만들기
        </Button>
        <Button type="button" :disabled="!expiresAt || isBusy" @click="emit('createShare')">
          {{ busyAction === 'share' ? '링크 생성 중…' : '공유 링크 만들기' }}
        </Button>
      </div>
    </div>

    <div v-else-if="status === 'shared'" class="shared-actions">
      <div class="masked-link">
        <span>공유 주소</span>
        <strong>{{ shareLink?.maskedUrl }}</strong>
        <small>아동 이름과 연락처가 포함되지 않은 주소입니다.</small>
      </div>
      <div class="action-row">
        <div>
          <Button variant="outline" type="button" :disabled="isBusy" @click="emit('copyLink')">
            링크 복사
          </Button>
          <Button v-if="guardianPreviewUrl" as-child variant="outline">
            <a :href="guardianPreviewUrl" target="_blank" rel="noopener">보호자 화면 보기</a>
          </Button>
          <Button variant="outline" type="button" @click="emit('viewHistory')">
            공유 현황 보기
          </Button>
        </div>
        <Button type="button" @click="manageOpen = !manageOpen">링크 관리</Button>
      </div>
      <div v-if="manageOpen" class="link-management">
        <p>재발급하면 현재 링크가 즉시 폐기되고 새 주소가 만들어집니다.</p>
        <div>
          <Button variant="outline" size="sm" type="button" :disabled="isBusy" @click="emit('reissueLink')">
            링크 재발급
          </Button>
          <Button variant="destructive" size="sm" type="button" :disabled="isBusy" @click="emit('revokeLink')">
            링크 폐기
          </Button>
        </div>
      </div>
    </div>

    <div v-else class="action-row">
      <Button variant="outline" type="button" @click="emit('viewHistory')">공유 이력 보기</Button>
      <Button type="button" :disabled="isBusy" @click="emit('reissueLink')">
        {{ busyAction === 'reissue' ? '재발급 중…' : '링크 재발급' }}
      </Button>
    </div>
  </section>
</template>

<style scoped>
.report-actions { margin-top: 18px; padding: 17px 0 2px; border-top: 1px solid var(--slate-300); }
.report-actions > header { display: flex; min-height: 34px; align-items: flex-start; justify-content: space-between; gap: 12px; }
.report-actions > header div { display: grid; gap: 2px; }
.report-actions > header span { color: var(--slate-500); font-size: 10px; }
.report-actions h3 { margin: 0; font-size: 14px; }
.action-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 14px; }
.action-row > div { display: flex; flex-wrap: wrap; gap: 7px; }
.published-actions { display: grid; gap: 12px; }
.expiry-field { display: grid; width: 220px; gap: 6px; margin-top: 13px; }
.expiry-field span { color: var(--slate-700); font-size: 11px; font-weight: 700; }
.expiry-field b { color: var(--danger-600); font-size: 10px; }
.masked-link { display: grid; gap: 3px; margin-top: 13px; }
.masked-link span,
.masked-link small { color: var(--slate-500); font-size: 10px; }
.masked-link strong { color: var(--slate-800); font-size: 12px; }
.link-management { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 14px; padding: 12px; border: 1px solid var(--slate-200); background: var(--slate-50); }
.link-management p { margin: 0; color: var(--slate-600); font-size: 10px; }
.link-management div { display: flex; flex: 0 0 auto; gap: 7px; }
.previous-share { margin: 12px 0 0; padding: 9px 11px; background: var(--primary-50); color: var(--primary-700); font-size: 10px; }
</style>
