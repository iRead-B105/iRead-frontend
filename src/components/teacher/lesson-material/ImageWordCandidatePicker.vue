<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'

interface ImageWordCandidate {
  readonly imageId: number
  readonly imageUrl: string
  readonly text: string
}

const props = defineProps<{
  choices: readonly unknown[]
  disabled: boolean
}>()

const emit = defineEmits<{
  update: [choices: readonly ImageWordCandidate[]]
}>()

function emojiImage(emoji: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="100%" height="100%" rx="20" fill="${color}"/><text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" font-size="72">${emoji}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const candidates: readonly ImageWordCandidate[] = [
  { imageId: 101, imageUrl: emojiImage('🍉', '#ecfdf5'), text: '수박' },
  { imageId: 102, imageUrl: emojiImage('🦌', '#fff7ed'), text: '사슴' },
  { imageId: 103, imageUrl: emojiImage('🚆', '#eff6ff'), text: '기차' },
  { imageId: 104, imageUrl: emojiImage('✏️', '#fefce8'), text: '연필' },
]

function candidate(value: unknown): ImageWordCandidate | null {
  if (typeof value !== 'object' || value === null) return null
  const imageId = 'imageId' in value ? value.imageId : null
  const imageUrl = 'imageUrl' in value ? value.imageUrl : null
  const text = 'text' in value ? value.text : null
  return Number.isInteger(imageId) && typeof imageUrl === 'string' && typeof text === 'string'
    ? { imageId: Number(imageId), imageUrl, text }
    : null
}

const selected = computed(() => props.choices.map(candidate))

function replace(index: number, event: Event): void {
  const imageId = Number((event.target as HTMLSelectElement).value)
  const nextCandidate = candidates.find((item) => item.imageId === imageId)
  if (!nextCandidate) return
  const next = [...selected.value]
  next[index] = nextCandidate
  emit('update', next.filter((item): item is ImageWordCandidate => Boolean(item)))
}

function add(): void {
  const used = new Set(selected.value.map((item) => item?.imageId))
  const nextCandidate = candidates.find((item) => !used.has(item.imageId))
  if (!nextCandidate) return
  emit('update', [
    ...selected.value.filter((item): item is ImageWordCandidate => Boolean(item)),
    nextCandidate,
  ])
}

function remove(index: number): void {
  emit(
    'update',
    selected.value.filter(
      (item, candidateIndex): item is ImageWordCandidate =>
        candidateIndex !== index && Boolean(item),
    ),
  )
}
</script>

<template>
  <div class="candidate-picker">
    <p>Backend 후보 API와 동일한 이미지 식별자·URL·낱말 묶음을 Mock 후보에서 선택합니다.</p>
    <div v-for="(choice, index) in selected" :key="index" class="candidate-row">
      <img
        v-if="choice"
        :src="choice.imageUrl"
        :alt="`${choice.text} 후보 이미지`"
      />
      <div v-else class="candidate-placeholder">후보 미선택</div>
      <label>
        <span>선택지 {{ index + 1 }}</span>
        <select
          :value="choice?.imageId ?? ''"
          :disabled="disabled"
          @change="replace(index, $event)"
        >
          <option value="" disabled>후보를 선택해 주세요</option>
          <option v-for="item in candidates" :key="item.imageId" :value="item.imageId">
            {{ item.text }} · #{{ item.imageId }}
          </option>
        </select>
      </label>
      <Button
        variant="ghost"
        size="icon-sm"
        type="button"
        :disabled="disabled"
        :aria-label="`이미지–낱말 선택지 ${index + 1} 삭제`"
        @click="remove(index)"
      >
        ×
      </Button>
    </div>
    <Button
      variant="outline"
      size="sm"
      type="button"
      :disabled="disabled || selected.length >= candidates.length"
      @click="add"
    >
      + 후보 추가
    </Button>
  </div>
</template>

<style scoped>
.candidate-picker {
  display: grid;
  gap: 0.6rem;
}

.candidate-picker > p {
  margin: 0;
  color: #64748b;
  font-size: 0.75rem;
}

.candidate-row {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid #dbe3ef;
  border-radius: 0.75rem;
  padding: 0.55rem;
}

.candidate-row img,
.candidate-placeholder {
  width: 4.5rem;
  height: 3rem;
  border-radius: 0.5rem;
  object-fit: cover;
}

.candidate-placeholder {
  display: grid;
  place-items: center;
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.65rem;
}

.candidate-row label {
  display: grid;
  gap: 0.3rem;
}

.candidate-row label span {
  color: #475569;
  font-size: 0.72rem;
  font-weight: 700;
}

.candidate-row select {
  width: 100%;
  border: 1px solid #d7dee8;
  border-radius: 0.55rem;
  background: white;
  padding: 0.55rem;
}
</style>
