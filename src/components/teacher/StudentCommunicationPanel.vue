<script setup lang="ts">
import { computed } from 'vue'
import SaveToast from '@/components/common/SaveToast.vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  normalizeTeacherMemo,
  STUDENT_MEMO_MAX_LENGTH,
  validateTeacherMemo,
} from '@/features/teacher/student'

const props = withDefaults(
  defineProps<{
    noteDraft: string
    savedValue?: string | null
    busy?: boolean
    error?: string
    saved?: boolean
  }>(),
  {
    savedValue: null,
    busy: false,
    error: '',
    saved: false,
  },
)

const emit = defineEmits<{
  'update:noteDraft': [value: string]
  saveNote: [text: string]
}>()

const validationError = computed(() => validateTeacherMemo(props.noteDraft))
const normalizedDraft = computed(() => normalizeTeacherMemo(props.noteDraft))
const normalizedSavedValue = computed(() => normalizeTeacherMemo(props.savedValue ?? ''))
const changed = computed(() => normalizedDraft.value !== normalizedSavedValue.value)
const canSave = computed(() => changed.value && !validationError.value && !props.busy)
const saveLabel = computed(() =>
  normalizedDraft.value === null && normalizedSavedValue.value !== null
    ? '메모 삭제'
    : '메모 저장',
)
</script>

<template>
  <section class="communication-panel" aria-labelledby="communication-title">
    <header class="communication-panel__heading">
      <div>
        <h2 id="communication-title">기록과 소통</h2>
      </div>
      <SaveToast :visible="saved" message="교수자 내부 메모가 저장되었습니다." inline />
    </header>

    <div class="note-editor">
      <div class="note-editor__label">
        <Label for="internal-note">내부 메모</Label>
        <span :class="{ 'is-invalid': Boolean(validationError) }">
          {{ noteDraft.trim().length.toLocaleString('ko-KR') }} /
          {{ STUDENT_MEMO_MAX_LENGTH.toLocaleString('ko-KR') }}
        </span>
      </div>
      <Textarea
        id="internal-note"
        class="textarea"
        :model-value="noteDraft"
        :aria-invalid="Boolean(validationError)"
        :aria-describedby="validationError || error ? 'internal-note-error' : undefined"
        placeholder="학습 지도와 상담에 필요한 내부 메모를 작성합니다."
        @update:model-value="emit('update:noteDraft', String($event))"
      />
      <p v-if="validationError" id="internal-note-error" class="note-editor__error" role="alert">
        {{ validationError }}
      </p>
      <p v-else-if="error" id="internal-note-error" class="note-editor__error" role="alert">
        {{ error }}
      </p>
      <div class="note-editor__actions">
        <Button
          size="sm"
          type="button"
          :disabled="!canSave"
          @click="emit('saveNote', noteDraft)"
        >
          {{ busy ? '저장 중...' : saveLabel }}
        </Button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.communication-panel {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
  box-shadow: var(--shadow-sm);
}

.communication-panel__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.communication-panel__heading h2 {
  margin: 0;
  font-size: 17px;
}

.note-editor {
  display: grid;
  gap: 8px;
}

.note-editor__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.note-editor__label label {
  font-size: 12px;
  font-weight: 700;
}

.note-editor__label span {
  color: var(--muted-foreground);
  font-size: 11px;
}

.note-editor__label span.is-invalid,
.note-editor__error {
  color: var(--destructive);
}

.note-editor .textarea {
  min-height: 120px;
}

.note-editor__error {
  margin: 0;
  font-size: 12px;
}

.note-editor__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
