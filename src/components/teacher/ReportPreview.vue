<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const REPORT_WIDTH = 900
const PREVIEW_PADDING = 48

const viewport = ref<HTMLElement>()
const document = ref<HTMLElement>()
const scale = ref(1)
const documentHeight = ref(0)
let resizeObserver: ResizeObserver | undefined
let animationFrame: number | undefined

const stageStyle = computed(() => ({
  width: `${REPORT_WIDTH * scale.value}px`,
  height: `${documentHeight.value * scale.value}px`,
}))

const documentStyle = computed(() => ({
  transform: `scale(${scale.value})`,
}))

const scaleLabel = computed(() => `${Math.round(scale.value * 100)}%`)

function updatePreviewSize() {
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)

  animationFrame = requestAnimationFrame(() => {
    if (!viewport.value || !document.value) return
    const availableWidth = Math.max(0, viewport.value.clientWidth - PREVIEW_PADDING)
    scale.value = Math.min(1, availableWidth / REPORT_WIDTH)
    documentHeight.value = document.value.scrollHeight
  })
}

onMounted(async () => {
  await nextTick()
  resizeObserver = new ResizeObserver(updatePreviewSize)
  if (viewport.value) resizeObserver.observe(viewport.value)
  if (document.value) resizeObserver.observe(document.value)
  updatePreviewSize()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <section ref="viewport" class="report-preview" aria-label="보고서 미리보기">
    <div class="report-preview__meta print-hidden">화면 맞춤 · {{ scaleLabel }}</div>
    <div class="report-preview__stage" :style="stageStyle">
      <div ref="document" class="report-preview__document" :style="documentStyle">
        <slot />
      </div>
    </div>
  </section>
</template>

<style scoped>
.report-preview {
  width: 100%;
  padding: 14px 24px 24px;
  overflow: hidden;
  background: var(--slate-100);
}

.report-preview__meta {
  margin-bottom: 10px;
  color: var(--slate-500);
  font-size: 11px;
  text-align: right;
}

.report-preview__stage {
  position: relative;
  margin: 0 auto;
}

.report-preview__document {
  position: absolute;
  top: 0;
  left: 0;
  width: 900px;
  transform-origin: top left;
}

@media print {
  .report-preview {
    padding: 0;
    overflow: visible;
    background: transparent;
  }

  .report-preview__stage {
    width: auto !important;
    height: auto !important;
  }

  .report-preview__document {
    position: static;
    width: auto;
    transform: none !important;
  }
}
</style>
