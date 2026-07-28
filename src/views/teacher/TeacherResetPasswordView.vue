<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  authRepositories,
  getResetPasswordErrorMessage,
  validateEmail,
  validateResetPasswordForm,
} from '@/features/teacher/auth'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const sessionStore = useSessionStore()
const step = ref<1 | 2>(1)
const identity = reactive({ email: '' })
const password = reactive({ verificationCode: '', newPassword: '', confirmation: '' })
const errorMessage = ref('')
const errorField = ref('')
const errorSummary = ref<HTMLElement | null>(null)
const showPassword = ref(false)
const submitting = ref(false)

async function focusHeading(): Promise<void> {
  await nextTick()
  document.getElementById('reset-password-title')?.focus()
}

async function focusError(field?: string): Promise<void> {
  await nextTick()
  const fieldIds: Record<string, string> = {
    email: 'reset-email',
    verificationCode: 'verification-code',
    newPassword: 'new-password',
    passwordConfirm: 'password-confirmation',
  }
  const target = field ? document.getElementById(fieldIds[field] ?? '') : null
  ;(target ?? errorSummary.value)?.focus()
}

async function verifyIdentity() {
  errorMessage.value = ''
  errorField.value = ''
  const validation = validateEmail(identity.email)
  if (!validation.ok) {
    errorMessage.value = validation.message
    errorField.value = validation.field
    await focusError(validation.field)
    return
  }

  identity.email = validation.value
  step.value = 2
  await focusHeading()
}

async function resetPassword() {
  if (submitting.value) return

  const validation = validateResetPasswordForm({
    email: identity.email,
    verificationCode: password.verificationCode,
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
    await authRepositories.auth.resetPassword(validation.value)
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

async function returnToIdentityStep(): Promise<void> {
  errorMessage.value = ''
  errorField.value = ''
  step.value = 1
  await focusHeading()
}
</script>

<template>
  <main class="recovery-page">
    <section class="recovery-shell" aria-labelledby="reset-password-title">
      <RouterLink class="recovery-logo" to="/login" aria-label="로그인으로 이동">
        <img :src="'/images/iread-logo.png'" alt="iRead" />
      </RouterLink>

      <div class="recovery-card">
        <ol class="stepper" aria-label="비밀번호 재설정 단계">
          <li
            :class="{ active: step === 1, complete: step > 1 }"
            :aria-current="step === 1 ? 'step' : undefined"
          >
            <span>1</span>본인 확인
          </li>
          <li :class="{ active: step === 2 }" :aria-current="step === 2 ? 'step' : undefined">
            <span>2</span>비밀번호 변경
          </li>
        </ol>

        <template v-if="step === 1">
          <header class="recovery-heading">
            <p class="recovery-eyebrow">계정 확인</p>
            <h1 id="reset-password-title" tabindex="-1">비밀번호 찾기</h1>
            <p>회원가입 시 등록한 이메일을 입력해 주세요.</p>
          </header>

          <form class="recovery-form" @submit.prevent="verifyIdentity">
            <div class="field">
              <label for="reset-email">이메일</label>
              <Input
                id="reset-email"
                v-model.trim="identity.email"
                class="input"
                type="email"
                required
                maxlength="50"
                autocomplete="email"
                placeholder="example@iread.co.kr"
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
            <Button class="recovery-submit" type="submit">본인 확인</Button>
          </form>
        </template>

        <template v-else-if="step === 2">
          <header class="recovery-heading">
            <p class="recovery-eyebrow">본인 확인 완료</p>
            <h1 id="reset-password-title" tabindex="-1">새 비밀번호 설정</h1>
            <p>전달받은 검증 코드와 8~100자의 새 비밀번호를 입력해 주세요.</p>
          </header>

          <form class="recovery-form" @submit.prevent="resetPassword">
            <div class="field">
              <label for="verification-code">검증 코드</label>
              <Input
                id="verification-code"
                v-model="password.verificationCode"
                class="input"
                required
                autocomplete="one-time-code"
                placeholder="검증 코드 입력"
                :aria-invalid="errorField === 'verificationCode'"
                :aria-describedby="
                  errorField === 'verificationCode' ? 'reset-password-error' : undefined
                "
              />
            </div>
            <div class="field">
              <label for="new-password">새 비밀번호</label>
              <div class="password-input">
                <Input
                  id="new-password"
                  v-model="password.newPassword"
                  class="input"
                  required
                  minlength="8"
                  maxlength="100"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="새 비밀번호 입력"
                  :aria-invalid="errorField === 'newPassword'"
                  :aria-describedby="
                    errorField === 'newPassword' ? 'reset-password-error' : undefined
                  "
                />
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  :aria-label="showPassword ? '새 비밀번호 숨기기' : '새 비밀번호 보기'"
                  :aria-pressed="showPassword"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? '숨기기' : '보기' }}
                </Button>
              </div>
            </div>
            <div class="field">
              <label for="password-confirmation">새 비밀번호 확인</label>
              <Input
                id="password-confirmation"
                v-model="password.confirmation"
                class="input"
                required
                minlength="8"
                maxlength="100"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="새 비밀번호 다시 입력"
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
            <Button
              variant="link"
              class="text-button"
              type="button"
              :disabled="submitting"
              @click="returnToIdentityStep"
            >
              이전 단계
            </Button>
          </form>
        </template>
      </div>

      <p class="back-link"><RouterLink to="/login">← 로그인으로 돌아가기</RouterLink></p>
    </section>
  </main>
</template>

<style scoped>
.recovery-page {
  display: grid;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 52px 24px;
  background: var(--slate-50);
  place-items: start center;
}

.recovery-shell {
  width: min(480px, 100%);
}

.recovery-logo {
  display: grid;
  width: 132px;
  height: 68px;
  margin: 0 auto 24px;
  overflow: hidden;
  place-items: center;
}

.recovery-logo img {
  width: 108px;
  height: 62px;
  max-width: none;
  object-fit: contain;
  transform: scale(1.85);
}

.recovery-card {
  padding: 40px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
  box-shadow: var(--shadow-card);
}

.stepper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0 0 30px;
  padding: 0;
  list-style: none;
}

.stepper li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--slate-400);
  font-size: 12px;
  font-weight: 700;
}

.stepper li::after {
  height: 2px;
  flex: 1;
  background: var(--slate-200);
  content: '';
}

.stepper li:last-child::after {
  display: none;
}

.stepper span {
  display: grid;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--slate-200);
  color: var(--slate-500);
  place-items: center;
}

.stepper .active,
.stepper .complete {
  color: var(--primary-600);
}

.stepper .active span,
.stepper .complete span {
  background: var(--primary-600);
  color: var(--white);
}

.recovery-heading {
  margin-bottom: 28px;
}

.recovery-heading h1 {
  margin: 6px 0 10px;
  font-size: 28px;
}

.recovery-heading > p:last-child {
  margin: 0;
  color: var(--slate-500);
  line-height: 1.6;
}

.recovery-eyebrow {
  margin: 0;
  color: var(--primary-600) !important;
  font-size: 13px;
  font-weight: 800;
}

.recovery-form {
  display: grid;
  gap: 18px;
}

.recovery-form .input {
  height: 48px;
}

.password-input {
  position: relative;
}

.password-input .input {
  padding-right: 64px;
}

.password-input button {
  position: absolute;
  top: 50%;
  right: 13px;
  min-width: 40px;
  min-height: 32px;
  border: 0;
  background: transparent;
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 700;
  transform: translateY(-50%);
}

.recovery-submit {
  min-height: 50px;
  margin-top: 8px;
}

.error-message {
  margin: -6px 0 0;
  color: var(--red-600, #dc2626);
  font-size: 13px;
}

.text-button {
  border: 0;
  background: transparent;
  color: var(--slate-500);
  font-size: 13px;
  text-decoration: underline;
}

.back-link {
  margin: 20px 0 0;
  text-align: center;
}

.back-link a {
  color: var(--slate-500);
  font-size: 13px;
  text-decoration: none;
}

@media (max-width: 520px) {
  .recovery-page {
    padding: 28px 16px 40px;
  }

  .recovery-card {
    padding: 30px 22px;
  }

  .recovery-heading h1 {
    font-size: 25px;
  }
}

@media (max-width: 360px), (max-height: 620px) {
  .recovery-page {
    padding: 20px 14px 32px;
  }

  .recovery-card {
    padding: 24px 18px;
  }

  .stepper {
    margin-bottom: 24px;
  }
}
</style>
