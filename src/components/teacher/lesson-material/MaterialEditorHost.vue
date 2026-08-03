<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  getLessonMaterialEditorDefinition,
  type EditableLessonMaterialItem,
  type LessonMaterialFieldError,
  type LessonMaterialEditorCode,
} from '@/features/teacher/training'
import {
  AudioLetterChoiceMaterialEditor,
  FillBlankMaterialEditor,
  ImageSentenceMatchMaterialEditor,
  LetterBuildMaterialEditor,
  ListenAndSelectMaterialEditor,
  ReadAloudMaterialEditor,
  SentenceAssemblyMaterialEditor,
  SentenceReadingMaterialEditor,
  SimilarSoundChoiceMaterialEditor,
  SoundBlendMaterialEditor,
  SoundManipulationMaterialEditor,
  TraceMaterialEditor,
  WordReadingMaterialEditor,
} from './materialEditors'

const props = defineProps<{
  material: EditableLessonMaterialItem
  disabled: boolean
  fieldErrors?: readonly LessonMaterialFieldError[]
}>()

const emit = defineEmits<{
  updateField: [section: 'content' | 'answer', key: string, value: unknown]
  editorError: [message: string | null]
}>()

const editors: Readonly<Record<LessonMaterialEditorCode, Component>> = {
  E01: TraceMaterialEditor,
  E02: AudioLetterChoiceMaterialEditor,
  E03: ListenAndSelectMaterialEditor,
  E04: SimilarSoundChoiceMaterialEditor,
  E05: SoundManipulationMaterialEditor,
  E06: SoundBlendMaterialEditor,
  E07: LetterBuildMaterialEditor,
  E08: WordReadingMaterialEditor,
  E09: SentenceReadingMaterialEditor,
  E10: ReadAloudMaterialEditor,
  E11: SentenceAssemblyMaterialEditor,
  E12: FillBlankMaterialEditor,
  E13: ImageSentenceMatchMaterialEditor,
}

const definition = computed(() => getLessonMaterialEditorDefinition(props.material.questionType))
const editor = computed(() => (definition.value ? editors[definition.value.editorCode] : null))

function handleUpdateField(section: 'content' | 'answer', key: string, value: unknown): void {
  emit('updateField', section, key, value)
}

function handleEditorError(message: string | null): void {
  emit('editorError', message)
}
</script>

<template>
  <component
    :is="editor"
    v-if="editor"
    :material="material"
    :disabled="disabled"
    :field-errors="fieldErrors ?? []"
    @update-field="handleUpdateField"
    @editor-error="handleEditorError"
  />
  <p v-else class="unsupported" role="alert">
    {{ material.questionType }} 문항 유형은 아직 편집기에 연결되지 않았습니다.
  </p>
</template>

<style scoped>
.unsupported {
  margin: 0;
  border-radius: 0.75rem;
  background: #fef2f2;
  color: #b91c1c;
  padding: 0.85rem;
  font-size: 0.85rem;
}
</style>
