<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { resolveReportPreviewLayout } from '@/features/teacher/report'

const REPORT_WIDTH = 900
const PREVIEW_PADDING = 48

const viewport = ref<HTMLElement>()
const document = ref<HTMLElement>()
const scale = ref(1)
const documentHeight = ref(0)
const mobileLayout = ref(false)
let resizeObserver: ResizeObserver | undefined
let animationFrame: number | undefined

const stageStyle = computed(() =>
  mobileLayout.value
    ? { width: '100%', height: 'auto' }
    : {
        width: `${REPORT_WIDTH * scale.value}px`,
        height: `${documentHeight.value * scale.value}px`,
      },
)

const documentStyle = computed(() =>
  mobileLayout.value ? { transform: 'none' } : { transform: `scale(${scale.value})` },
)

const scaleLabel = computed(() =>
  mobileLayout.value ? '모바일 읽기' : `${Math.round(scale.value * 100)}%`,
)

function updatePreviewSize() {
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)

  animationFrame = requestAnimationFrame(() => {
    if (!viewport.value || !document.value) return
    const layout = resolveReportPreviewLayout(
      viewport.value.clientWidth,
      REPORT_WIDTH,
      PREVIEW_PADDING,
    )
    mobileLayout.value = layout.mobile
    scale.value = layout.scale
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
  <section
    ref="viewport"
    class="report-preview"
    :class="{ 'report-preview--mobile': mobileLayout }"
    aria-label="보고서 미리보기"
  >
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

.report-preview--mobile {
  padding: 0;
  overflow: visible;
  background: transparent;
}

.report-preview--mobile .report-preview__meta {
  padding: 10px 12px;
  margin: 0;
  background: var(--slate-100);
}

.report-preview--mobile .report-preview__document {
  position: static;
  width: 100%;
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
