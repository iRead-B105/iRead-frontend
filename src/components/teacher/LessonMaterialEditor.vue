<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  trainingStatusLabel,
  toTrainingPreview,
  type CurriculumTraining,
  type ExpectedWord,
  type TrainingDetail,
  type TrainingRequestStatus,
} from '@/features/teacher/training'

const props = defineProps<{
  training: CurriculumTraining
  attemptLabel: string
  expectedWords: readonly ExpectedWord[]
  detail: TrainingDetail | null
  expectedWordsStatus: TrainingRequestStatus
  detailStatus: TrainingRequestStatus
  isMutating: boolean
  expectedWordError: string | null
  detailError: string | null
}>()

const emit = defineEmits<{
  close: []
  addWord: [wordName: string]
  deleteWord: [wordId: number]
  retry: []
}>()

const newWord = ref('')
const submittedWord = ref<string | null>(null)
const wordPendingDeletion = ref<ExpectedWord | null>(null)
const preview = computed(() => toTrainingPreview(props.detail))
const normalizedWord = computed(() => newWord.value.trim())
const wordValidationError = computed(() => {
  if (!newWord.value) return null
  if (!normalizedWord.value) return '공백만 입력할 수 없습니다.'
  if (normalizedWord.value.length > 50) return '예상 단어는 최대 50자입니다.'
  if (props.expectedWords.some((word) => word.wordName === normalizedWord.value)) {
    return '이미 추가된 예상 단어입니다.'
  }
  return null
})
const canAddWord = computed(
  () =>
    Boolean(normalizedWord.value) &&
    !wordValidationError.value &&
    !props.isMutating,
)

watch(
  () => props.expectedWords,
  (words) => {
    if (submittedWord.value && words.some((word) => word.wordName === submittedWord.value)) {
      newWord.value = ''
      submittedWord.value = null
    }
    if (
      wordPendingDeletion.value &&
      !words.some((word) => word.wordId === wordPendingDeletion.value?.wordId)
    ) {
      wordPendingDeletion.value = null
    }
  },
  { deep: true },
)

function addWord(): void {
  if (!canAddWord.value) return
  submittedWord.value = normalizedWord.value
  emit('addWord', normalizedWord.value)
}

function confirmDeleteWord(): void {
  if (!wordPendingDeletion.value || props.isMutating) return
  emit('deleteWord', wordPendingDeletion.value.wordId)
}
</script>

<template>
  <Dialog :open="true" @update:open="(open) => !open && emit('close')">
    <DialogContent
      class="material-dialog !max-w-none !gap-0 !overflow-hidden !bg-transparent !p-0 !ring-0"
      :show-close-button="false"
    >
      <div class="material-editor">
        <header class="editor-header">
          <div>
            <span>{{ attemptLabel }} · {{ training.unitName }}</span>
            <DialogTitle as-child>
              <h2>{{ training.trainingName }}</h2>
            </DialogTitle>
            <DialogDescription class="sr-only">
              반복 시행별 예상 단어를 관리하고 생성된 훈련 자료를 읽기 전용으로 확인합니다.
            </DialogDescription>
          </div>
          <div class="editor-header__actions">
            <Badge variant="secondary">{{ trainingStatusLabel(training.status) }}</Badge>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label="예상 단어 및 미리보기 닫기"
              @click="emit('close')"
            >
              ×
            </Button>
          </div>
        </header>

        <div class="editor-workspace">
          <section class="word-panel" aria-labelledby="expected-word-title">
            <header>
              <div>
                <p>편집 가능</p>
                <h3 id="expected-word-title">예상 단어</h3>
              </div>
              <span>{{ expectedWords.length }}개</span>
            </header>

            <form class="word-form" @submit.prevent="addWord">
              <label for="expected-word">새 예상 단어</label>
              <div>
                <Input
                  id="expected-word"
                  v-model="newWord"
                  maxlength="51"
                  autocomplete="off"
                  placeholder="최대 50자"
                  :disabled="isMutating"
                  :aria-invalid="Boolean(wordValidationError)"
                  aria-describedby="expected-word-help"
                />
                <Button type="submit" :disabled="!canAddWord">
                  {{ isMutating ? '처리 중' : '추가' }}
                </Button>
              </div>
              <small
                id="expected-word-help"
                :class="{ error: wordValidationError }"
                :role="wordValidationError ? 'alert' : undefined"
              >
                {{ wordValidationError ?? `${normalizedWord.length}/50자` }}
              </small>
            </form>

            <p v-if="expectedWordsStatus === 'loading'" class="section-state" role="status">
              예상 단어를 불러오는 중입니다.
            </p>
            <div v-else-if="expectedWordsStatus === 'error'" class="section-error" role="alert">
              <p>{{ expectedWordError }}</p>
              <Button variant="outline" size="sm" type="button" @click="emit('retry')">
                다시 시도
              </Button>
            </div>
            <ul v-else-if="expectedWords.length > 0" class="word-list">
              <li v-for="word in expectedWords" :key="word.wordId">
                <span>{{ word.wordName }}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  :aria-label="`${word.wordName} 예상 단어 삭제`"
                  :disabled="isMutating"
                  @click="wordPendingDeletion = word"
                >
                  ×
                </Button>
              </li>
            </ul>
            <p v-else class="section-state">등록된 예상 단어가 없습니다.</p>

            <p v-if="expectedWordError && expectedWordsStatus !== 'error'" class="inline-error" role="alert">
              {{ expectedWordError }}
            </p>
            <p class="word-help">
              예상 단어를 변경하면 생성된 자료가 무효화될 수 있습니다. 자료 생성은 학습자 훈련
              흐름에서 진행됩니다.
            </p>
          </section>

          <section class="preview-panel" aria-labelledby="preview-title">
            <header>
              <div>
                <p>읽기 전용</p>
                <h3 id="preview-title">아동 화면 미리보기</h3>
              </div>
              <Badge variant="outline">
                {{
                  preview.source === 'generated'
                    ? '생성 자료'
                    : preview.source === 'template'
                      ? '템플릿'
                      : '자료 없음'
                }}
              </Badge>
            </header>

            <p v-if="detailStatus === 'loading'" class="section-state" role="status">
              미리보기를 불러오는 중입니다.
            </p>
            <div v-else-if="detailStatus === 'error'" class="section-error" role="alert">
              <p>{{ detailError }}</p>
              <Button variant="outline" size="sm" type="button" @click="emit('retry')">
                다시 시도
              </Button>
            </div>
            <div v-else class="preview-device">
              <div class="preview-device__top">
                <span>iRead 학습</span>
                <small>미리보기 전용</small>
              </div>
              <div class="preview-content">
                <h4>{{ preview.title }}</h4>
                <p>{{ preview.description }}</p>
                <ol v-if="preview.items.length > 0">
                  <li v-for="item in preview.items" :key="item.id">
                    <small>{{ item.label }}</small>
                    <strong>{{ item.content }}</strong>
                    <span v-if="item.answer">기준: {{ item.answer }}</span>
                  </li>
                </ol>
                <div v-else class="preview-empty">
                  생성된 훈련 자료가 없습니다.
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <ConfirmDialog
    :open="Boolean(wordPendingDeletion)"
    title="예상 단어를 삭제할까요?"
    :message="`‘${wordPendingDeletion?.wordName ?? ''}’을(를) ${attemptLabel}에서 삭제합니다.`"
    confirm-label="단어 삭제"
    @cancel="wordPendingDeletion = null"
    @confirm="confirmDeleteWord"
  />
</template>

<style scoped>
.material-dialog {
  width: min(1040px, calc(100vw - 48px));
  height: min(760px, calc(100dvh - 48px));
  max-width: 1040px;
  max-height: calc(100dvh - 48px);
}

.material-editor {
  display: grid;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--white);
  box-shadow: 0 24px 70px rgb(15 23 42 / 22%);
  grid-template-rows: auto minmax(0, 1fr);
}
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
}

.editor-header > div:first-child {
  min-width: 0;
}
.editor-header span,
.word-panel header p,
.preview-panel header p {
  margin: 0 0 4px;
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 700;
}
.editor-header h2,
.word-panel h3,
.preview-panel h3 {
  margin: 0;
  color: var(--slate-900);
}
.editor-header h2 {
  font-size: 19px;
  overflow-wrap: anywhere;
}
.editor-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.editor-workspace {
  display: grid;
  min-height: 0;
  grid-template-columns: minmax(300px, 0.82fr) minmax(0, 1.18fr);
}
.word-panel,
.preview-panel {
  min-width: 0;
  overflow-y: auto;
  padding: 22px;
}
.word-panel {
  border-right: 1px solid var(--border);
}
.word-panel > header,
.preview-panel > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.word-panel h3,
.preview-panel h3 {
  font-size: 16px;
}
.word-panel > header > span {
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 700;
}
.word-form {
  margin-top: 20px;
}
.word-form label {
  display: block;
  margin-bottom: 7px;
  color: var(--slate-700);
  font-size: 12px;
  font-weight: 700;
}
.word-form > div {
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
}
.word-form small {
  display: block;
  margin-top: 6px;
  color: var(--slate-400);
  text-align: right;
}
.word-form small.error,
.inline-error {
  color: var(--danger-600);
}
.word-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}
.word-list li {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 6px 5px 11px;
  border: 1px solid var(--primary-200);
  border-radius: 999px;
  background: var(--primary-50);
  color: var(--primary-800);
  font-size: 12px;
  font-weight: 700;
}
.word-list .button {
  width: 22px;
  height: 22px;
  color: var(--primary-700);
}
.section-state,
.section-error {
  margin: 18px 0 0;
  padding: 18px;
  border: 1px dashed var(--slate-300);
  border-radius: var(--radius-sm);
  color: var(--slate-500);
  font-size: 12px;
  text-align: center;
}
.section-error {
  border-color: color-mix(in oklch, var(--danger-600) 35%, var(--border));
  color: var(--danger-600);
}
.section-error p {
  margin: 0 0 10px;
}
.inline-error {
  margin: 12px 0 0;
  font-size: 12px;
}
.word-help {
  margin: 18px 0 0;
  color: var(--slate-500);
  font-size: 11px;
  line-height: 1.6;
}
.preview-device {
  max-width: 560px;
  min-height: 430px;
  margin: 20px auto 0;
  overflow: hidden;
  border: 8px solid var(--slate-800);
  border-radius: 22px;
  background: var(--slate-50);
}
.preview-device__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--slate-800);
  color: var(--white);
  font-size: 11px;
}
.preview-content {
  padding: 28px;
}
.preview-content h4 {
  margin: 0;
  color: var(--slate-900);
  font-size: 21px;
}
.preview-content > p {
  margin: 7px 0 20px;
  color: var(--slate-500);
  font-size: 12px;
}
.preview-content ol {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.preview-content li {
  display: grid;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--white);
}
.preview-content li small {
  color: var(--primary-700);
  font-weight: 800;
}
.preview-content li strong {
  color: var(--slate-900);
  font-size: 15px;
  line-height: 1.55;
}
.preview-content li span {
  color: var(--slate-500);
  font-size: 11px;
}
.preview-empty {
  display: grid;
  min-height: 220px;
  place-items: center;
  border: 1px dashed var(--slate-300);
  border-radius: var(--radius-md);
  color: var(--slate-500);
  font-size: 13px;
}
@media (max-width: 760px) {
  .material-dialog {
    width: calc(100vw - 24px);
    height: calc(100dvh - 24px);
    max-height: calc(100dvh - 24px);
  }

  .material-editor {
    overflow: hidden;
  }

  .editor-workspace {
    overflow-y: auto;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }

  .word-panel,
  .preview-panel {
    overflow: visible;
  }

  .word-panel {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
}

@media (max-width: 480px) {
  .material-dialog {
    width: calc(100vw - 12px);
    height: calc(100dvh - 12px);
    max-height: calc(100dvh - 12px);
  }

  .editor-header,
  .word-panel,
  .preview-panel {
    padding: 14px;
  }

  .editor-header {
    align-items: flex-start;
    gap: 8px;
  }

  .editor-header h2 {
    font-size: 17px;
  }

  .editor-header__actions {
    flex: 0 0 auto;
  }

  .word-form > div {
    grid-template-columns: 1fr;
  }

  .word-form :deep([data-slot='button']) {
    width: 100%;
  }

  .preview-device {
    min-height: 360px;
    border-width: 5px;
    border-radius: 16px;
  }

  .preview-content {
    padding: 18px 14px;
  }
}
</style>
