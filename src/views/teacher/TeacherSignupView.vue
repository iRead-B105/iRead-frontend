<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi, type Gender } from '@/features/teacher/adminApi'

const router = useRouter()
const errorMessage = ref('')
const form = reactive({
  loginId: '',
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',
  organization: '',
  gender: 'FEMALE' as Gender,
})
const submitting = ref(false)

async function signup() {
  if (form.password !== form.passwordConfirm) {
    errorMessage.value = '비밀번호와 비밀번호 확인이 일치하지 않습니다.'
    return
  }
  submitting.value = true
  errorMessage.value = ''
  try {
    await authApi.signup({
      email: form.email,
      password: form.password,
      name: form.name,
      organization: form.organization,
      gender: form.gender,
    })
    await router.push('/login')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '회원가입에 실패했습니다.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="signup-page">
    <header class="signup-header">
      <RouterLink to="/login" aria-label="로그인으로 이동"><img src="/images/iread-logo.png" alt="iRead" /></RouterLink>
    </header>

    <form class="signup-form" @submit.prevent="signup">
      <div class="signup-heading">
        <h1>회원가입</h1>
        <p>아동 관리에 사용할 교수자 계정을 만들어 주세요.</p>
      </div>

      <section class="signup-fields" aria-label="계정 정보">
        <div class="field">
          <label for="signup-id">아이디</label>
          <Input id="signup-id" v-model="form.loginId" class="input" required placeholder="로그인에 사용할 아이디" />
        </div>

        <div class="field">
          <label for="signup-email">이메일</label>
          <Input id="signup-email" v-model="form.email" class="input" required type="email" placeholder="example@email.com" />
        </div>

        <div class="field">
          <label for="signup-password">비밀번호</label>
          <Input id="signup-password" v-model="form.password" class="input" required minlength="8" type="password" placeholder="8자 이상 입력" />
          <p class="field-help">8자 이상의 비밀번호를 입력해 주세요.</p>
        </div>

        <div class="field">
          <label for="signup-password-confirm">비밀번호 확인</label>
          <Input id="signup-password-confirm" v-model="form.passwordConfirm" class="input" required type="password" placeholder="비밀번호 다시 입력" />
        </div>
      </section>

      <div class="signup-divider" aria-hidden="true"></div>

      <section class="signup-fields" aria-label="교수자 정보">
        <div class="field">
          <label for="signup-name">이름</label>
          <Input id="signup-name" v-model="form.name" class="input" required placeholder="교수자 이름" />
        </div>

        <div class="field">
          <label for="signup-organization">소속기관</label>
          <Input id="signup-organization" v-model="form.organization" class="input" required placeholder="소속 기관명" />
        </div>
      </section>

      <p v-if="errorMessage" class="signup-error" role="alert">{{ errorMessage }}</p>
      <Button class="signup-submit" type="submit">회원가입</Button>
      <p class="signup-login-link">
        이미 계정이 있으신가요? <RouterLink to="/login">로그인</RouterLink>
      </p>
    </form>
  </main>
</template>

<style scoped>
.signup-page {
  min-height: 100vh;
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
.signup-fields { display: grid; gap: 19px; }
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
}
</style>
