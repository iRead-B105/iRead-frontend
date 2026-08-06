<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getLoginErrorMessage } from '@/features/teacher/auth'
import { resolveTeacherRedirect } from '@/router'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const route = useRoute()
const sessionStore = useSessionStore()
const form = reactive({ email: '', password: '' })
const showPassword = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const errorSummary = ref<HTMLElement | null>(null)
const successMessage = ref(
  route.query.passwordReset === 'success'
    ? '비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.'
    : '',
)
onMounted(async () => {
  if (route.query.passwordReset !== 'success') return

  const query = { ...route.query }
  delete query.passwordReset
  await router.replace({ query })
})

async function login() {
  if (submitting.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    await sessionStore.login({
      email: form.email.trim(),
      password: form.password,
    })
    await router.push(resolveTeacherRedirect(router, route.query.redirect))
  } catch (error) {
    errorMessage.value = getLoginErrorMessage(error)
    await nextTick()
    errorSummary.value?.focus()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-shell" aria-labelledby="login-title">
      <RouterLink class="login-logo" to="/login" aria-label="로그인으로 이동">
        <img :src="'/images/iread-logo.png'" alt="iRead" />
      </RouterLink>

      <form class="login-form" @submit.prevent="login">
        <header class="login-heading">
          <h1 id="login-title">로그인</h1>
          <p>교수자 계정으로 로그인해 주세요.</p>
        </header>

        <div class="login-fields">
          <div class="field">
            <label for="login-email">이메일</label>
            <Input
              id="login-email"
              v-model="form.email"
              class="input"
              type="email"
              required
              maxlength="50"
              placeholder="이메일 주소 입력"
              :aria-invalid="Boolean(errorMessage)"
              :aria-describedby="errorMessage ? 'login-error' : undefined"
            />
          </div>
          <div class="field">
            <label for="login-password">비밀번호</label>
            <div class="password-input">
              <Input
                id="login-password"
                v-model="form.password"
                class="input"
                required
                minlength="8"
                maxlength="100"
                :type="showPassword ? 'text' : 'password'"
                placeholder="비밀번호 입력"
                :aria-invalid="Boolean(errorMessage)"
                :aria-describedby="errorMessage ? 'login-error' : undefined"
              />
              <Button
                variant="ghost"
                size="sm"
                type="button"
                :aria-label="showPassword ? '비밀번호 숨기기' : '비밀번호 보기'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '숨기기' : '보기' }}
              </Button>
            </div>
          </div>
        </div>

        <p v-if="successMessage" class="form-success" role="status">{{ successMessage }}</p>
        <p
          v-if="errorMessage"
          id="login-error"
          ref="errorSummary"
          class="form-error"
          role="alert"
          tabindex="-1"
        >
          {{ errorMessage }}
        </p>
        <Button class="login-submit" type="submit" :disabled="submitting">
          {{ submitting ? '로그인 중...' : '로그인' }}
        </Button>
        <p class="login-signup-link">
          <span>아직 계정이 없으신가요? <RouterLink to="/signup">회원가입</RouterLink></span>
        </p>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 32px 20px;
  background: radial-gradient(circle at 50% 20%, #f8fafc 0%, #f1f5f9 100%);
  place-items: center;
  place-content: center;
}

.login-shell {
  display: grid;
  width: 420px;
  max-width: 100%;
  padding: 36px 36px 40px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: var(--radius-xl, 16px);
  background: var(--card, #ffffff);
  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03);
  justify-items: stretch;
}

.login-logo {
  display: grid;
  width: 140px;
  height: 64px;
  margin: 0 auto 30px;
  overflow: hidden;
  place-items: center;
}

.login-logo img {
  width: 112px;
  height: 64px;
  max-width: none;
  object-fit: contain;
  transform: scale(1.85);
}

.login-heading {
  margin-bottom: 28px;
  text-align: center;
}

.login-heading h1 {
  margin: 0 0 8px;
  color: var(--slate-900, #0f172a);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.login-heading p {
  margin: 0;
  color: var(--slate-500, #64748b);
  font-size: 14px;
  overflow-wrap: anywhere;
}

.login-fields {
  display: grid;
  gap: 20px;
}

.login-fields label {
  display: block;
  margin-bottom: 6px;
  color: var(--slate-700, #334155);
  font-size: 13px;
  font-weight: 600;
}

.login-fields .input {
  height: 48px;
  border-radius: var(--radius-md, 10px);
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
  right: 12px;
  min-width: 40px;
  min-height: 32px;
  padding: 0 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 600;
  transform: translateY(-50%);
  transition: all 0.15s ease;
}

.password-input button:hover,
.password-input button:focus-visible {
  background: var(--slate-100, #f1f5f9);
  color: var(--slate-900);
}

.login-help-links {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.login-help-links a {
  padding: 0;
  color: var(--slate-500, #64748b);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s ease;
}

.login-help-links a:hover,
.login-help-links a:focus-visible {
  color: var(--primary-600, #2563eb);
  text-decoration: underline;
}

.login-submit {
  width: 100%;
  min-height: 50px;
  margin-top: 26px;
  border-radius: var(--radius-md, 10px);
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  transition: all 0.15s ease;
}

.login-submit:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
  transform: translateY(-1px);
}

.form-error {
  margin: 16px 0 0;
  padding: 10px 14px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  color: var(--destructive, #dc2626);
  font-size: 13px;
  font-weight: 500;
}

.form-success {
  margin: 16px 0 0;
  padding: 10px 14px;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: #f0fdf4;
  color: var(--primary-700, #15803d);
  font-size: 13px;
  font-weight: 500;
}

.login-signup-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 24px 0 0;
  color: var(--slate-500, #64748b);
  font-size: 13px;
  text-align: center;
  flex-wrap: wrap;
}

.login-signup-link a {
  color: var(--primary-600, #2563eb);
  font-weight: 700;
  text-decoration: none;
}

.login-signup-link a:hover {
  text-decoration: underline;
}

@media (max-width: 520px) {
  .login-page {
    padding: 20px 16px;
  }

  .login-shell {
    padding: 32px 24px;
  }

  .login-heading h1 {
    font-size: 24px;
  }
}
</style>
