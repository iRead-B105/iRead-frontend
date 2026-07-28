<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  authRepositories,
  getSignUpErrorMessage,
  validateSignUpForm,
} from '@/features/teacher/auth'

const router = useRouter()
const errorMessage = ref('')
const errorField = ref('')
const errorSummary = ref<HTMLElement | null>(null)
const form = reactive({
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',
  organization: '',
})
const submitting = ref(false)

async function focusError(field?: string): Promise<void> {
  await nextTick()
  const fieldIds: Record<string, string> = {
    email: 'signup-email',
    password: 'signup-password',
    passwordConfirm: 'signup-password-confirm',
    name: 'signup-name',
    organization: 'signup-organization',
  }
  const target = field ? document.getElementById(fieldIds[field] ?? '') : null
  ;(target ?? errorSummary.value)?.focus()
}

async function signup() {
  if (submitting.value) return

  const validation = validateSignUpForm(form)
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
    await authRepositories.auth.signUp(validation.value)
    await router.push('/login')
  } catch (error) {
    errorMessage.value = getSignUpErrorMessage(error)
    await focusError()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="signup-page">
    <header class="signup-header">
      <RouterLink to="/login" aria-label="로그인으로 이동">
        <img :src="'/images/iread-logo.png'" alt="iRead" />
      </RouterLink>
    </header>

    <form class="signup-form" @submit.prevent="signup">
      <div class="signup-heading">
        <h1>회원가입</h1>
        <p>아동 관리에 사용할 교수자 계정을 만들어 주세요.</p>
      </div>

      <fieldset class="signup-fields">
        <legend>계정 정보</legend>
        <div class="field">
          <label for="signup-email">이메일</label>
          <Input
            id="signup-email"
            v-model="form.email"
            class="input"
            required
            type="email"
            maxlength="50"
            autocomplete="email"
            placeholder="example@email.com"
            :aria-invalid="errorField === 'email'"
            :aria-describedby="errorField === 'email' ? 'signup-error' : undefined"
          />
        </div>

        <div class="field">
          <label for="signup-password">비밀번호</label>
          <Input
            id="signup-password"
            v-model="form.password"
            class="input"
            required
            minlength="8"
            maxlength="100"
            type="password"
            autocomplete="new-password"
            placeholder="8~100자 입력"
            :aria-invalid="errorField === 'password'"
            :aria-describedby="
              errorField === 'password'
                ? 'signup-password-help signup-error'
                : 'signup-password-help'
            "
          />
          <p id="signup-password-help" class="field-help">
            8~100자의 비밀번호를 입력해 주세요.
          </p>
        </div>

        <div class="field">
          <label for="signup-password-confirm">비밀번호 확인</label>
          <Input
            id="signup-password-confirm"
            v-model="form.passwordConfirm"
            class="input"
            required
            minlength="8"
            maxlength="100"
            type="password"
            autocomplete="new-password"
            placeholder="비밀번호 다시 입력"
            :aria-invalid="errorField === 'passwordConfirm'"
            :aria-describedby="errorField === 'passwordConfirm' ? 'signup-error' : undefined"
          />
        </div>
      </fieldset>

      <div class="signup-divider" aria-hidden="true"></div>

      <fieldset class="signup-fields">
        <legend>교수자 정보</legend>
        <div class="field">
          <label for="signup-name">이름</label>
          <Input
            id="signup-name"
            v-model="form.name"
            class="input"
            required
            maxlength="10"
            autocomplete="name"
            placeholder="교수자 이름"
            :aria-invalid="errorField === 'name'"
            :aria-describedby="errorField === 'name' ? 'signup-error' : undefined"
          />
        </div>

        <div class="field">
          <label for="signup-organization">소속기관</label>
          <Input
            id="signup-organization"
            v-model="form.organization"
            class="input"
            required
            maxlength="100"
            autocomplete="organization"
            placeholder="소속 기관명"
            :aria-invalid="errorField === 'organization'"
            :aria-describedby="errorField === 'organization' ? 'signup-error' : undefined"
          />
        </div>
      </fieldset>

      <p
        v-if="errorMessage"
        id="signup-error"
        ref="errorSummary"
        class="signup-error"
        role="alert"
        tabindex="-1"
      >
        {{ errorMessage }}
      </p>
      <Button class="signup-submit" type="submit" :disabled="submitting">
        {{ submitting ? '가입 중...' : '회원가입' }}
      </Button>
      <p class="signup-login-link">
        이미 계정이 있으신가요? <RouterLink to="/login">로그인</RouterLink>
      </p>
    </form>
  </main>
</template>

<style scoped>
.signup-page {
  min-height: 100vh;
  min-height: 100dvh;
  padding: 32px 48px 72px;
  background: var(--background);
}
.signup-header { display: flex; height: 68px; align-items: center; justify-content: center; margin: 0 auto 26px; }
.signup-header > a { display: grid; width: 132px; height: 68px; overflow: hidden; place-items: center; }
.signup-header img { width: 108px; height: 62px; max-width: none; object-fit: contain; transform: scale(1.85); }
.signup-form {
  width: min(500px, 100%);
  margin: 0 auto;
  padding: 38px 40px 40px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
  box-shadow: var(--shadow-card);
}
.signup-heading { margin-bottom: 34px; }
.signup-heading h1 { margin: 0 0 7px; font-size: 30px; }
.signup-heading p { margin: 0; color: var(--slate-500); }
.signup-fields { display: grid; gap: 19px; margin: 0; padding: 0; border: 0; }
.signup-fields legend { margin-bottom: 14px; color: var(--slate-800); font-weight: 800; }
.signup-fields .input { height: 46px; }
.field-help { margin: -2px 0 0; color: var(--slate-500); font-size: 11px; }
.signup-divider { height: 1px; margin: 30px 0; background: var(--slate-200); }
.signup-error { padding: 10px 13px; border-radius: 8px; background: #fff1f2; color: var(--danger-600); font-size: 12px; }
.signup-submit { width: 100%; min-height: 50px; margin-top: 30px; }
.signup-login-link { margin: 22px 0 0; color: var(--slate-500); text-align: center; }
.signup-login-link a { color: var(--primary-600); font-weight: 800; }

@media (max-width: 560px) {
  .signup-page { padding: 24px 18px 48px; }
  .signup-form { padding: 30px 22px; }
  .signup-heading h1 { font-size: 26px; }
}

@media (max-width: 360px) {
  .signup-page { padding: 18px 14px 36px; }
  .signup-form { padding: 24px 18px; }
  .signup-header { margin-bottom: 18px; }
}
</style>
