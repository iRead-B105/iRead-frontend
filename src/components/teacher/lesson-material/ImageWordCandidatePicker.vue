<script setup lang="ts">
import { computed } from 'vue'

interface ImageWordCandidate {
  readonly imageId: number
  readonly imageUrl: string
  readonly text: string
}

const props = defineProps<{
  choices: readonly unknown[]
}>()

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
</script>

<template>
  <div class="candidate-picker">
    <p class="candidate-picker__notice" role="status">
      이미지–낱말 후보 API 연동 준비 중입니다. 새 후보 선택은 아직 지원되지 않습니다.
    </p>
    <div v-for="(choice, index) in selected" :key="index" class="candidate-row">
      <img v-if="choice" :src="choice.imageUrl" :alt="`${choice.text} 후보 이미지`" />
      <div v-else class="candidate-placeholder">후보 정보 없음</div>
      <div class="candidate-info">
        <span>선택지 {{ index + 1 }}</span>
        <strong v-if="choice">{{ choice.text }} · #{{ choice.imageId }}</strong>
        <strong v-else>저장된 후보 정보를 표시할 수 없습니다.</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.candidate-picker {
  display: grid;
  gap: 0.6rem;
}

.candidate-picker__notice {
  margin: 0;
  border: 1px dashed #cbd5e1;
  border-radius: 0.65rem;
  background: #f8fafc;
  padding: 0.6rem 0.7rem;
  color: #64748b;
  font-size: 0.75rem;
}

.candidate-row {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
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

.candidate-info {
  display: grid;
  gap: 0.3rem;
}

.candidate-info span {
  color: #475569;
  font-size: 0.72rem;
  font-weight: 700;
}

.candidate-info strong {
  color: #0f172a;
  font-size: 0.85rem;
}
</style>
