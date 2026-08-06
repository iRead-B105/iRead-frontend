<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { buttonVariants } from '@/components/ui/button'
import {
  resolveAuthenticatedProfileImage,
  type ResolvedProfileImage,
} from '@/features/teacher/authenticatedProfileImage'
import { validateProfileImage } from '@/features/teacher/profileImageValidation'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    inputId: string
    label: string
    imageUrl?: string | null
    fallback: string
    help?: string
    buttonLabel?: string
    previewVersion?: number
    disabled?: boolean
  }>(),
  {
    imageUrl: '',
    help: 'JPG 또는 PNG, 최대 5MB',
    buttonLabel: '사진 변경',
    previewVersion: 0,
    disabled: false,
  },
)

const emit = defineEmits<{
  select: [file: File]
  error: [message: string | null]
}>()

const previewUrl = ref<string | null>(null)
let temporaryUrl = ''
let resolvedImage: ResolvedProfileImage | null = null
let loadVersion = 0

async function loadStoredImage(imageUrl: string | null | undefined): Promise<void> {
  const currentLoad = ++loadVersion
  const nextImage = await resolveAuthenticatedProfileImage(imageUrl).catch(() => ({
    url: null,
    revoke: () => undefined,
  }))

  if (currentLoad !== loadVersion || temporaryUrl) {
    nextImage.revoke()
    return
  }

  resolvedImage?.revoke()
  resolvedImage = nextImage
  previewUrl.value = nextImage.url
}

watch(
  () => props.imageUrl,
  (value) => {
    if (!temporaryUrl) void loadStoredImage(value)
  },
  { immediate: true },
)

watch(
  () => props.previewVersion,
  () => {
    if (temporaryUrl) URL.revokeObjectURL(temporaryUrl)
    temporaryUrl = ''
    void loadStoredImage(props.imageUrl)
  },
)

function selectImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const validationError = validateProfileImage(file)
  if (validationError) {
    input.value = ''
    emit('error', validationError)
    return
  }

  if (temporaryUrl) URL.revokeObjectURL(temporaryUrl)
  loadVersion += 1
  temporaryUrl = URL.createObjectURL(file)
  previewUrl.value = temporaryUrl
  emit('error', null)
  emit('select', file)
  input.value = ''
}

onBeforeUnmount(() => {
  loadVersion += 1
  if (temporaryUrl) URL.revokeObjectURL(temporaryUrl)
  resolvedImage?.revoke()
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
    <label
      :class="
        cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          disabled && 'pointer-events-none opacity-50',
        )
      "
      :for="inputId"
      :aria-disabled="disabled"
    >
      {{ buttonLabel }}
    </label>
    <input
      :id="inputId"
      hidden
      type="file"
      accept="image/jpeg,image/png"
      :disabled="disabled"
      @change="selectImage"
    />
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
  min-width: 0;
  gap: 3px;
}

.profile-image-editor__copy strong {
  color: var(--slate-800);
  font-size: 13px;
}

.profile-image-editor__copy small {
  color: var(--slate-500);
  font-size: 11px;
  overflow-wrap: anywhere;
}

.profile-image-editor > label {
  justify-self: start;
  margin-left: 6px;
}

@media (max-width: 480px) {
  .profile-image-editor {
    align-items: center;
    grid-template-columns: 58px minmax(0, 1fr);
  }

  .profile-image-editor > label {
    grid-column: 1 / -1;
    margin-left: 0;
  }
}
</style>
