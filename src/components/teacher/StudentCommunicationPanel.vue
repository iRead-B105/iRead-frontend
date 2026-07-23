<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { audienceLabels } from '@/features/teacher/displayLabels'
import type { TeacherNote } from '@/features/teacher/types'

const props = withDefaults(
  defineProps<{
    notes: TeacherNote[]
    noteDraft: string
    busyId?: number | null
  }>(),
  { busyId: null },
)

const emit = defineEmits<{
  'update:noteDraft': [value: string]
  saveNote: [noteId: number | null, text: string]
}>()

const editingNoteId = ref<number | null>(null)

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

function openTab() {}
function formatDate(value: string) {
  return value.replaceAll('-', '.').slice(0, 16)
}

defineExpose({ openTab })
</script>

<template>
  <section class="communication-panel" aria-labelledby="communication-title">
    <header class="communication-panel__heading">
      <h2 id="communication-title">교수자 내부 메모</h2>
      <p>학습 지도와 상담에 필요한 내부 기록입니다.</p>
    </header>

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
        <Button v-if="editingNoteId || noteDraft" variant="outline" size="sm" type="button" @click="cancelNoteEdit">
          취소
        </Button>
        <Button size="sm" type="button" :disabled="!noteDraft.trim()" @click="saveNote">
          {{ editingNoteId ? '수정 저장' : '메모 추가' }}
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
  </section>
</template>

<style scoped>
.communication-panel { display: grid; gap: 16px; padding: 20px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow-sm); }
.communication-panel__heading h2 { margin: 0; font-size: 17px; }
.communication-panel__heading p { margin: 4px 0 0; color: var(--muted-foreground); font-size: 12px; }
.note-editor { display: grid; gap: 8px; }
.note-editor label { font-size: 12px; font-weight: 700; }
.note-editor .textarea { min-height: 100px; }
.note-editor > div { display: flex; justify-content: flex-end; gap: 8px; }
.panel-state { margin: 0; color: var(--muted-foreground); font-size: 12px; }
.note-history { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.note-history li { padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); }
.note-history li > div { display: flex; justify-content: space-between; gap: 12px; }
.note-history strong { font-size: 12px; }
.note-history span { color: var(--muted-foreground); font-size: 10px; }
.note-history p { margin: 8px 0 0; font-size: 12px; line-height: 1.6; white-space: pre-wrap; }
</style>
