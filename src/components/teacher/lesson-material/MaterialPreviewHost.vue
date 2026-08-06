<script setup lang="ts">
import { computed } from 'vue'
import { Mic, Volume2 } from '@lucide/vue'
import type { EditableLessonMaterialItem } from '@/features/teacher/training'
import { toMaterialPreviewModel } from './materialPreviewAdapters'

const props = defineProps<{
  material: EditableLessonMaterialItem
  unitName: string
}>()

const preview = computed(() => toMaterialPreviewModel(props.material))
const isTracePreview = computed(() => preview.value?.editorCode === 'E01')
const usesVoice = computed(() =>
  preview.value ? ['E01', 'E08', 'E09', 'E10'].includes(preview.value.editorCode) : false,
)
</script>

<template>
  <section
    v-if="preview"
    class="learner-activity-preview"
    :data-editor-code="preview.editorCode"
    :aria-label="`${unitName} 아동 앱 훈련 콘텐츠 카드 미리보기`"
  >
    <div v-if="isTracePreview" class="trace-layout">
      <div class="trace-stage" aria-label="글자 따라 보기 영역">
        <span class="trace-start" aria-hidden="true">1</span>
        <strong class="trace-glyph">{{ preview.primaryText || '가' }}</strong>
      </div>

      <aside class="trace-side" aria-label="소리와 말하기 상태">
        <section class="listen-panel">
          <span>소리 듣기</span>
          <button type="button" disabled aria-label="소리 듣기 미리보기">
            <Volume2 aria-hidden="true" />
          </button>
        </section>

        <section class="speech-panel">
          <span class="mic-state" aria-hidden="true"><Mic /></span>
          <span class="speech-wave" aria-hidden="true">
            <i v-for="index in 7" :key="index"></i>
          </span>
          <strong>글자를 따라 읽어요!</strong>
        </section>
      </aside>
    </div>

    <template v-else>
      <div v-if="preview.imageUrl || preview.imageDescription" class="scene-preview">
        <img v-if="preview.imageUrl" :src="preview.imageUrl" alt="문항 장면" />
        <div v-else aria-label="이미지 준비 중">이미지 준비 중</div>
      </div>

      <div class="stimulus-card" :class="`stimulus-card--${preview.editorCode.toLowerCase()}`">
        <strong>{{ preview.primaryText || '표시 내용을 입력해 주세요.' }}</strong>
        <small v-if="preview.secondaryText">{{ preview.secondaryText }}</small>
        <span v-if="preview.repeatCount" class="repeat-count">
          {{ preview.repeatCount }}회 반복
        </span>
      </div>

      <div v-if="preview.chips.length" class="preview-chips" aria-label="학습 카드">
        <span v-for="(chip, index) in preview.chips" :key="`${chip}-${index}`">{{ chip }}</span>
      </div>

      <div v-if="preview.choiceTexts.length" class="preview-choices" aria-label="선택 카드">
        <button
          v-for="(choice, index) in preview.choiceTexts"
          :key="`${choice}-${index}`"
          :class="`choice-${(index % 3) + 1}`"
          type="button"
          disabled
        >
          {{ choice }}
        </button>
      </div>

      <div v-if="usesVoice" class="voice-preview" aria-label="말하기 입력 미리보기">
        <span class="mic-state" aria-hidden="true"><Mic /></span>
        <strong>말해봐!</strong>
      </div>
    </template>
  </section>
  <p v-else class="unsupported" role="alert">
    {{ material.questionType }} 문항 유형은 아직 미리보기에 연결되지 않았습니다.
  </p>
</template>

<style scoped>
.learner-activity-preview {
  display: grid;
  min-height: 420px;
  align-content: center;
  gap: 16px;
  padding: 22px;
  border: 1px solid #eadfce;
  border-radius: 24px;
  background: #fff8eb;
  box-shadow: 0 12px 28px rgb(70 63 50 / 9%);
}

.trace-layout {
  display: grid;
  min-height: 270px;
  grid-template-columns: minmax(0, 1fr) 116px;
  gap: 12px;
}

.trace-stage,
.listen-panel,
.speech-panel,
.stimulus-card,
.voice-preview {
  border: 2px solid rgb(224 217 205 / 78%);
  background: #fff;
  box-shadow: 0 8px 20px rgb(70 63 50 / 9%);
}

.trace-stage {
  position: relative;
  display: grid;
  min-width: 0;
  place-items: center;
  overflow: hidden;
  border-radius: 22px;
}

.trace-glyph {
  color: #fff;
  font-size: clamp(88px, 11vw, 138px);
  font-weight: 900;
  line-height: 1;
  paint-order: stroke fill;
  -webkit-text-stroke: 12px #5f9df1;
  text-shadow: 0 4px 0 rgb(95 157 241 / 14%);
}

.trace-start {
  position: absolute;
  z-index: 1;
  top: 24%;
  left: 31%;
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border: 4px solid #fff;
  border-radius: 50%;
  background: #ffd966;
  color: #20345e;
  font-size: 12px;
  font-weight: 900;
  box-shadow: 0 3px 4px rgb(86 72 38 / 20%);
}

.trace-side {
  display: grid;
  min-width: 0;
  grid-template-rows: 1fr 1.35fr;
  gap: 12px;
}

.listen-panel,
.speech-panel {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  border-radius: 19px;
}

.listen-panel {
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}

.listen-panel > span {
  padding: 5px 10px;
  border-radius: 999px;
  background: #9564df;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  white-space: nowrap;
}

.listen-panel button {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #eaf5ff;
  color: #4284db;
  opacity: 1;
}

.listen-panel svg {
  width: 21px;
  height: 21px;
}

.speech-panel {
  flex-direction: column;
  gap: 7px;
  padding: 10px 7px;
  color: #697995;
}

.mic-state {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 2px solid #d6e7f8;
  border-radius: 50%;
  background: #fff;
  color: #ea5c67;
}

.mic-state svg {
  width: 20px;
  height: 20px;
}

.speech-wave {
  display: flex;
  height: 30px;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.speech-wave i {
  width: 3px;
  height: 12px;
  border-radius: 999px;
  background: #5fbaf3;
}

.speech-wave i:nth-child(2n) {
  height: 21px;
  background: #9564df;
}

.speech-wave i:nth-child(3n) {
  height: 27px;
  background: #f26773;
}

.speech-panel strong {
  font-size: 10px;
  font-weight: 900;
  line-height: 1.3;
  text-align: center;
}

.scene-preview {
  display: grid;
  overflow: hidden;
  border: 2px solid #eadfce;
  border-radius: 22px;
  background: #fff;
}

.scene-preview img,
.scene-preview div {
  width: 100%;
  aspect-ratio: 16 / 7;
  object-fit: cover;
}

.scene-preview div {
  display: grid;
  place-items: center;
  color: #697995;
  font-weight: 800;
}

.stimulus-card {
  display: grid;
  min-height: 112px;
  place-items: center;
  gap: 8px;
  padding: 18px;
  border-radius: 22px;
  text-align: center;
}

.stimulus-card strong {
  color: #20345e;
  font-size: 28px;
  font-weight: 900;
  line-height: 1.35;
  white-space: pre-wrap;
}

.stimulus-card small {
  color: #697995;
  font-size: 12px;
  font-weight: 700;
}

.repeat-count {
  padding: 4px 9px;
  border-radius: 999px;
  background: #eaf5ff;
  color: #3778c8;
  font-size: 11px;
  font-weight: 800;
}

.preview-chips,
.preview-choices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
  gap: 10px;
}

.preview-chips span,
.preview-choices button {
  display: grid;
  min-height: 58px;
  place-items: center;
  border: 2px solid #e6d8bd;
  border-radius: 18px;
  background: #fffdf7;
  color: #20345e;
  font-size: 15px;
  font-weight: 900;
  opacity: 1;
}

.preview-choices .choice-1 {
  border-color: #f4d26b;
  background: #fff8d9;
}

.preview-choices .choice-2 {
  border-color: #8edcc8;
  background: #e9fff7;
}

.preview-choices .choice-3 {
  border-color: #c5a9ee;
  background: #f6efff;
}

.voice-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  border-radius: 18px;
  color: #ea5c67;
}

.voice-preview strong {
  font-size: 14px;
  font-weight: 900;
}

.unsupported {
  margin: 0;
  color: #b91c1c;
}

@media (max-width: 600px) {
  .learner-activity-preview {
    min-height: 360px;
    padding: 16px;
  }

  .trace-layout {
    grid-template-columns: 1fr;
  }

  .trace-side {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: none;
  }
}
</style>
