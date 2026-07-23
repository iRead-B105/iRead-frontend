<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const step = ref<1 | 2 | 3>(1)
const identity = reactive({ loginId: '', email: '' })
const password = reactive({ newPassword: '', confirmation: '' })
const errorMessage = ref('')
const showPassword = ref(false)

function verifyIdentity() {
  errorMessage.value = ''
  step.value = 2
}

function resetPassword() {
  if (password.newPassword.length < 8) {
    errorMessage.value = '비밀번호는 8자 이상 입력해 주세요.'
    return
  }

  if (password.newPassword !== password.confirmation) {
    errorMessage.value = '새 비밀번호가 서로 일치하지 않습니다.'
    return
  }

  errorMessage.value = ''
  step.value = 3
}
</script>

<template>
  <main class="recovery-page">
    <section class="recovery-shell" aria-labelledby="reset-password-title">
      <RouterLink class="recovery-logo" to="/login" aria-label="로그인으로 이동">
        <img src="/images/iread-logo.png" alt="iRead" />
      </RouterLink>

      <div class="recovery-card">
        <ol v-if="step < 3" class="stepper" aria-label="비밀번호 재설정 단계">
          <li :class="{ active: step === 1, complete: step > 1 }"><span>1</span>본인 확인</li>
          <li :class="{ active: step === 2 }"><span>2</span>비밀번호 변경</li>
        </ol>

        <template v-if="step === 1">
          <header class="recovery-heading">
            <p class="recovery-eyebrow">계정 확인</p>
            <h1 id="reset-password-title">비밀번호 찾기</h1>
            <p>아이디와 회원가입 시 등록한 이메일을 입력해 주세요.</p>
          </header>

          <form class="recovery-form" @submit.prevent="verifyIdentity">
            <div class="field">
              <label for="reset-id">아이디</label>
              <Input id="reset-id" v-model.trim="identity.loginId" class="input" required placeholder="아이디 입력" />
            </div>
            <div class="field">
              <label for="reset-email">이메일</label>
              <Input
                id="reset-email"
                v-model.trim="identity.email"
                class="input"
                type="email"
                required
                placeholder="example@iread.co.kr"
              />
            </div>
            <Button class="recovery-submit" type="submit">본인 확인</Button>
          </form>
        </template>

        <template v-else-if="step === 2">
          <header class="recovery-heading">
            <p class="recovery-eyebrow">본인 확인 완료</p>
            <h1 id="reset-password-title">새 비밀번호 설정</h1>
            <p>영문, 숫자를 포함해 8자 이상 입력해 주세요.</p>
          </header>

          <form class="recovery-form" @submit.prevent="resetPassword">
            <div class="field">
              <label for="new-password">새 비밀번호</label>
              <div class="password-input">
                <Input
                  id="new-password"
                  v-model="password.newPassword"
                  class="input"
                  required
                  minlength="8"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="새 비밀번호 입력"
                />
                <Button variant="ghost" size="sm" type="button" @click="showPassword = !showPassword">
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
                :type="showPassword ? 'text' : 'password'"
                placeholder="새 비밀번호 다시 입력"
              />
            </div>
            <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
            <Button class="recovery-submit" type="submit">비밀번호 변경</Button>
            <Button variant="link" class="text-button" type="button" @click="step = 1">
              이전 단계
            </Button>
          </form>
        </template>

        <div v-else class="recovery-result" role="status">
          <div class="result-icon" aria-hidden="true">✓</div>
          <p class="recovery-eyebrow">변경 완료</p>
          <h1 id="reset-password-title">비밀번호가 변경되었어요</h1>
          <p>새 비밀번호로 로그인해 주세요.</p>
          <Button as-child class="login-button">
            <RouterLink to="/login">로그인하기</RouterLink>
          </Button>
        </div>
      </div>

      <p class="back-link"><RouterLink to="/login">← 로그인으로 돌아가기</RouterLink></p>
    </section>
  </main>
</template>

<style scoped>
.recovery-page {
  display: grid;
  min-height: 100vh;
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

.recovery-heading h1,
.recovery-result h1 {
  margin: 6px 0 10px;
  font-size: 28px;
}

.recovery-heading > p:last-child,
.recovery-result > p {
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

.recovery-result {
  text-align: center;
}

.result-icon {
  display: grid;
  width: 54px;
  height: 54px;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: var(--primary-50);
  color: var(--primary-600);
  font-size: 26px;
  font-weight: 900;
  place-items: center;
}

.login-button {
  display: grid;
  min-height: 50px;
  margin-top: 28px;
  text-decoration: none;
  place-items: center;
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
  .recovery-card {
    padding: 30px 22px;
  }
}
</style>
