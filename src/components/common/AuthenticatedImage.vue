<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import {
  resolveAuthenticatedProfileImage,
  type ResolvedProfileImage,
} from '@/features/teacher/authenticatedProfileImage'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  src: string | null | undefined
  alt: string
}>()

const resolvedUrl = ref<string | null>(null)
let resolvedImage: ResolvedProfileImage | null = null
let loadVersion = 0

watch(
  () => props.src,
  async (source) => {
    const currentLoad = ++loadVersion
    const nextImage = await resolveAuthenticatedProfileImage(source).catch(() => ({
      url: null,
      revoke: () => undefined,
    }))

    if (currentLoad !== loadVersion) {
      nextImage.revoke()
      return
    }

    resolvedImage?.revoke()
    resolvedImage = nextImage
    resolvedUrl.value = nextImage.url
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  loadVersion += 1
  resolvedImage?.revoke()
})
</script>

<template>
  <img v-if="resolvedUrl" v-bind="$attrs" :src="resolvedUrl" :alt="alt" />
</template>
