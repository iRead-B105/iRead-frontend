<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const form = reactive({ name: '', email: '' })
const found = ref(false)

function findId() {
  found.value = true
}

function tryAgain() {
  form.name = ''
  form.email = ''
  found.value = false
}
</script>

<template>
  <main class="recovery-page">
    <section class="recovery-shell" aria-labelledby="find-id-title">
      <RouterLink class="recovery-logo" to="/login" aria-label="로그인으로 이동">
        <img src="/images/iread-logo.png" alt="iRead" />
      </RouterLink>

      <div class="recovery-card">
        <template v-if="!found">
          <header class="recovery-heading">
            <p class="recovery-eyebrow">계정 찾기</p>
            <h1 id="find-id-title">아이디 찾기</h1>
            <p>회원가입 시 등록한 이름과 이메일을 입력해 주세요.</p>
          </header>

          <form class="recovery-form" @submit.prevent="findId">
            <div class="field">
              <label for="find-name">이름</label>
              <Input id="find-name" v-model.trim="form.name" class="input" required placeholder="이름 입력" />
            </div>
            <div class="field">
              <label for="find-email">이메일</label>
              <Input
                id="find-email"
                v-model.trim="form.email"
                class="input"
                type="email"
                required
                placeholder="example@iread.co.kr"
              />
            </div>
            <Button class="recovery-submit" type="submit">아이디 확인</Button>
          </form>
        </template>

        <div v-else class="recovery-result" role="status">
          <div class="result-icon" aria-hidden="true">✓</div>
          <p class="recovery-eyebrow">아이디 찾기 완료</p>
          <h1 id="find-id-title">가입된 아이디를 찾았어요</h1>
          <p><strong>{{ form.name }}</strong> 님의 회원 정보와 일치하는 아이디입니다.</p>
          <div class="found-id" aria-label="마스킹된 아이디">iread_t***</div>
          <div class="recovery-actions">
            <Button as-child>
              <RouterLink to="/login">로그인하기</RouterLink>
            </Button>
            <Button as-child variant="outline">
              <RouterLink to="/reset-password">비밀번호 재설정</RouterLink>
            </Button>
          </div>
          <Button variant="link" class="text-button" type="button" @click="tryAgain">
            다른 정보로 다시 찾기
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

.recovery-submit {
  min-height: 50px;
  margin-top: 8px;
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

.found-id {
  margin: 26px 0;
  padding: 18px;
  border-radius: 12px;
  background: var(--slate-50);
  color: var(--slate-900);
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.recovery-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.recovery-actions .button {
  display: grid;
  min-height: 48px;
  text-decoration: none;
  place-items: center;
}

.button-secondary {
  border: 1px solid var(--slate-300);
  background: var(--white);
  color: var(--slate-700);
}

.text-button {
  margin-top: 20px;
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
  .recovery-card {
    padding: 30px 22px;
  }

  .recovery-actions {
    grid-template-columns: 1fr;
  }
}
</style>
