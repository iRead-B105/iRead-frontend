<script setup lang="ts">
import { defineAsyncComponent, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isMockAuthSource } from '@/config/authSource'
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
const MockAuthEntry = !import.meta.env.PROD
  ? defineAsyncComponent(() => import('@/features/teacher/auth/components/MockAuthEntry.vue'))
  : null

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

        <MockAuthEntry v-if="isMockAuthSource" />

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
              :disabled="isMockAuthSource"
              placeholder="example@iread.co.kr"
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
                :disabled="isMockAuthSource"
                placeholder="비밀번호 입력"
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

        <div class="login-help-links">
          <RouterLink to="/find-id">로그인 이메일 확인</RouterLink>
          <span aria-hidden="true"></span>
          <RouterLink to="/reset-password">비밀번호 찾기</RouterLink>
        </div>

        <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
        <Button class="login-submit" type="submit" :disabled="submitting || isMockAuthSource">
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
  padding: 64px 48px 52px;
  background: var(--background);
  place-items: start center;
}

.login-shell {
  display: grid;
  width: min(420px, 100%);
  padding: 38px 40px 40px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
  box-shadow: var(--shadow-card);
  justify-items: stretch;
}

.login-logo {
  display: grid;
  width: 132px;
  height: 68px;
  margin: 0 auto 34px;
  overflow: hidden;
  place-items: center;
}

.login-logo img {
  width: 108px;
  height: 62px;
  max-width: none;
  object-fit: contain;
  transform: scale(1.85);
}

.login-heading {
  margin-bottom: 32px;
}

.login-heading h1 {
  margin: 0 0 7px;
  font-size: 30px;
}

.login-heading p {
  margin: 0;
  color: var(--slate-500);
}

.login-fields {
  display: grid;
  gap: 18px;
}

.login-fields .input {
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
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 700;
  transform: translateY(-50%);
}

.password-input button:hover,
.password-input button:focus-visible {
  color: var(--slate-900);
  text-decoration: underline;
}

.login-help-links {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

.login-help-links a {
  padding: 0;
  color: var(--slate-500);
  font-size: 12px;
  text-decoration: none;
}

.login-help-links a:hover,
.login-help-links a:focus-visible {
  color: var(--slate-800);
  text-decoration: underline;
}

.login-help-links span {
  width: 1px;
  background: var(--slate-200);
}

.login-submit {
  width: 100%;
  min-height: 50px;
  margin-top: 24px;
}

.form-error {
  margin: 14px 0 0;
  color: var(--destructive);
  font-size: 13px;
}

.login-signup-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 22px 0 0;
  color: var(--slate-500);
  text-align: center;
  flex-wrap: wrap;
}

.login-signup-link a {
  color: var(--primary-600);
  font-weight: 800;
}

@media (max-height: 700px) {
  .login-page {
    padding-top: 34px;
  }

  .login-logo {
    margin-bottom: 24px;
  }
}

@media (max-width: 520px) {
  .login-page {
    padding: 28px 18px;
  }

  .login-shell {
    padding: 30px 22px;
  }
}
</style>
