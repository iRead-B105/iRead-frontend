<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const props = withDefaults(
  defineProps<{
    noteDraft: string
    busyId?: number | null
  }>(),
  { busyId: null },
)

const emit = defineEmits<{
  'update:noteDraft': [value: string]
  saveNote: [noteId: number | null, text: string]
}>()

function saveNote() {
  const text = props.noteDraft.trim()
  if (!text) return
  emit('saveNote', null, text)
}

function openTab() {}

defineExpose({ openTab })
</script>

<template>
  <section class="communication-panel" aria-labelledby="communication-title">
    <header class="communication-panel__heading">
      <h2 id="communication-title">교수자 내부 메모</h2>
      <p>학습 지도와 상담에 필요한 내부 기록입니다.</p>
    </header>

    <div class="note-editor">
      <Label for="internal-note">내부 메모 수정</Label>
      <Textarea
        id="internal-note"
        class="textarea"
        :model-value="noteDraft"
        placeholder="학습 지도와 상담에 필요한 내부 메모를 작성합니다."
        @update:model-value="emit('update:noteDraft', String($event))"
      />
      <div>
        <Button size="sm" type="button" :disabled="!noteDraft.trim() || busyId !== null" @click="saveNote">
          메모 저장
        </Button>
      </div>
    </div>
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
