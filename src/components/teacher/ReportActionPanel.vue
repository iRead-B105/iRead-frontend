<script setup lang="ts">
import { computed } from 'vue'
import SaveToast from '@/components/common/SaveToast.vue'
import { Button } from '@/components/ui/button'
import { reportStatusLabels } from '@/features/teacher/displayLabels'
import type { ReportStatus } from '@/features/teacher/types'

const props = defineProps<{
  status: ReportStatus
  versionLabel: string
  busyAction: string | null
  saved: boolean
}>()

const emit = defineEmits<{
  resetPeriod: []
  saveDraft: []
  publish: []
  newDraft: []
}>()

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

    <div v-else class="action-row">
      <Button variant="outline" type="button" :disabled="isBusy" @click="emit('newDraft')">
        새 초안 만들기
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
</style>
