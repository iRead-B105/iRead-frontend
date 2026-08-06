<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import SaveToast from '@/components/common/SaveToast.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  authRepositories,
  getSignUpErrorMessage,
  validateSignUpForm,
  validateSignUpFields,
  type SignUpFormErrors,
} from '@/features/teacher/auth'

const router = useRouter()
const errorMessage = ref('')
const errorField = ref('')
const fieldErrors = ref<SignUpFormErrors>({})
const errorSummary = ref<HTMLElement | null>(null)
const form = reactive({
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',
  organization: '',
})
const submitting = ref(false)

const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimer: number | null = null

function triggerToast(msg: string): void {
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer)
  }
  toastMessage.value = msg
  toastVisible.value = true
  toastTimer = window.setTimeout(() => {
    toastVisible.value = false
    toastTimer = null
  }, 3000)
}

function validateField(field: keyof SignUpFormErrors): void {
  const errors = validateSignUpFields(form)
  fieldErrors.value = { ...fieldErrors.value, [field]: errors[field] }
  if (errorMessage.value && errorField.value === field) {
    const firstField = (
      ['email', 'password', 'passwordConfirm', 'name', 'organization'] as const
    ).find((candidate) => fieldErrors.value[candidate])
    errorField.value = firstField ?? ''
    errorMessage.value = firstField ? (fieldErrors.value[firstField] ?? '') : ''
  }
}

function revalidateEditedField(field: keyof SignUpFormErrors): void {
  if (fieldErrors.value[field]) validateField(field)
  if (field === 'password' && fieldErrors.value.passwordConfirm) {
    validateField('passwordConfirm')
  }
}

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
    fieldErrors.value = validateSignUpFields(form)
    errorMessage.value = validation.message
    errorField.value = validation.field
    triggerToast(validation.message)
    await focusError(validation.field)
    return
  }

  submitting.value = true
  errorMessage.value = ''
  errorField.value = ''
  fieldErrors.value = {}

  try {
    await authRepositories.auth.signUp(validation.value)
    await router.push('/login')
  } catch (error) {
    const errorMsg = getSignUpErrorMessage(error)
    errorMessage.value = errorMsg
    triggerToast(errorMsg)
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
            :aria-invalid="Boolean(fieldErrors.email)"
            :aria-describedby="fieldErrors.email ? 'signup-email-error' : undefined"
            @blur="validateField('email')"
            @update:model-value="revalidateEditedField('email')"
          />
          <p v-if="fieldErrors.email" id="signup-email-error" class="field-error" role="alert">
            {{ fieldErrors.email }}
          </p>
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
            :aria-invalid="Boolean(fieldErrors.password)"
            :aria-describedby="
              fieldErrors.password
                ? 'signup-password-help signup-password-error'
                : 'signup-password-help'
            "
            @blur="validateField('password')"
            @update:model-value="revalidateEditedField('password')"
          />
          <p id="signup-password-help" class="field-help">8~100자의 비밀번호를 입력해 주세요.</p>
          <p
            v-if="fieldErrors.password"
            id="signup-password-error"
            class="field-error"
            role="alert"
          >
            {{ fieldErrors.password }}
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
            :aria-invalid="Boolean(fieldErrors.passwordConfirm)"
            :aria-describedby="
              fieldErrors.passwordConfirm ? 'signup-password-confirm-error' : undefined
            "
            @blur="validateField('passwordConfirm')"
            @update:model-value="revalidateEditedField('passwordConfirm')"
          />
          <p
            v-if="fieldErrors.passwordConfirm"
            id="signup-password-confirm-error"
            class="field-error"
            role="alert"
          >
            {{ fieldErrors.passwordConfirm }}
          </p>
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
            :aria-invalid="Boolean(fieldErrors.name)"
            :aria-describedby="fieldErrors.name ? 'signup-name-error' : undefined"
            @blur="validateField('name')"
            @update:model-value="revalidateEditedField('name')"
          />
          <p v-if="fieldErrors.name" id="signup-name-error" class="field-error" role="alert">
            {{ fieldErrors.name }}
          </p>
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
            :aria-invalid="Boolean(fieldErrors.organization)"
            :aria-describedby="fieldErrors.organization ? 'signup-organization-error' : undefined"
            @blur="validateField('organization')"
            @update:model-value="revalidateEditedField('organization')"
          />
          <p
            v-if="fieldErrors.organization"
            id="signup-organization-error"
            class="field-error"
            role="alert"
          >
            {{ fieldErrors.organization }}
          </p>
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

    <SaveToast :visible="toastVisible" :message="toastMessage" />
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
.field-error { margin: 0; color: var(--danger-600); font-size: 11px; }
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
