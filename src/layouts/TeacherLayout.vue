<script setup lang="ts">
// 교수자 화면을 좌측 사이드바와 우측 메인 영역으로 나누는 공통 레이아웃입니다.
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView } from 'vue-router'
import TeacherSidebar from '@/components/teacher/TeacherSidebar.vue'
import { Button } from '@/components/ui/button'
import { useRealtimeFreshnessStore } from '@/stores/realtimeFreshness'

const realtimeFreshnessStore = useRealtimeFreshnessStore()
const { warningVisible, lastSuccessfulAt, retrying } = storeToRefs(realtimeFreshnessStore)
const lastSuccessfulLabel = computed(() =>
  lastSuccessfulAt.value === null
    ? null
    : new Intl.DateTimeFormat('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(lastSuccessfulAt.value),
)
</script>

<template>
  <!-- shell은 교수자 페이지 전체를 감싸는 가장 바깥 컨테이너입니다. -->
  <div class="teacher-shell">
    <a class="skip-link" href="#main-content">본문으로 건너뛰기</a>
    <TeacherSidebar />
    <main id="main-content" class="teacher-content" tabindex="-1">
      <section
        v-if="warningVisible"
        class="freshness-warning"
        role="status"
        aria-live="polite"
        aria-label="데이터 최신성 안내"
      >
        <div>
          <strong>연결이 불안정하여 최신 정보가 아닐 수 있습니다.</strong>
          <small>
            {{
              lastSuccessfulLabel
                ? `마지막 갱신 ${lastSuccessfulLabel}`
                : '마지막 갱신 시각을 확인할 수 없습니다.'
            }}
          </small>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="retrying"
          @click="realtimeFreshnessStore.requestRetry()"
        >
          {{ retrying ? '다시 시도 중' : '다시 시도' }}
        </Button>
      </section>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* scoped는 아래 CSS가 이 컴포넌트 내부 요소에만 적용되도록 범위를 제한합니다. */
.teacher-shell {
  display: grid;
  width: 100%;
  min-height: 100vh;
  min-width: 0;
  align-items: start;
  background: var(--content-background);
  grid-template-columns: 240px minmax(0, 1fr);
}

.teacher-content {
  width: 100%;
  min-height: 100vh;
  min-width: 0;
  padding: 28px 36px 48px;
  background: var(--content-background);
}

.freshness-warning {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid color-mix(in oklch, var(--warning-500) 38%, var(--border));
  border-radius: var(--radius-md);
  background: color-mix(in oklch, var(--warning-500) 9%, var(--white));
  color: var(--foreground);
}

.freshness-warning > div {
  display: grid;
  gap: 4px;
}

.freshness-warning strong {
  font-size: 14px;
}

.freshness-warning small {
  color: var(--muted-foreground);
  font-size: 12px;
}

.skip-link {
  position: fixed;
  z-index: 100;
  top: 12px;
  left: 12px;
  padding: 10px 14px;
  border: 2px solid var(--primary-700);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--primary-700);
  font-weight: 800;
  transform: translateY(calc(-100% - 24px));
}

.skip-link:focus {
  transform: translateY(0);
}

@media (max-width: 900px) {
  .teacher-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .teacher-content {
    min-height: auto;
    padding: 24px;
  }
}

@media (max-width: 640px) {
  .teacher-content {
    padding: 18px 14px 32px;
  }

  .freshness-warning {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
