<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  authRepositories,
  getResetPasswordErrorMessage,
  validateEmail,
  validateResetPasswordForm,
} from '@/features/teacher/auth'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const email = ref('')
const password = reactive({ newPassword: '', confirmation: '' })
const requestAccepted = ref(false)
const errorMessage = ref('')
const errorField = ref('')
const submitting = ref(false)
const showPassword = ref(false)
const errorSummary = ref<HTMLElement | null>(null)

const resetToken = computed(() => {
  const value = route.query.token
  return typeof value === 'string' ? value.trim() : ''
})
const confirmationMode = computed(() => resetToken.value !== '')

async function focusError(field?: string): Promise<void> {
  await nextTick()
  const fieldIds: Record<string, string> = {
    email: 'reset-email',
    newPassword: 'new-password',
    passwordConfirm: 'password-confirmation',
  }
  const target = field ? document.getElementById(fieldIds[field] ?? '') : null
  ;(target ?? errorSummary.value)?.focus()
}

async function requestResetLink(): Promise<void> {
  if (submitting.value) return
  const validation = validateEmail(email.value)
  if (!validation.ok) {
    errorMessage.value = validation.message
    errorField.value = validation.field
    await focusError(validation.field)
    return
  }

  submitting.value = true
  errorMessage.value = ''
  errorField.value = ''
  try {
    await authRepositories.auth.requestPasswordReset({ email: validation.value })
    requestAccepted.value = true
  } catch (error) {
    errorMessage.value = getResetPasswordErrorMessage(error)
    await focusError()
  } finally {
    submitting.value = false
  }
}

async function confirmReset(): Promise<void> {
  if (submitting.value) return
  const validation = validateResetPasswordForm({
    token: resetToken.value,
    newPassword: password.newPassword,
    passwordConfirm: password.confirmation,
  })
  if (!validation.ok) {
    errorMessage.value = validation.message
    errorField.value = validation.field
    await focusError(validation.field)
    return
  }

  submitting.value = true
  errorMessage.value = ''
  errorField.value = ''
  try {
    await authRepositories.auth.confirmPasswordReset(validation.value)
    sessionStore.reset()
    await router.push({
      name: 'teacher-login',
      query: { passwordReset: 'success' },
    })
  } catch (error) {
    errorMessage.value = getResetPasswordErrorMessage(error)
    await focusError()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="recovery-page">
    <section class="recovery-shell" aria-labelledby="reset-password-title">
      <RouterLink class="recovery-logo" to="/login" aria-label="로그인으로 이동">
        <img :src="'/images/iread-logo.png'" alt="iRead" />
      </RouterLink>

      <div class="recovery-card">
        <template v-if="confirmationMode">
          <header class="recovery-heading">
            <p class="recovery-eyebrow">일회용 링크 확인</p>
            <h1 id="reset-password-title">새 비밀번호 설정</h1>
            <p>8~100자의 새 비밀번호를 입력해 주세요.</p>
          </header>

          <form class="recovery-form" @submit.prevent="confirmReset">
            <div class="field">
              <label for="new-password">새 비밀번호</label>
              <div class="password-input">
                <Input
                  id="new-password"
                  v-model="password.newPassword"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  minlength="8"
                  maxlength="100"
                  autocomplete="new-password"
                  :aria-invalid="errorField === 'newPassword'"
                  :aria-describedby="
                    errorField === 'newPassword' ? 'reset-password-error' : undefined
                  "
                />
                <button
                  type="button"
                  :aria-label="showPassword ? '새 비밀번호 숨기기' : '새 비밀번호 보기'"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? '숨김' : '보기' }}
                </button>
              </div>
            </div>
            <div class="field">
              <label for="password-confirmation">새 비밀번호 확인</label>
              <Input
                id="password-confirmation"
                v-model="password.confirmation"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="8"
                maxlength="100"
                autocomplete="new-password"
                :aria-invalid="errorField === 'passwordConfirm'"
                :aria-describedby="
                  errorField === 'passwordConfirm' ? 'reset-password-error' : undefined
                "
              />
            </div>
            <p
              v-if="errorMessage"
              id="reset-password-error"
              ref="errorSummary"
              class="error-message"
              role="alert"
              tabindex="-1"
            >
              {{ errorMessage }}
            </p>
            <Button class="recovery-submit" type="submit" :disabled="submitting">
              {{ submitting ? '변경 중...' : '비밀번호 변경' }}
            </Button>
          </form>
        </template>

        <template v-else-if="requestAccepted">
          <header class="recovery-heading">
            <p class="recovery-eyebrow">요청 접수</p>
            <h1 id="reset-password-title">이메일을 확인해 주세요</h1>
            <p>
              가입된 이메일이라면 10분 동안 사용할 수 있는 비밀번호 재설정 링크를
              발송했습니다.
            </p>
          </header>
          <RouterLink class="recovery-link" to="/login">로그인으로 돌아가기</RouterLink>
        </template>

        <template v-else>
          <header class="recovery-heading">
            <p class="recovery-eyebrow">계정 복구</p>
            <h1 id="reset-password-title">비밀번호 재설정</h1>
            <p>가입 이메일로 일회용 비밀번호 재설정 링크를 보내드립니다.</p>
          </header>

          <form class="recovery-form" @submit.prevent="requestResetLink">
            <div class="field">
              <label for="reset-email">이메일</label>
              <Input
                id="reset-email"
                v-model.trim="email"
                type="email"
                required
                maxlength="50"
                autocomplete="email"
                placeholder="이메일 주소 입력"
                :aria-invalid="errorField === 'email'"
                :aria-describedby="errorField === 'email' ? 'reset-password-error' : undefined"
              />
            </div>
            <p
              v-if="errorMessage"
              id="reset-password-error"
              ref="errorSummary"
              class="error-message"
              role="alert"
              tabindex="-1"
            >
              {{ errorMessage }}
            </p>
            <Button class="recovery-submit" type="submit" :disabled="submitting">
              {{ submitting ? '요청 중...' : '재설정 링크 받기' }}
            </Button>
          </form>
        </template>
      </div>
    </section>
  </main>
</template>

<style scoped>
.recovery-page {
  display: grid;
  min-height: 100vh;
  padding: 40px 20px;
  background: var(--slate-50);
  place-items: center;
}

.recovery-shell {
  width: min(100%, 460px);
}

.recovery-logo {
  display: block;
  width: 116px;
  margin: 0 auto 24px;
}

.recovery-logo img {
  width: 100%;
}

.recovery-card {
  padding: 34px;
  border: 1px solid var(--slate-200);
  border-radius: 18px;
  background: white;
  box-shadow: 0 18px 45px rgb(15 23 42 / 8%);
}

.recovery-heading {
  display: grid;
  gap: 8px;
  margin-bottom: 26px;
}

.recovery-heading h1,
.recovery-heading p {
  margin: 0;
}

.recovery-heading h1 {
  color: var(--slate-900);
  font-size: 24px;
}

.recovery-heading p {
  color: var(--slate-600);
  line-height: 1.6;
}

.recovery-eyebrow {
  color: var(--primary-700) !important;
  font-size: 12px;
  font-weight: 800;
}

.recovery-form,
.field {
  display: grid;
  gap: 9px;
}

.recovery-form {
  gap: 18px;
}

.field label {
  color: var(--slate-700);
  font-size: 13px;
  font-weight: 700;
}

.password-input {
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.password-input button {
  border: 1px solid var(--slate-300);
  border-radius: 8px;
  background: white;
  padding: 0 13px;
  color: var(--slate-600);
}

.error-message {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff1f2;
  color: var(--danger-600);
  font-size: 12px;
}

.recovery-submit {
  width: 100%;
}

.recovery-link {
  display: block;
  color: var(--primary-700);
  font-weight: 700;
  text-align: center;
}
</style>
