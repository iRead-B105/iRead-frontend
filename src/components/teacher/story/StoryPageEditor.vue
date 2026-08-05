<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { createStoryApi, type StoryPage } from '@/features/teacher/story'

const props = defineProps<{ studentId: number; storyId: number; page: StoryPage }>()
const emit = defineEmits<{ updated: [] }>()
const api = createStoryApi()
const subtitle = ref('')
const body = ref('')
const choices = ref(['', '', ''])
const pending = ref(false)
const message = ref('')

watch(
  () => props.page,
  (page, previousPage) => {
    subtitle.value = page.subtitle ?? ''
    body.value = page.textLines.join(' ')
    choices.value = [0, 1, 2].map((index) => page.choices?.[index] ?? '')
    if (!previousPage || page.storyLineId !== previousPage.storyLineId) {
      message.value = ''
    }
  },
  { immediate: true },
)

async function run(action: () => Promise<unknown>, success: string) {
  pending.value = true
  message.value = ''
  try {
    await action()
    message.value = success
    emit('updated')
  } catch (error) {
    message.value = error instanceof Error ? error.message : '페이지를 수정하지 못했습니다.'
  } finally {
    pending.value = false
  }
}

function saveContent() {
  void run(
    () => api.updatePage(props.studentId, props.storyId, props.page.storyLineId, {
      revision: props.page.revision ?? 0,
      body: body.value,
      ...(props.page.requiresBranchInput
        ? { subtitle: subtitle.value, choices: choices.value }
        : {}),
    }),
    '수정 내용을 저장했습니다.',
  )
}

function regenerateImage() {
  void run(
    () => api.regeneratePageImage(
      props.studentId,
      props.storyId,
      props.page.storyLineId,
      props.page.revision ?? 0,
    ),
    '새 장면 이미지를 생성했습니다.',
  )
}

function uploadImage(event: Event) {
  const input = event.target as HTMLInputElement
  const image = input.files?.[0]
  if (!image) return
  void run(
    () => api.uploadPageImage(
      props.studentId,
      props.storyId,
      props.page.storyLineId,
      props.page.revision ?? 0,
      image,
    ),
    '장면 이미지를 바꿨습니다.',
  ).finally(() => { input.value = '' })
}
</script>

<template>
  <section class="story-page-editor" aria-labelledby="story-page-editor-title">
    <header>
      <div>
        <p>읽기 전 페이지</p>
        <h3 id="story-page-editor-title">생성 내용 수정</h3>
      </div>
    </header>

    <label v-if="page.requiresBranchInput">
      <span>분기 소제목</span>
      <input v-model="subtitle" maxlength="40" :disabled="pending" />
    </label>
    <label>
      <span>본문 · 정확히 3문장, 문장당 한글 10~22음절 (권장 13~19)</span>
      <textarea v-model="body" rows="5" maxlength="500" :disabled="pending" />
    </label>
    <div v-if="page.requiresBranchInput" class="choice-fields">
      <label v-for="(_, index) in choices" :key="index">
        <span>선택지 {{ index + 1 }}</span>
        <input v-model="choices[index]" maxlength="40" :disabled="pending" />
      </label>
    </div>
    <div class="editor-actions">
      <Button type="button" variant="outline" :disabled="pending" @click="regenerateImage">
        이미지 다시 생성
      </Button>
      <Button as="label" type="button" variant="outline" class="upload-button" :aria-disabled="pending">
        이미지 업로드
        <input type="file" accept="image/png,image/jpeg,image/webp" :disabled="pending" @change="uploadImage" />
      </Button>
      <Button type="button" :disabled="pending" @click="saveContent">내용 저장</Button>
    </div>
    <p v-if="message" class="editor-message" role="status">{{ message }}</p>
  </section>
</template>

<style scoped>
.story-page-editor { display: grid; gap: 14px; padding: 18px; border: 1px solid #dbe5dc; border-radius: 16px; background: #fbfdf9; }
.story-page-editor header { display: flex; justify-content: space-between; gap: 16px; }
.story-page-editor header p, .story-page-editor header h3 { margin: 0; }
.story-page-editor header p { color: var(--slate-500); font-size: 12px; }
.story-page-editor label { display: grid; gap: 6px; color: var(--slate-700); font-size: 12px; font-weight: 700; }
.story-page-editor input, .story-page-editor textarea { width: 100%; border: 1px solid var(--slate-300); border-radius: 10px; padding: 10px 12px; background: white; color: var(--slate-900); font: inherit; line-height: 1.6; }
.choice-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.editor-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 10px; }
.story-page-editor .editor-actions > * { display: inline-flex; align-items: center; justify-content: center; min-width: 132px; min-height: 40px; font-family: inherit; font-size: 14px; font-weight: 700; line-height: 1; }
.upload-button { cursor: pointer; }
.upload-button[aria-disabled='true'] { pointer-events: none; opacity: .5; }
.upload-button input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.editor-message { margin: 0; color: var(--primary-700); font-size: 13px; }
@media (max-width: 720px) { .choice-fields { grid-template-columns: 1fr; } .story-page-editor header { flex-direction: column; } }
</style>
