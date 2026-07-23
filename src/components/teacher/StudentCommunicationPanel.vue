<script setup lang="ts">
import { computed, ref } from 'vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EncouragementComposer from '@/components/teacher/EncouragementComposer.vue'
import GuardianMessageQueue from '@/components/teacher/GuardianMessageQueue.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  audienceLabels,
  encouragementStatusLabels,
  messageSourceLabels,
} from '@/features/teacher/displayLabels'
import type {
  AsyncContentState,
  EncouragementMessage,
  GuardianComment,
  TeacherNote,
} from '@/features/teacher/types'

type CommunicationTab = 'notes' | 'encouragements' | 'guardian'

const props = withDefaults(
  defineProps<{
    notes: TeacherNote[]
    encouragements: EncouragementMessage[]
    guardianComments: GuardianComment[]
    noteDraft: string
    encouragementDraft: string
    state?: AsyncContentState
    busyId?: number | null
  }>(),
  { state: 'ready', busyId: null },
)

const emit = defineEmits<{
  'update:noteDraft': [value: string]
  'update:encouragementDraft': [value: string]
  saveNote: [noteId: number | null, text: string]
  sendEncouragement: [messageId: number | null, timing: 'immediate' | 'next-login']
  deleteEncouragement: [messageId: number]
  markGuardianRead: [commentId: number]
  addGuardianCommentToNote: [commentId: number]
  approveGuardianEncouragement: [messageId: number, deliveryText: string]
  holdGuardianEncouragement: [messageId: number, reason: string]
}>()

const activeTab = ref<CommunicationTab>('notes')
const pendingTab = ref<CommunicationTab | null>(null)
const switchDialogOpen = ref(false)
const editingNoteId = ref<number | null>(null)
const editingEncouragementId = ref<number | null>(null)

const pendingGuardianCount = computed(
  () =>
    props.encouragements.filter(
      (message) => message.source === 'guardian' && message.status === 'pending-approval',
    ).length,
)
const guardianEncouragements = computed(() =>
  props.encouragements.filter((message) => message.source === 'guardian'),
)
function hasDraft(tab: CommunicationTab) {
  if (tab === 'notes') return props.noteDraft.trim().length > 0
  if (tab === 'encouragements') return props.encouragementDraft.trim().length > 0
  return false
}

function requestTab(tab: CommunicationTab) {
  if (tab === activeTab.value) return
  if (hasDraft(activeTab.value)) {
    pendingTab.value = tab
    switchDialogOpen.value = true
    return
  }
  activeTab.value = tab
}

function confirmTabSwitch() {
  if (pendingTab.value) activeTab.value = pendingTab.value
  pendingTab.value = null
  switchDialogOpen.value = false
}

function editNote(note: TeacherNote) {
  editingNoteId.value = note.id
  emit('update:noteDraft', note.text)
}

function saveNote() {
  const text = props.noteDraft.trim()
  if (!text) return
  emit('saveNote', editingNoteId.value, text)
  editingNoteId.value = null
}

function cancelNoteEdit() {
  editingNoteId.value = null
  emit('update:noteDraft', '')
}

function editEncouragement(message: EncouragementMessage) {
  editingEncouragementId.value = message.id
  emit('update:encouragementDraft', message.deliveryText)
}

function submitEncouragement(timing: 'immediate' | 'next-login') {
  emit('sendEncouragement', editingEncouragementId.value, timing)
  editingEncouragementId.value = null
}

function cancelEncouragementEdit() {
  editingEncouragementId.value = null
  emit('update:encouragementDraft', '')
}

function openTab(tab: CommunicationTab) {
  activeTab.value = tab
}

function formatDate(value: string) {
  return value.replaceAll('-', '.').slice(0, 16)
}

defineExpose({ openTab })
</script>

<template>
  <section class="communication-panel" aria-labelledby="communication-title">
    <header class="communication-panel__heading">
      <div>
        <h2 id="communication-title">기록과 소통</h2>
        <p>내용의 수신 대상과 공개 범위를 확인한 뒤 작성하세요.</p>
      </div>
    </header>

    <Tabs
      :model-value="activeTab"
      @update:model-value="(value) => requestTab(value as CommunicationTab)"
    >
      <TabsList variant="line" class="communication-tabs" aria-label="기록과 소통 유형">
        <TabsTrigger value="notes">교수자 내부 메모</TabsTrigger>
        <TabsTrigger value="encouragements">아동에게 전할 응원</TabsTrigger>
        <TabsTrigger value="guardian">
          보호자 메시지
          <Badge v-if="pendingGuardianCount" variant="secondary">{{ pendingGuardianCount }}</Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <p v-if="state === 'loading'" class="panel-state" aria-live="polite">
      기록과 메시지를 불러오는 중입니다.
    </p>
    <p v-else-if="state === 'error'" class="panel-state is-error" role="alert">
      기록과 메시지를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.
    </p>

    <div v-else-if="activeTab === 'notes'" class="note-panel" role="tabpanel">
      <div class="note-editor">
        <Label for="internal-note">{{ editingNoteId ? '내부 메모 수정' : '내부 메모 추가' }}</Label>
        <Textarea
          id="internal-note"
          class="textarea"
          :value="noteDraft"
          placeholder="학습 지도와 상담에 필요한 내부 기록을 작성합니다."
          @input="emit('update:noteDraft', ($event.target as HTMLTextAreaElement).value)"
        />
        <div>
          <Button
            v-if="editingNoteId || noteDraft"
            variant="outline"
            size="sm"
            type="button"
            @click="cancelNoteEdit"
          >
            취소
          </Button>
          <Button
            size="sm"
            type="button"
            :disabled="!noteDraft.trim() || (busyId !== null && busyId === editingNoteId)"
            @click="saveNote"
          >
            {{
              busyId !== null && busyId === editingNoteId
                ? '저장 중…'
                : editingNoteId
                  ? '수정 저장'
                  : '메모 추가'
            }}
          </Button>
        </div>
      </div>

      <p v-if="notes.length === 0" class="panel-state">작성된 내부 메모가 없습니다.</p>
      <ol v-else class="note-history">
        <li v-for="note in notes" :key="note.id">
          <div>
            <strong>{{ note.author }}</strong>
            <span>{{ formatDate(note.updatedAt) }} · {{ audienceLabels[note.audience] }}</span>
          </div>
          <p>{{ note.text }}</p>
          <Button variant="link" size="sm" type="button" @click="editNote(note)">수정</Button>
        </li>
      </ol>
    </div>

    <div v-else-if="activeTab === 'encouragements'" class="encouragement-panel" role="tabpanel">
      <EncouragementComposer
        :model-value="encouragementDraft"
        :editing="editingEncouragementId !== null"
        :busy="busyId !== null && busyId === editingEncouragementId"
        @update:model-value="emit('update:encouragementDraft', $event)"
        @submit="submitEncouragement"
        @cancel-edit="cancelEncouragementEdit"
      />

      <section class="encouragement-history" aria-labelledby="encouragement-history-title">
        <h3 id="encouragement-history-title">전달 이력</h3>
        <p v-if="encouragements.length === 0" class="panel-state">아직 전달한 응원이 없습니다.</p>
        <ol v-else>
          <li v-for="message in encouragements" :key="message.id">
            <header>
              <div>
                <strong>{{ message.author }}</strong>
                <span
                  >{{ messageSourceLabels[message.source] }} ·
                  {{ formatDate(message.createdAt) }}</span
                >
              </div>
              <Badge variant="secondary" :class="`is-${message.status}`">
                {{ encouragementStatusLabels[message.status] }}
              </Badge>
            </header>
            <p>{{ message.deliveryText }}</p>
            <div class="delivery-flow" aria-label="응원 전달 상태 흐름">
              <span class="is-done">전달 예정</span>
              <i>→</i>
              <span :class="{ 'is-done': ['delivered', 'seen-by-child'].includes(message.status) }"
                >전달 완료</span
              >
              <i>→</i>
              <span :class="{ 'is-done': message.status === 'seen-by-child' }">
                {{ message.deliveryStatusPending ? '확인 여부를 불러오는 중' : '아동 확인' }}
              </span>
            </div>
            <div
              v-if="message.source === 'teacher' && message.status === 'scheduled'"
              class="history-actions"
            >
              <Button variant="link" size="sm" type="button" @click="editEncouragement(message)">수정</Button>
              <Button
                variant="link"
                size="sm"
                type="button"
                class="is-danger"
                @click="emit('deleteEncouragement', message.id)"
              >
                삭제
              </Button>
            </div>
          </li>
        </ol>
      </section>
    </div>

    <GuardianMessageQueue
      v-else
      role="tabpanel"
      :comments="guardianComments"
      :encouragements="guardianEncouragements"
      :state="state"
      :busy-id="busyId"
      @mark-read="emit('markGuardianRead', $event)"
      @add-comment-to-note="emit('addGuardianCommentToNote', $event)"
      @approve="(id, text) => emit('approveGuardianEncouragement', id, text)"
      @hold="(id, reason) => emit('holdGuardianEncouragement', id, reason)"
    />

    <ConfirmDialog
      :open="switchDialogOpen"
      title="작성 중인 내용이 있습니다"
      message="입력한 내용은 이 아동의 임시 초안으로 유지됩니다. 다른 탭으로 이동할까요?"
      confirm-label="탭 이동"
      tone="primary"
      @cancel="switchDialogOpen = false"
      @confirm="confirmTabSwitch"
    />
  </section>
</template>

<style scoped>
.communication-panel {
  display: grid;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
  box-shadow: var(--shadow-sm);
}
.communication-panel__heading {
  padding: 0 0 12px;
}
.communication-panel__heading h2 {
  margin: 0;
  font-size: 17px;
}
.communication-panel__heading p {
  margin: 5px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}
.communication-tabs {
  display: flex;
  width: 100%;
  min-height: 43px;
  justify-content: flex-start;
  gap: 6px;
  padding: 0;
  border: 0;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  background: transparent;
}
.communication-tabs :deep([data-slot='tabs-trigger']) {
  min-height: 42px;
  flex: 0 0 auto;
  gap: 7px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  color: var(--muted-foreground);
  font-size: 12px;
  font-weight: 650;
  box-shadow: none;
}
.communication-tabs :deep([data-slot='tabs-trigger']:hover) {
  background: var(--interactive-hover-background);
  color: var(--active-selection-foreground);
}
.communication-tabs :deep([data-slot='tabs-trigger'][data-active]) {
  background: transparent;
  color: var(--active-selection-foreground);
  box-shadow: none;
}
.communication-tabs :deep([data-slot='tabs-trigger'][data-active]::after) {
  bottom: -1px;
  height: 2px;
  background: var(--primary-600);
  opacity: 1;
}
.communication-tabs :deep([data-slot='badge']) {
  min-width: 18px;
  height: 18px;
  justify-content: center;
  padding: 0 5px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 10px;
}
.communication-tabs :deep([data-slot='tabs-trigger'][data-active] [data-slot='badge']) {
  background: var(--primary-600);
  color: var(--primary-foreground);
}
.note-panel,
.encouragement-panel {
  display: grid;
  gap: 24px;
  padding: 18px 0 4px;
}
.note-editor {
  display: grid;
  justify-items: end;
  gap: 8px;
}
.note-editor label {
  justify-self: start;
  color: var(--slate-700);
  font-size: 12px;
  font-weight: 700;
}
.note-editor .textarea {
  min-height: 92px;
}
.note-editor > div {
  display: flex;
  gap: 7px;
}
.note-history,
.encouragement-history > ol {
  display: grid;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--slate-200);
  list-style: none;
}
.note-history li,
.encouragement-history li {
  position: relative;
  padding: 14px 0;
  border-bottom: 1px solid var(--slate-200);
}
.note-history li > div {
  display: grid;
  gap: 2px;
}
.note-history strong,
.encouragement-history strong {
  color: var(--slate-800);
  font-size: 12px;
}
.note-history span,
.encouragement-history header span {
  color: var(--slate-500);
  font-size: 10px;
}
.note-history p,
.encouragement-history li > p {
  max-width: 900px;
  margin: 8px 70px 0 0;
  color: var(--slate-700);
  font-size: 12px;
  line-height: 1.65;
}
.note-history button,
.history-actions button {
  border: 0;
  background: transparent;
  color: var(--primary-700);
  font-size: 11px;
  font-weight: 700;
}
.note-history > li > button {
  position: absolute;
  top: 14px;
  right: 0;
}
.encouragement-history {
  display: grid;
  gap: 10px;
}
.encouragement-history h3 {
  margin: 0;
  font-size: 14px;
}
.encouragement-history header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.encouragement-history header div {
  display: grid;
  gap: 2px;
}
.encouragement-history em {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--slate-100);
  color: var(--slate-600);
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
}
.encouragement-history em.is-pending-approval,
.encouragement-history em.is-on-hold {
  background: #fff7ed;
  color: #b45309;
}
.encouragement-history em.is-seen-by-child {
  background: #f0fdf4;
  color: #15803d;
}
.delivery-flow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  color: var(--slate-400);
  font-size: 10px;
}
.delivery-flow span.is-done {
  color: var(--success-600);
  font-weight: 700;
}
.delivery-flow i {
  font-style: normal;
}
.history-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
.history-actions button.is-danger {
  color: var(--danger-600);
}
.panel-state {
  margin: 0;
  padding: 22px 8px;
  color: var(--slate-500);
  font-size: 12px;
  text-align: center;
}
.panel-state.is-error {
  background: #fff1f2;
  color: var(--danger-600);
}
</style>
