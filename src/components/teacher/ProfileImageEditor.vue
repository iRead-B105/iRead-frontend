<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    inputId: string
    label: string
    imageUrl?: string
    fallback: string
    help?: string
    buttonLabel?: string
  }>(),
  {
    imageUrl: '',
    help: 'JPG 또는 PNG, 최대 5MB',
    buttonLabel: '사진 변경',
  },
)

const emit = defineEmits<{
  select: [file: File]
}>()

const previewUrl = ref(props.imageUrl)
let temporaryUrl = ''

watch(
  () => props.imageUrl,
  (value) => {
    if (!temporaryUrl) previewUrl.value = value
  },
)

function selectImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (temporaryUrl) URL.revokeObjectURL(temporaryUrl)
  temporaryUrl = URL.createObjectURL(file)
  previewUrl.value = temporaryUrl
  emit('select', file)
}

onBeforeUnmount(() => {
  if (temporaryUrl) URL.revokeObjectURL(temporaryUrl)
})
</script>

<template>
  <div class="profile-image-editor">
    <img v-if="previewUrl" :src="previewUrl" :alt="`${label} 미리보기`" />
    <span v-else class="profile-image-editor__fallback" aria-hidden="true">{{ fallback }}</span>
    <div class="profile-image-editor__copy">
      <strong>{{ label }}</strong>
      <small>{{ help }}</small>
    </div>
    <label :class="cn(buttonVariants({ variant: 'outline', size: 'sm' }))" :for="inputId">
      {{ buttonLabel }}
    </label>
    <input :id="inputId" hidden type="file" accept="image/jpeg,image/png" @change="selectImage" />
  </div>
</template>

<style scoped>
.profile-image-editor {
  display: grid;
  min-height: 72px;
  align-items: center;
  gap: 14px;
  padding: 12px 0 18px;
  grid-template-columns: 58px auto minmax(0, 1fr);
}

.profile-image-editor img,
.profile-image-editor__fallback {
  width: 56px;
  height: 56px;
  border: 1px solid var(--slate-200);
  border-radius: 50%;
  object-fit: cover;
}

.profile-image-editor__fallback {
  display: grid;
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 18px;
  font-weight: 800;
  place-items: center;
}

.profile-image-editor__copy {
  display: grid;
  gap: 3px;
}

.profile-image-editor__copy strong {
  color: var(--slate-800);
  font-size: 13px;
}

.profile-image-editor__copy small {
  color: var(--slate-500);
  font-size: 11px;
}

.profile-image-editor > label {
  justify-self: start;
  margin-left: 6px;
}
</style>
