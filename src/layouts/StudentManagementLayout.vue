<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AsyncStatePanel, { type AsyncStatePanelKind } from '@/components/common/AsyncStatePanel.vue'
import { focusRouteContent } from '@/router/accessibility'
import { useStudentStore } from '@/stores/students'

interface StudentRouteState {
  readonly kind: AsyncStatePanelKind
  readonly title: string
  readonly message: string
  readonly retryLabel?: string
}

function parseStudentId(value: unknown): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  const parsed = typeof normalized === 'string' ? Number(normalized) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const route = useRoute()
const router = useRouter()
const studentStore = useStudentStore()
const { detailsById, detailStatusById, detailErrorStatusById, detailStaleById } =
  storeToRefs(studentStore)
const studentId = computed(() => parseStudentId(route.params.id))
const hasRenderedRouteContent = ref(false)
const studentDetail = computed(() =>
  studentId.value === null ? null : (detailsById.value[studentId.value] ?? null),
)
const routeState = computed<StudentRouteState | null>(() => {
  const id = studentId.value
  if (id === null) {
    return {
      kind: 'not-found',
      title: '올바르지 않은 학습자 주소입니다.',
      message: '학습자 목록에서 대상을 다시 선택해 주세요.',
    }
  }
  if (studentDetail.value) return null

  const status = detailStatusById.value[id] ?? 'idle'
  if (status === 'idle' || status === 'loading') {
    return {
      kind: 'loading',
      title: '학습자 정보를 확인하고 있습니다.',
      message: '잠시만 기다려 주세요.',
    }
  }

  const errorStatus = detailErrorStatusById.value[id] ?? null
  if (errorStatus === 403) {
    return {
      kind: 'forbidden',
      title: '이 학습자에게 접근할 권한이 없습니다.',
      message: '담당 학습자인지 확인하거나 관리자에게 문의해 주세요.',
    }
  }
  if (errorStatus === 404) {
    return {
      kind: 'not-found',
      title: '학습자를 찾을 수 없습니다.',
      message: '삭제되었거나 더 이상 담당하지 않는 학습자일 수 있습니다.',
    }
  }
  return {
    kind: 'error',
    title: '학습자 정보를 불러오지 못했습니다.',
    message: '연결 상태를 확인한 뒤 다시 시도해 주세요.',
    retryLabel: '다시 시도',
  }
})

async function loadStudentRoute(id: number | null): Promise<void> {
  if (id === null) return
  if (detailsById.value[id] && detailStaleById.value[id] !== true) return
  await studentStore.loadDetail(id)
}

function goToStudentList(): void {
  void router.push({ name: 'teacher-students' })
}

watch(studentId, loadStudentRoute, { immediate: true })
watch(
  routeState,
  (nextState, previousState) => {
    if (!nextState) {
      hasRenderedRouteContent.value = true
      if (previousState) void focusRouteContent()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="student-layout" :aria-busy="routeState?.kind === 'loading' ? 'true' : undefined">
    <h1 v-if="routeState && routeState.kind !== 'loading'" class="sr-only" data-route-focus>
      아동 관리
    </h1>
    <section
      v-if="routeState?.kind === 'loading'"
      class="student-layout__skeleton"
      data-test="student-route-skeleton"
      role="status"
      aria-live="polite"
      aria-label="학습자 정보를 불러오는 중입니다"
    >
      <span class="sr-only">학습자 정보를 불러오는 중입니다.</span>
      <div class="student-layout__skeleton-heading">
        <span class="skeleton-block skeleton-block--title" />
        <span class="skeleton-block skeleton-block--action" />
      </div>
      <div class="student-layout__skeleton-grid">
        <span v-for="index in 4" :key="index" class="skeleton-block skeleton-block--card" />
      </div>
    </section>
    <AsyncStatePanel
      v-else-if="routeState"
      :kind="routeState.kind"
      :title="routeState.title"
      :message="routeState.message"
      :retry-label="routeState.retryLabel"
      action-label="학습자 목록으로 이동"
      @retry="loadStudentRoute(studentId)"
      @action="goToStudentList"
    />
    <RouterView v-slot="{ Component, route: childRoute }">
      <div
        v-show="!routeState"
        class="student-layout__content"
        data-test="student-route-content"
        :aria-hidden="routeState ? 'true' : undefined"
      >
        <component
          :is="Component"
          v-if="hasRenderedRouteContent"
          :key="String(childRoute.name ?? childRoute.path)"
        />
      </div>
    </RouterView>
  </div>
</template>

<style scoped>
.student-layout {
  width: 100%;
  min-height: 560px;
}
.student-layout__content {
  width: 100%;
}
.student-layout__skeleton {
  display: grid;
  min-height: 560px;
  gap: 20px;
}
.student-layout__skeleton-heading {
  display: flex;
  min-height: 76px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--slate-200);
}
.student-layout__skeleton-grid {
  display: grid;
  align-content: start;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.skeleton-block {
  display: block;
  border-radius: var(--radius-md);
  background: linear-gradient(
    90deg,
    var(--slate-100) 25%,
    var(--slate-50) 50%,
    var(--slate-100) 75%
  );
  background-size: 200% 100%;
  animation: student-skeleton 1.2s ease-in-out infinite;
}
.skeleton-block--title {
  width: 168px;
  height: 30px;
}
.skeleton-block--action {
  width: 96px;
  height: 32px;
}
.skeleton-block--card {
  min-height: 190px;
}
@keyframes student-skeleton {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton-block {
    animation: none;
  }
}
@media (max-width: 760px) {
  .student-layout__skeleton-grid {
    grid-template-columns: 1fr;
  }
}
</style>
