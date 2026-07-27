<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { authRepositories } from '@/features/teacher/auth'
import { resolveTeacherRedirect } from '@/router'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const route = useRoute()
const sessionStore = useSessionStore()
const entering = ref(false)
const errorMessage = ref('')

async function enterMock() {
  if (entering.value) return
  entering.value = true
  errorMessage.value = ''

  try {
    const teacher = await authRepositories.teacher.getInfo()
    sessionStore.initialize(teacher, null)
    await router.push(resolveTeacherRedirect(router, route.query.redirect))
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '목업 화면 진입에 실패했습니다.'
  } finally {
    entering.value = false
  }
}
</script>

<template>
  <div class="mock-auth-notice" role="status">
    <strong>Backend와 연동 전 입니다.</strong>
    <span>개발용 목업 화면에서 교수자 기능을 확인할 수 있습니다.</span>
    <Button type="button" variant="outline" :disabled="entering" @click="enterMock">
      {{ entering ? '입장 중...' : '목업 화면으로 입장' }}
    </Button>
    <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.mock-auth-notice {
  display: grid;
  gap: 8px;
  margin: -12px 0 24px;
  padding: 14px;
  border: 1px solid var(--primary-100);
  border-radius: var(--radius-md);
  background: var(--primary-50);
  color: var(--slate-700);
}

.mock-auth-notice strong {
  color: var(--primary-700);
}

.mock-auth-notice span {
  font-size: 12px;
}

.form-error {
  margin: 4px 0 0;
  color: var(--destructive);
  font-size: 13px;
}
</style>
