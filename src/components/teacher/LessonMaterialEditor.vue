<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { CurriculumItem, LessonContentItem, LessonContentType } from '@/features/teacher/types'

const props = defineProps<{
  item: CurriculumItem
}>()

const emit = defineEmits<{
  cancel: []
  save: [item: CurriculumItem]
}>()

const categories = ['음운 인식', '파닉스', '유창성', '이해력']
const discardConfirmOpen = ref(false)
const previewIndex = ref(0)
const cloneItem = (item: CurriculumItem) => JSON.parse(JSON.stringify(item)) as CurriculumItem
const draft = ref<CurriculumItem>(cloneItem(props.item))

watch(
  () => props.item,
  (item) => {
    draft.value = cloneItem(item)
    previewIndex.value = 0
  },
  { deep: true },
)

const hasChanges = computed(() => JSON.stringify(draft.value) !== JSON.stringify(props.item))
const previewItem = computed(() => draft.value.material.contentItems[previewIndex.value])

watch(
  () => draft.value.material.contentItems.length,
  (length) => {
    previewIndex.value = Math.min(previewIndex.value, Math.max(0, length - 1))
  },
)

function addContentItem() {
  const nextId = Math.max(0, ...draft.value.material.contentItems.map((item) => item.id)) + 1
  draft.value.material.contentItems.push({
    id: nextId,
    type: 'word',
    label: '새 학습 자료',
    content: '',
    answer: '',
    hint: '',
  })
  previewIndex.value = draft.value.material.contentItems.length - 1
}

function removeContentItem(id: number) {
  const removedIndex = draft.value.material.contentItems.findIndex((item) => item.id === id)
  draft.value.material.contentItems = draft.value.material.contentItems.filter(
    (item) => item.id !== id,
  )
  if (removedIndex < previewIndex.value) previewIndex.value -= 1
}

function removePreviewItem() {
  if (previewItem.value) removeContentItem(previewItem.value.id)
}

function moveContentItemTo(index: number, targetIndex: number) {
  if (
    !Number.isInteger(targetIndex) ||
    targetIndex < 0 ||
    targetIndex >= draft.value.material.contentItems.length ||
    targetIndex === index
  ) {
    return
  }

  const previewedId = previewItem.value?.id
  const [moved] = draft.value.material.contentItems.splice(index, 1)
  if (moved) draft.value.material.contentItems.splice(targetIndex, 0, moved)
  if (previewedId !== undefined) {
    previewIndex.value = draft.value.material.contentItems.findIndex(
      (item) => item.id === previewedId,
    )
  }
}

function showPreviousPreview() {
  previewIndex.value = Math.max(0, previewIndex.value - 1)
}

function showNextPreview() {
  previewIndex.value = Math.min(
    draft.value.material.contentItems.length - 1,
    previewIndex.value + 1,
  )
}

function updateContentType(item: LessonContentItem, value: unknown) {
  if (typeof value !== 'string') return
  item.type = value as LessonContentType
}

function save() {
  if (!hasChanges.value) return
  const savedItem = cloneItem(draft.value)
  savedItem.material.updatedAt = '2026-07-22 12:30'
  emit('save', savedItem)
}

function requestClose() {
  if (hasChanges.value) {
    discardConfirmOpen.value = true
    return
  }
  emit('cancel')
}

function discardChanges() {
  discardConfirmOpen.value = false
  emit('cancel')
}

</script>

<template>
  <Dialog :open="true" @update:open="(open) => !open && requestClose()">
    <DialogContent
      class="!max-w-none !gap-0 !overflow-hidden !bg-transparent !p-0 !ring-0"
      :style="{
        width: 'min(1180px, calc(100vw - 48px))',
        height: 'min(820px, calc(100vh - 48px))',
        maxWidth: '1180px',
      }"
      :show-close-button="false"
      @escape-key-down.prevent="requestClose"
    >
      <div class="material-editor">
        <header class="editor-header">
          <div class="editor-header__copy">
            <div class="editor-title-line">
              <div>
                <span>아동별 교안 · {{ item.order }}단계 · {{ item.category }}</span>
                <DialogTitle as-child>
                  <h2 id="material-editor-title">{{ draft.title }}</h2>
                </DialogTitle>
              </div>
              <Badge v-if="hasChanges" variant="secondary" class="unsaved-badge">
                저장되지 않은 변경
              </Badge>
            </div>
          </div>
          <div class="editor-header__actions">
            <Button
              class="modal-close"
              variant="ghost"
              size="icon"
              type="button"
              aria-label="교안 편집 닫기"
              @click="requestClose"
            >
              ×
            </Button>
          </div>
        </header>

        <div class="editor-workspace editor-workspace--preview">
          <form id="lesson-material-form" class="editor-form" @submit.prevent="save">
            <section class="form-section">
              <header>
                <span>01</span>
                <div>
                  <h3>훈련 기본 정보</h3>
                  <p>훈련명과 영역은 이 아동의 교안에만 적용됩니다.</p>
                </div>
              </header>
              <div class="field-grid">
                <label class="field">
                  <span>훈련명</span>
                  <Input v-model.trim="draft.title" class="input" required />
                </label>
                <label class="field">
                  <span>영역</span>
                  <Select v-model="draft.category">
                    <SelectTrigger class="select !w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="category in categories" :key="category" :value="category">
                        {{ category }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </section>

            <section class="form-section content-section">
              <header>
                <span>02</span>
                <div>
                  <h3>학습 자료</h3>
                  <p>낱말, 읽기 문장, 질문의 내용과 정답·힌트를 편집합니다.</p>
                </div>
                <div class="content-section-actions">
                  <Button variant="secondary" size="sm" class="add-content-button" type="button" @click="addContentItem">
                    ＋ 자료 추가
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="delete-content-button"
                    type="button"
                    :disabled="!previewItem"
                    @click="removePreviewItem"
                  >
                    현재 자료 삭제
                  </Button>
                </div>
              </header>

              <div class="content-editor-stage">
                <Button
                  v-if="draft.material.contentItems.length"
                  variant="default"
                  size="icon"
                  class="material-page-button material-page-button--previous"
                  type="button"
                  :disabled="previewIndex === 0"
                  aria-label="이전 자료"
                  @click="showPreviousPreview"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </Button>

                <div class="content-editor-list">
                  <template
                    v-for="(contentItem, index) in draft.material.contentItems"
                    :key="contentItem.id"
                  >
                    <article v-if="previewIndex === index" class="content-editor-card">
                      <header>
                        <strong
                          >자료 {{ index + 1 }} / {{ draft.material.contentItems.length }}</strong
                        >
                        <div class="content-header-actions">
                          <div class="content-order-select">
                            <span>배치 순서</span>
                            <Select
                              :model-value="String(index)"
                              @update:model-value="moveContentItemTo(index, Number($event))"
                            >
                              <SelectTrigger size="sm" class="!w-[52px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                              <SelectItem
                                v-for="(_, orderIndex) in draft.material.contentItems"
                                :key="orderIndex"
                                :value="String(orderIndex)"
                              >
                                {{ orderIndex + 1 }}
                              </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </header>
                      <div class="content-field-grid">
                        <label class="field">
                          <span>자료 유형</span>
                          <Select
                            :model-value="contentItem.type"
                            @update:model-value="updateContentType(contentItem, $event)"
                          >
                            <SelectTrigger class="select !w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="word">낱말</SelectItem>
                              <SelectItem value="sentence">읽기 문장</SelectItem>
                              <SelectItem value="question">질문</SelectItem>
                            </SelectContent>
                          </Select>
                        </label>
                        <label class="field">
                          <span>활동 이름</span>
                          <Input v-model.trim="contentItem.label" class="input" required />
                        </label>
                        <label class="field field--full">
                          <span>아동에게 제시할 내용</span>
                          <Textarea
                            v-model.trim="contentItem.content"
                            class="textarea textarea--content"
                            required
                          />
                        </label>
                        <label class="field">
                          <span>정답 또는 학습 기준</span>
                          <Textarea v-model.trim="contentItem.answer" class="textarea" />
                        </label>
                        <label class="field">
                          <span>힌트</span>
                          <Textarea v-model.trim="contentItem.hint" class="textarea" />
                        </label>
                      </div>
                    </article>
                  </template>
                  <div v-if="draft.material.contentItems.length === 0" class="empty-content">
                    <strong>학습 자료가 없습니다.</strong>
                    <p>낱말, 문장 또는 질문을 추가해 주세요.</p>
                  </div>
                </div>

                <div
                  v-if="draft.material.contentItems.length"
                  class="material-pagination-dots"
                  role="group"
                  aria-label="편집할 학습 자료 선택"
                >
                  <Button
                    v-for="(_, index) in draft.material.contentItems"
                    :key="index"
                    variant="ghost"
                    size="icon"
                    type="button"
                    :class="{ active: previewIndex === index }"
                    :aria-label="`${index + 1}번 자료 편집`"
                    :aria-current="previewIndex === index ? 'true' : undefined"
                    @click="previewIndex = index"
                  />
                </div>

                <Button
                  v-if="draft.material.contentItems.length"
                  variant="default"
                  size="icon"
                  class="material-page-button material-page-button--next"
                  type="button"
                  :disabled="previewIndex === draft.material.contentItems.length - 1"
                  aria-label="다음 자료"
                  @click="showNextPreview"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Button>
              </div>
            </section>
          </form>

          <aside class="child-preview" aria-label="아동 화면 미리보기">
            <header>
              <span>아동 화면</span>
              <small>실제 학습 화면에 표시될 모습을 확인합니다.</small>
            </header>

            <div class="preview-overview">
              <span class="preview-category">{{ draft.category }}</span>
              <h3>{{ draft.title }}</h3>
              <p class="preview-instruction">{{ draft.material.childInstruction }}</p>
              <span class="preview-total">총 {{ draft.material.contentItems.length }}개 자료</span>
            </div>

            <article v-if="previewItem" class="preview-device">
              <div class="preview-screen-meta">
                <span>화면 {{ previewIndex + 1 }}</span>
                <small>{{ previewIndex + 1 }} / {{ draft.material.contentItems.length }}</small>
              </div>
              <div class="preview-progress">
                <i
                  :style="{
                    width: `${((previewIndex + 1) / draft.material.contentItems.length) * 100}%`,
                  }"
                ></i>
              </div>
              <div class="preview-content" :class="`preview-content--${previewItem.type}`">
                <span>{{ previewItem.label || '활동 이름' }}</span>
                <strong>{{ previewItem.content || '내용을 입력해 주세요.' }}</strong>
                <small class="preview-type">
                  {{
                    previewItem.type === 'word'
                      ? '낱말 학습'
                      : previewItem.type === 'sentence'
                        ? '읽기 문장'
                        : '질문'
                  }}
                </small>
                <span class="preview-primary-action" aria-hidden="true">
                  {{ previewItem.type === 'question' ? '답을 선택했어요' : '소리 내어 읽었어요' }}
                </span>
                <div class="preview-hint">
                  힌트 · {{ previewItem.hint || '등록된 힌트가 없습니다.' }}
                </div>
              </div>
              <footer class="preview-device__footer">
                <span>정답은 응답 후 공개</span>
              </footer>
            </article>
            <div v-else class="preview-device preview-device--empty">
              <div class="preview-empty">표시할 학습 자료가 없습니다.</div>
            </div>
          </aside>
        </div>

        <footer class="editor-actions">
          <Button variant="outline" type="button" @click="requestClose">취소</Button>
          <Button type="submit" form="lesson-material-form" :disabled="!hasChanges">
            교안 저장
          </Button>
        </footer>
      </div>
    </DialogContent>
  </Dialog>

  <ConfirmDialog
    :open="discardConfirmOpen"
    title="편집 내용을 취소할까요?"
    message="저장하지 않은 교안 변경 사항이 모두 사라집니다."
    confirm-label="변경 내용 버리기"
    @cancel="discardConfirmOpen = false"
    @confirm="discardChanges"
  />
</template>

<style scoped>
.material-editor-backdrop {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: grid;
  padding: 24px;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(2px);
  place-items: center;
}
.material-editor {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border-radius: 14px;
  background: var(--white);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.28);
}
.editor-header {
  display: flex;
  min-height: 88px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 17px 22px;
  border-bottom: 1px solid var(--slate-200);
  background: var(--white);
}
.editor-header__copy {
  min-width: 0;
}
.editor-header__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 9px;
}
.modal-close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 7px;
  background: var(--slate-100);
  color: var(--slate-500);
  font-size: 23px;
  line-height: 1;
}
.modal-close:hover {
  background: var(--slate-200);
  color: var(--slate-900);
}
.editor-title-line {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}
.editor-title-line > div > span {
  color: var(--primary-700);
  font-size: 11px;
  font-weight: 800;
}
.editor-title-line h2 {
  overflow: hidden;
  margin: 3px 0 0;
  color: var(--slate-950);
  font-size: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.unsaved-badge {
  margin-bottom: 3px;
  padding: 5px 8px;
  border-radius: 999px;
  background: #fff7ed;
  color: #c2410c;
  font-size: 9px;
  font-weight: 800;
}
.editor-workspace {
  min-height: 0;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}
.editor-workspace--preview {
  display: grid;
  align-items: stretch;
  grid-template-columns: minmax(0, 1fr) 380px;
}
.editor-form {
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow-y: auto;
  padding: 0 24px 24px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.editor-form::-webkit-scrollbar {
  display: none;
}
.form-section {
  padding: 24px 0;
  border-bottom: 1px solid var(--slate-200);
}
.form-section:last-child {
  border-bottom: 0;
}
.form-section > header {
  display: grid;
  align-items: start;
  gap: 11px;
  margin-bottom: 18px;
  grid-template-columns: 27px minmax(0, 1fr) auto;
}
.form-section > header > span {
  display: grid;
  width: 25px;
  height: 25px;
  border-radius: 6px;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 9px;
  font-weight: 900;
  place-items: center;
}
.form-section h3 {
  margin: 0;
  color: var(--slate-900);
  font-size: 15px;
}
.form-section header p {
  margin: 4px 0 0;
  color: var(--slate-500);
  font-size: 10px;
}
.field-grid {
  display: grid;
  gap: 14px;
  padding-left: 38px;
  grid-template-columns: minmax(0, 1.6fr) minmax(180px, 0.8fr);
}
.field {
  display: grid;
  gap: 7px;
  min-width: 0;
}
.field > span:first-child {
  color: var(--slate-600);
  font-size: 10px;
  font-weight: 800;
}
.textarea {
  min-height: 74px;
  resize: vertical;
}
.add-content-button {
  padding: 6px 9px;
  border: 1px solid var(--primary-100);
  border-radius: 6px;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 10px;
  font-weight: 800;
}
.content-section-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}
.delete-content-button {
  min-height: 29px;
  padding: 0 9px;
  border: 1px solid #fecaca;
  border-radius: 6px;
  background: #fff;
  color: var(--danger-600);
  font-size: 10px;
  font-weight: 700;
}
.delete-content-button:hover:not(:disabled) {
  border-color: #fca5a5;
  background: #fef2f2;
}
.delete-content-button:disabled {
  border-color: var(--slate-200);
  color: var(--slate-300);
  cursor: default;
}
.content-editor-stage {
  position: relative;
  margin-left: 44px;
  margin-right: 44px;
  padding-bottom: 32px;
}
.content-editor-list {
  display: grid;
  gap: 12px;
}
.content-editor-card {
  overflow: hidden;
  border: 1px solid var(--slate-200);
  border-radius: 9px;
  background: var(--white);
}
.content-editor-card > header {
  display: flex;
  min-height: 43px;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid var(--slate-200);
  background: var(--slate-50);
}
.content-editor-card > header strong {
  color: var(--slate-700);
  font-size: 11px;
}
.content-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.content-order-select {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--slate-500);
  font-size: 9px;
  font-weight: 700;
}
.content-order-select select {
  width: 42px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid var(--slate-200);
  border-radius: 6px;
  background: var(--white);
  color: var(--slate-700);
  font-size: 10px;
  font-weight: 800;
}
.content-order-select select:hover,
.content-order-select select:focus {
  border-color: var(--primary-300);
  outline: none;
}
.content-field-grid {
  display: grid;
  gap: 13px;
  padding: 15px;
  grid-template-columns: 1fr 1fr;
}
.content-field-grid .field--full {
  grid-column: 1 / -1;
}
.textarea--content {
  min-height: 88px;
}
.empty-content {
  display: grid;
  min-height: 130px;
  place-content: center;
  text-align: center;
}
.empty-content strong {
  font-size: 12px;
}
.empty-content p {
  margin: 5px 0 0;
  color: var(--slate-500);
  font-size: 10px;
}
.material-page-button {
  position: absolute;
  z-index: 2;
  top: calc(50% - 16px);
  display: grid;
  width: 36px;
  height: 36px;
  border: 1px solid var(--primary-600);
  border-radius: 10px;
  background: var(--primary-600);
  box-shadow: 0 6px 16px color-mix(in oklch, var(--primary) 22%, transparent);
  color: var(--white);
  place-items: center;
  transform: translateY(-50%);
  transition:
    background 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease;
}
.material-page-button svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.3;
}
.material-page-button:hover:not(:disabled) {
  border-color: var(--primary-700);
  background: var(--primary-700);
  box-shadow: 0 8px 20px color-mix(in oklch, var(--primary) 28%, transparent);
}
.material-page-button:disabled {
  border-color: var(--slate-200);
  background: var(--slate-100);
  box-shadow: none;
  color: var(--slate-400);
  cursor: default;
}
.material-page-button--previous {
  left: -40px;
}
.material-page-button--next {
  right: -40px;
}
.material-pagination-dots {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  height: 26px;
  align-items: center;
  justify-content: center;
  gap: 1px;
}
.material-pagination-dots button {
  position: relative;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
}
.material-pagination-dots button::after {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--slate-300);
  content: '';
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  transition: 140ms ease;
}
.material-pagination-dots button.active::after {
  width: 18px;
  border-radius: 999px;
  background: var(--primary-600);
}
.editor-actions {
  display: flex;
  min-height: 68px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 22px;
  border-top: 1px solid var(--slate-200);
  background: var(--white);
  box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.04);
}
.child-preview {
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  border-left: 1px solid var(--slate-200);
  background: #f7f7fb;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.child-preview::-webkit-scrollbar {
  display: none;
}
.child-preview > header {
  display: grid;
  gap: 3px;
  margin-bottom: 12px;
}
.child-preview > header span {
  color: var(--slate-800);
  font-size: 11px;
  font-weight: 800;
}
.child-preview > header small {
  color: var(--slate-500);
  font-size: 9px;
}
.preview-overview {
  display: grid;
  gap: 5px;
  margin-bottom: 12px;
  padding: 13px;
  border-radius: 9px;
  background: var(--white);
}
.preview-overview h3 {
  margin: 0;
  color: var(--slate-950);
  font-size: 15px;
}
.preview-total {
  justify-self: start;
  margin-top: 3px;
  padding: 4px 7px;
  border-radius: 999px;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 8px;
  font-weight: 800;
}
.preview-device {
  min-height: 360px;
  padding: 14px;
  border: 1px solid var(--slate-200);
  border-radius: 12px;
  background: var(--white);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
}
.preview-screen-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}
.preview-screen-meta span {
  color: var(--slate-700);
  font-size: 9px;
  font-weight: 800;
}
.preview-screen-meta small {
  color: var(--slate-400);
  font-size: 8px;
}
.preview-progress {
  height: 4px;
  margin-bottom: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--slate-100);
}
.preview-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary-600);
}
.preview-category {
  color: var(--primary-700);
  font-size: 9px;
  font-weight: 800;
}
.preview-instruction {
  margin: 0;
  color: var(--slate-500);
  font-size: 10px;
  line-height: 1.65;
}
.preview-content {
  display: grid;
  min-height: 230px;
  align-content: center;
  gap: 15px;
  padding: 18px;
  border-radius: 11px;
  background: linear-gradient(145deg, var(--primary-50), var(--background));
  text-align: center;
}
.preview-content > span {
  color: var(--primary-700);
  font-size: 9px;
  font-weight: 800;
}
.preview-content > strong {
  color: var(--slate-950);
  font-size: 19px;
  line-height: 1.5;
  white-space: pre-line;
}
.preview-content--sentence > strong,
.preview-content--question > strong {
  font-size: 14px;
  text-align: left;
}
.preview-type {
  color: var(--slate-400);
  font-size: 8px;
}
.preview-content > .preview-primary-action {
  justify-self: center;
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  padding: 0 13px;
  border-radius: 7px;
  background: var(--primary-600);
  color: var(--white);
  font-size: 10px;
  font-weight: 800;
  pointer-events: none;
}
.preview-hint {
  padding: 9px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.75);
  color: var(--slate-500);
  font-size: 9px;
  line-height: 1.5;
}
.preview-empty {
  display: grid;
  min-height: 250px;
  margin-top: 15px;
  color: var(--slate-400);
  font-size: 10px;
  place-items: center;
}
.preview-device--empty {
  min-height: 300px;
}
.preview-device__footer {
  display: grid;
  gap: 10px;
  margin-top: 17px;
}
.preview-device__footer > span {
  color: var(--slate-400);
  font-size: 9px;
  text-align: center;
}
@media (max-width: 980px) {
  .editor-workspace {
    overflow-y: auto;
  }
  .editor-workspace--preview {
    display: block;
  }
  .editor-form {
    height: auto;
    overflow: visible;
  }
  .child-preview {
    width: min(100%, 440px);
    margin: 0 auto 24px;
    overflow: visible;
    border: 1px solid var(--slate-200);
    border-radius: 12px;
  }
}
@media (max-width: 700px) {
  .material-editor-backdrop {
    padding: 0;
  }
  .material-editor {
    height: 100vh;
    border-radius: 0;
  }
  .editor-header {
    align-items: flex-start;
  }
  .editor-header__actions .button {
    display: none;
  }
  .field-grid,
  .content-field-grid {
    grid-template-columns: 1fr;
  }
  .content-field-grid .field--full {
    grid-column: auto;
  }
  .editor-workspace {
    padding: 0;
  }
  .editor-form {
    padding: 0 16px 20px;
  }
  .editor-actions {
    padding: 10px 16px;
  }
  .content-editor-list,
  .field-grid {
    padding-left: 0;
  }
  .content-editor-stage {
    margin-left: 0;
    margin-right: 0;
    padding-bottom: 42px;
  }
  .material-page-button {
    top: auto;
    bottom: 0;
    width: 38px;
    height: 38px;
    transform: none;
  }
  .material-page-button--previous {
    left: 0;
  }
  .material-page-button--next {
    right: 0;
  }
}
</style>
                    variant="ghost"
                    size="icon"
