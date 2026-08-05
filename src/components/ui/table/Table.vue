<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  caption?: string
}>()
</script>

<template>
  <div
    data-slot="table-container"
    class="relative w-full overflow-x-auto"
    :role="caption ? 'region' : undefined"
    :aria-label="caption"
    :tabindex="caption ? 0 : undefined"
  >
    <table data-slot="table" :class="cn('w-full caption-bottom text-sm', props.class)">
      <caption v-if="caption" class="sr-only">{{ caption }}</caption>
      <slot />
    </table>
  </div>
</template>
