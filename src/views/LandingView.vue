<script setup lang="ts">
import {
  ArrowRight,
  BookOpenText,
  ChartNoAxesCombined,
  CheckCircle2,
  Download,
  HeartHandshake,
  Sparkles,
} from '@lucide/vue'
import { RouterLink } from 'vue-router'

const childAppDownloadUrl = import.meta.env.VITE_CHILD_APP_DOWNLOAD_URL?.trim()

const features = [
  {
    icon: Sparkles,
    title: '아이에게 맞춘 훈련',
    description: '아이의 읽기 흐름과 학습 결과를 바탕으로 오늘 필요한 연습을 이어갑니다.',
    tone: 'orange',
  },
  {
    icon: BookOpenText,
    title: '이야기로 이어지는 읽기',
    description: '글자와 소리 연습이 흥미로운 이야기 경험으로 자연스럽게 연결됩니다.',
    tone: 'purple',
  },
  {
    icon: ChartNoAxesCombined,
    title: '한눈에 보는 성장 기록',
    description: '교수자는 학습 과정과 변화를 확인하고 다음 지원 방향을 세울 수 있습니다.',
    tone: 'green',
  },
]

const journey = [
  { number: '01', title: '오늘의 읽기 시작', description: '부담 없는 분량으로 학습을 시작해요.' },
  {
    number: '02',
    title: '읽고, 듣고, 말하기',
    description: '시선과 음성을 활용해 다양한 방식으로 연습해요.',
  },
  {
    number: '03',
    title: '성장 과정 함께 보기',
    description: '아이와 교수자가 변화를 함께 확인해요.',
  },
]
</script>

<template>
  <div class="landing-page">
    <a class="skip-link" href="#main-content">본문으로 바로가기</a>

    <header class="landing-header">
      <div class="landing-container landing-header__inner">
        <RouterLink class="landing-brand" to="/" aria-label="아이리드 홈">
          <span class="landing-brand__mark" aria-hidden="true">
            <span>아</span><span>이</span><span>리</span><span>드</span>
          </span>
        </RouterLink>

        <nav class="landing-nav" aria-label="주요 메뉴">
          <a href="#service">서비스 소개</a>
          <a href="#journey">학습 과정</a>
          <a href="#educator">교수자 기능</a>
        </nav>

        <RouterLink class="landing-header__cta" to="/login">
          <span>교수자 웹</span>
          <span class="landing-header__cta-icon">
            <ArrowRight :size="16" aria-hidden="true" />
          </span>
        </RouterLink>
      </div>
    </header>

    <main id="main-content">
      <section class="hero-section" aria-labelledby="hero-title">
        <div class="landing-container hero-grid">
          <div class="hero-copy">
            <p class="eyebrow"><span aria-hidden="true"></span> 아이와 함께 자라는 읽기 여정</p>
            <h1 id="hero-title">
              아이마다 다른<br />
              <span>읽기의 속도</span>를<br />
              함께 찾아갑니다
            </h1>
            <p class="hero-description">
              아이리드는 초등 저학년 아이가 자신에게 맞는 방식으로 읽기를 연습하고, 교수자가 그 성장
              과정을 함께 살펴볼 수 있는 개인화 읽기 학습 서비스입니다.
            </p>
            <div class="hero-actions">
              <RouterLink class="landing-button landing-button--primary" to="/login">
                교수자 웹 시작하기
                <ArrowRight :size="20" aria-hidden="true" />
              </RouterLink>
              <a
                v-if="childAppDownloadUrl"
                class="landing-button landing-button--secondary"
                :href="childAppDownloadUrl"
                download
              >
                <Download :size="20" aria-hidden="true" />
                아동용 앱 다운로드
              </a>
              <button
                v-else
                class="landing-button landing-button--secondary landing-button--pending"
                type="button"
                disabled
              >
                <Download :size="20" aria-hidden="true" />
                아동용 앱 다운로드
              </button>
            </div>
            <p class="hero-note">
              <CheckCircle2 :size="18" aria-hidden="true" />
              교수자 웹에서 아동별 학습 현황을 바로 확인할 수 있어요.
            </p>
          </div>

          <div class="hero-visual" aria-label="아동용 아이리드 실제 서비스 화면">
            <span class="hero-visual__label">아동용 앱 · 실제 화면</span>
            <img
              src="/images/learner-home-screenshot.png"
              alt="나의 성장, 이야기 나라, 글자 연습, 실력 도전으로 구성된 아동용 아이리드 메인 화면"
            />
          </div>
        </div>
      </section>

      <section id="service" class="service-section" aria-labelledby="service-title">
        <div class="landing-container">
          <div class="section-heading section-heading--center">
            <p class="section-kicker">아이리드가 함께하는 방법</p>
            <h2 id="service-title">읽기의 시작부터 성장까지</h2>
            <p>아이에게는 즐거운 연습을, 교수자에게는 다음 지원을 위한 근거를 제공합니다.</p>
          </div>

          <div class="feature-grid">
            <article v-for="feature in features" :key="feature.title" class="feature-card">
              <span class="feature-card__icon" :class="`feature-card__icon--${feature.tone}`">
                <component :is="feature.icon" :size="30" :stroke-width="1.9" aria-hidden="true" />
              </span>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="journey" class="journey-section" aria-labelledby="journey-title">
        <div class="landing-container journey-grid">
          <div class="journey-copy">
            <p class="section-kicker">매일 이어지는 작은 변화</p>
            <h2 id="journey-title">한 번에 많이보다,<br />꾸준히 나답게</h2>
            <p>
              아이가 지치지 않도록 오늘의 학습에 집중하고, 각자의 속도에 맞춰 읽기 경험을
              이어갑니다.
            </p>
            <div class="journey-quote">
              <HeartHandshake :size="24" aria-hidden="true" />
              <span
                >전문가의 판단을 대신하지 않고,<br /><strong>더 나은 지원을 돕습니다.</strong></span
              >
            </div>
          </div>

          <ol class="journey-list">
            <li v-for="item in journey" :key="item.number">
              <span class="journey-list__number">{{ item.number }}</span>
              <span class="journey-list__content">
                <strong>{{ item.title }}</strong>
                <span>{{ item.description }}</span>
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section id="educator" class="educator-section" aria-labelledby="educator-title">
        <div class="landing-container educator-grid">
          <div class="educator-preview" aria-label="교수자용 학습 관리 화면 예시">
            <div class="preview-window">
              <div class="preview-window__topbar">
                <span class="preview-logo">iRead</span>
                <span class="preview-user">교수자</span>
              </div>
              <div class="preview-window__body">
                <div class="preview-sidebar">
                  <span class="is-active">아동 목록</span>
                  <span>학습 기록</span>
                  <span>보고서</span>
                </div>
                <div class="preview-content">
                  <div class="preview-heading">
                    <span><strong>김아이</strong><small>학습 현황</small></span>
                    <span class="preview-period">최근 4주</span>
                  </div>
                  <div class="preview-metrics">
                    <span><small>오늘의 훈련</small><strong>완료</strong></span>
                    <span><small>이어온 학습</small><strong>12일</strong></span>
                    <span><small>읽은 이야기</small><strong>6권</strong></span>
                  </div>
                  <div class="preview-chart">
                    <div class="preview-chart__label">
                      <span>읽기 활동 변화</span><small>꾸준히 성장하고 있어요</small>
                    </div>
                    <div class="preview-bars" aria-hidden="true">
                      <i style="height: 34%"></i><i style="height: 48%"></i
                      ><i style="height: 43%"></i><i style="height: 68%"></i
                      ><i style="height: 82%"></i><i style="height: 92%"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="educator-copy">
            <p class="section-kicker">교수자 웹</p>
            <h2 id="educator-title">아이의 오늘을 보고,<br />다음 학습을 준비하세요</h2>
            <p>
              아동별 학습 현황과 훈련·검사·이야기 이력을 한곳에서 살펴보고, 필요한 지원을 계획할 수
              있습니다.
            </p>
            <ul>
              <li><CheckCircle2 :size="20" aria-hidden="true" />아동별 학습 현황과 최근 활동</li>
              <li><CheckCircle2 :size="20" aria-hidden="true" />훈련·검사·이야기 이력 확인</li>
              <li><CheckCircle2 :size="20" aria-hidden="true" />성장 보고서와 커리큘럼 관리</li>
            </ul>
            <RouterLink class="text-link" to="/login">
              교수자 웹으로 이동
              <ArrowRight :size="19" aria-hidden="true" />
            </RouterLink>
          </div>
        </div>
      </section>

      <section class="closing-section" aria-labelledby="closing-title">
        <div class="landing-container closing-card">
          <div>
            <p class="section-kicker">아이리드와 함께</p>
            <h2 id="closing-title">아이의 읽기 여정을<br />오늘부터 함께해 보세요.</h2>
          </div>
          <div class="closing-actions">
            <RouterLink class="landing-button landing-button--light" to="/login">
              교수자 웹 시작하기
              <ArrowRight :size="20" aria-hidden="true" />
            </RouterLink>
            <p>아동용 Windows 앱을 함께 제공합니다.</p>
          </div>
        </div>
      </section>
    </main>

    <footer class="landing-footer">
      <div class="landing-container landing-footer__inner">
        <div>
          <strong>iRead</strong>
          <span>아이마다 다른 읽기의 속도를 함께 찾아갑니다.</span>
        </div>
        <p>© 2026 iRead. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing-page {
  --landing-ink: #193b79;
  --landing-text: #263853;
  --landing-soft: #60708b;
  --landing-blue: #287fdf;
  --landing-blue-dark: #1765bd;
  --landing-cream: #fffaf0;
  --landing-yellow: #ffd54a;
  --landing-green: #59b93b;
  min-width: 0;
  overflow: hidden;
  background: #fff;
  color: var(--landing-text);
  font-size: 16px;
}

.landing-container {
  width: min(1180px, calc(100% - 48px));
  margin-inline: auto;
}

.skip-link {
  position: fixed;
  z-index: 100;
  top: 12px;
  left: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--landing-ink);
  color: #fff;
  transform: translateY(-150%);
}

.skip-link:focus {
  transform: translateY(0);
}

.landing-header {
  position: absolute;
  z-index: 20;
  top: 0;
  right: 0;
  left: 0;
  border-bottom: 1px solid rgb(25 59 121 / 8%);
  background: rgb(255 255 255 / 86%);
  backdrop-filter: blur(18px);
}

.landing-header__inner {
  display: flex;
  height: 78px;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
}

.landing-brand {
  display: flex;
  align-items: center;
}

.landing-brand__mark {
  display: flex;
  align-items: center;
  transform: rotate(-2deg);
}

.landing-brand__mark span {
  display: grid;
  width: 25px;
  height: 25px;
  margin-left: -3px;
  border-radius: 7px;
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  place-items: center;
  box-shadow: 0 3px 0 rgb(25 59 121 / 12%);
}

.landing-brand__mark span:nth-child(1) {
  background: #f5a623;
  transform: rotate(-8deg);
}
.landing-brand__mark span:nth-child(2) {
  background: #7bc601;
  transform: rotate(4deg);
}
.landing-brand__mark span:nth-child(3) {
  background: #22a6e8;
  transform: rotate(-3deg);
}
.landing-brand__mark span:nth-child(4) {
  background: #8f59bb;
  transform: rotate(7deg);
}

.landing-nav {
  display: flex;
  align-items: center;
  gap: 34px;
  margin-left: auto;
  color: #52617d;
  font-size: 14px;
  font-weight: 650;
}

.landing-nav a {
  padding-block: 12px;
}

.landing-nav a:hover {
  color: var(--landing-blue-dark);
}

.landing-header__cta,
.landing-button,
.text-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 750;
}

.landing-header__cta {
  min-height: 46px;
  padding: 5px 6px 5px 18px;
  border: 1px solid #d5e6f7;
  border-radius: 999px;
  background: rgb(255 255 255 / 78%);
  color: var(--landing-blue-dark);
  box-shadow: 0 7px 22px rgb(25 59 121 / 8%);
  transition:
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.landing-header__cta-icon {
  display: grid;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--landing-blue);
  color: #fff;
  place-items: center;
  transition: transform 160ms ease;
}

.landing-header__cta:hover {
  border-color: #b8d7f4;
  background: #f6fbff;
  box-shadow: 0 10px 26px rgb(25 59 121 / 12%);
}

.landing-header__cta:hover .landing-header__cta-icon {
  transform: translateX(2px);
}

.hero-section {
  position: relative;
  padding: 156px 0 98px;
  background:
    radial-gradient(circle at 8% 18%, rgb(255 213 74 / 16%), transparent 20%),
    linear-gradient(135deg, #fffdf7 0%, #fff 43%, #eefaff 100%);
}

.hero-section::before {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(
      90deg,
      #fffdf8 0%,
      rgb(255 255 255 / 92%) 38%,
      rgb(255 255 255 / 18%) 72%,
      rgb(255 255 255 / 4%) 100%
    ),
    url('/images/landing-reading-journey.png');
  background-position:
    center,
    right -80px bottom -145px;
  background-repeat: no-repeat;
  background-size:
    cover,
    min(920px, 72vw) auto;
  content: '';
  opacity: 0.76;
  pointer-events: none;
}

.hero-section::after {
  position: absolute;
  right: -150px;
  bottom: -180px;
  width: 430px;
  height: 430px;
  border-radius: 50%;
  background: rgb(176 224 248 / 10%);
  content: '';
}

.hero-grid {
  position: relative;
  z-index: 1;
  display: grid;
  align-items: center;
  grid-template-columns: minmax(0, 0.88fr) minmax(500px, 1.12fr);
  gap: 54px;
}

.eyebrow,
.section-kicker {
  color: var(--landing-blue-dark);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 22px;
}

.eyebrow span {
  width: 29px;
  height: 3px;
  border-radius: 999px;
  background: var(--landing-yellow);
}

.hero-copy h1 {
  margin-bottom: 27px;
  color: var(--landing-ink);
  font-size: clamp(45px, 4.3vw, 64px);
  font-weight: 850;
  letter-spacing: -0.055em;
  line-height: 1.14;
}

.hero-copy h1 span {
  position: relative;
  color: var(--landing-blue);
  white-space: nowrap;
}

.hero-copy h1 span::after {
  position: absolute;
  z-index: -1;
  right: -5px;
  bottom: 2px;
  left: -5px;
  height: 13px;
  border-radius: 999px;
  background: rgb(255 213 74 / 55%);
  content: '';
  transform: rotate(-1deg);
}

.hero-description {
  max-width: 540px;
  margin-bottom: 31px;
  color: var(--landing-soft);
  font-size: 17px;
  line-height: 1.75;
  word-break: keep-all;
}

.hero-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.landing-button {
  min-height: 54px;
  padding: 0 22px;
  border: 1px solid transparent;
  border-radius: 15px;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

.landing-button:not(:disabled):hover,
.landing-header__cta:hover {
  transform: translateY(-2px);
}

.landing-button--primary {
  background: var(--landing-blue);
  color: #fff;
  box-shadow: 0 12px 25px rgb(40 127 223 / 24%);
}

.landing-button--primary:hover {
  background: var(--landing-blue-dark);
}

.landing-button--secondary {
  border-color: #dbe6f1;
  background: #fff;
  color: var(--landing-text);
  box-shadow: 0 8px 22px rgb(25 59 121 / 8%);
}

.landing-button--pending {
  color: #76849a;
  cursor: not-allowed;
  opacity: 1;
}

.hero-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 20px 0 0;
  color: #687892;
  font-size: 13px;
}

.hero-note svg {
  color: var(--landing-green);
}

.hero-visual {
  position: relative;
  min-width: 0;
  padding: 13px;
  border: 1px solid rgb(195 218 237 / 92%);
  border-radius: 32px;
  background: rgb(255 255 255 / 86%);
  box-shadow:
    0 32px 75px rgb(33 77 115 / 20%),
    0 2px 0 rgb(255 255 255 / 85%) inset;
  transform: rotate(0.5deg);
  backdrop-filter: blur(10px);
}

.hero-visual img {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 21px;
  object-fit: cover;
}

.hero-visual__label {
  position: absolute;
  z-index: 2;
  top: -18px;
  left: 28px;
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  padding: 0 14px;
  border: 1px solid #d4e5f5;
  border-radius: 999px;
  background: #fff;
  color: var(--landing-blue-dark);
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 8px 22px rgb(25 59 121 / 12%);
}

.service-section,
.journey-section,
.educator-section {
  padding: 112px 0;
}

.section-heading--center {
  max-width: 700px;
  margin: 0 auto 52px;
  text-align: center;
}

.section-kicker {
  margin-bottom: 13px;
}

.section-heading h2,
.journey-copy h2,
.educator-copy h2,
.closing-card h2 {
  margin-bottom: 17px;
  color: var(--landing-ink);
  font-size: clamp(34px, 3.3vw, 48px);
  font-weight: 830;
  letter-spacing: -0.045em;
  line-height: 1.25;
}

.section-heading > p:last-child,
.journey-copy > p,
.educator-copy > p {
  color: var(--landing-soft);
  font-size: 17px;
  line-height: 1.75;
  word-break: keep-all;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

.feature-card {
  min-width: 0;
  padding: 34px 31px 32px;
  border: 1px solid #e7eef5;
  border-radius: 26px;
  background: #fff;
  box-shadow: 0 12px 35px rgb(25 59 121 / 6%);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.feature-card:hover {
  box-shadow: 0 18px 40px rgb(25 59 121 / 10%);
  transform: translateY(-5px);
}

.feature-card__icon {
  display: grid;
  width: 60px;
  height: 60px;
  margin-bottom: 25px;
  border-radius: 19px;
  place-items: center;
}

.feature-card__icon--orange {
  background: #fff3df;
  color: #e98a18;
}
.feature-card__icon--purple {
  background: #f3edfb;
  color: #8051b3;
}
.feature-card__icon--green {
  background: #eaf8e6;
  color: #4ba132;
}

.feature-card h3 {
  margin-bottom: 12px;
  color: var(--landing-text);
  font-size: 21px;
}

.feature-card p {
  margin-bottom: 0;
  color: var(--landing-soft);
  line-height: 1.7;
  word-break: keep-all;
}

.journey-section {
  background: var(--landing-cream);
}

.journey-grid {
  display: grid;
  align-items: center;
  grid-template-columns: 0.82fr 1.18fr;
  gap: 92px;
}

.journey-copy > p {
  max-width: 480px;
}

.journey-quote {
  display: flex;
  align-items: center;
  gap: 14px;
  width: fit-content;
  margin-top: 28px;
  padding: 16px 19px;
  border: 1px solid #f1e5cc;
  border-radius: 17px;
  background: #fff;
  color: #6d7890;
  font-size: 14px;
  line-height: 1.55;
}

.journey-quote svg {
  color: #ef8a7f;
}
.journey-quote strong {
  color: var(--landing-text);
}

.journey-list {
  position: relative;
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.journey-list::before {
  position: absolute;
  top: 56px;
  bottom: 56px;
  left: 36px;
  width: 2px;
  background: #dbe7c9;
  content: '';
}

.journey-list li {
  position: relative;
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 22px 25px 22px 18px;
  border: 1px solid #efe6d6;
  border-radius: 22px;
  background: rgb(255 255 255 / 88%);
}

.journey-list__number {
  position: relative;
  z-index: 1;
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: 13px;
  background: var(--landing-blue);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  place-items: center;
}

.journey-list__content,
.journey-list__content strong,
.journey-list__content span {
  display: block;
}

.journey-list__content strong {
  margin-bottom: 5px;
  color: var(--landing-text);
  font-size: 18px;
}

.journey-list__content span {
  color: var(--landing-soft);
  font-size: 14px;
}

.educator-grid {
  display: grid;
  align-items: center;
  grid-template-columns: 1.12fr 0.88fr;
  gap: 82px;
}

.educator-preview {
  padding: 18px;
  border-radius: 32px;
  background: #eaf6ff;
}

.preview-window {
  overflow: hidden;
  border: 1px solid #d7e2ec;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 22px 55px rgb(25 59 121 / 15%);
}

.preview-window__topbar {
  display: flex;
  height: 52px;
  align-items: center;
  justify-content: space-between;
  padding-inline: 20px;
  border-bottom: 1px solid #e7edf3;
}

.preview-logo {
  color: var(--landing-blue);
  font-weight: 850;
}
.preview-user {
  color: #718099;
  font-size: 11px;
}

.preview-window__body {
  display: grid;
  min-height: 320px;
  grid-template-columns: 118px 1fr;
}

.preview-sidebar {
  display: flex;
  padding: 24px 13px;
  border-right: 1px solid #e9eef3;
  background: #fbfcfd;
  flex-direction: column;
  gap: 8px;
}

.preview-sidebar span {
  padding: 8px 10px;
  border-radius: 8px;
  color: #8793a5;
  font-size: 10px;
}

.preview-sidebar .is-active {
  background: #eaf4ff;
  color: var(--landing-blue-dark);
  font-weight: 750;
}

.preview-content {
  min-width: 0;
  padding: 26px;
  background: #f7f9fb;
}

.preview-heading,
.preview-heading > span:first-child {
  display: flex;
  align-items: center;
}

.preview-heading {
  justify-content: space-between;
  gap: 12px;
}

.preview-heading > span:first-child {
  gap: 8px;
}
.preview-heading strong {
  color: #263853;
  font-size: 15px;
}
.preview-heading small {
  color: #8995a7;
  font-size: 10px;
}

.preview-period {
  padding: 6px 9px;
  border: 1px solid #dde5ed;
  border-radius: 7px;
  background: #fff;
  color: #718099;
  font-size: 9px;
}

.preview-metrics {
  display: grid;
  margin-top: 22px;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
}

.preview-metrics > span {
  padding: 13px;
  border: 1px solid #e5ebf1;
  border-radius: 11px;
  background: #fff;
}

.preview-metrics small,
.preview-metrics strong {
  display: block;
}
.preview-metrics small {
  margin-bottom: 7px;
  color: #8b97a8;
  font-size: 8px;
}
.preview-metrics strong {
  color: #263853;
  font-size: 15px;
}

.preview-chart {
  margin-top: 12px;
  padding: 16px 17px;
  border: 1px solid #e5ebf1;
  border-radius: 12px;
  background: #fff;
}

.preview-chart__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #42516a;
  font-size: 10px;
  font-weight: 700;
}

.preview-chart__label small {
  color: #54a13b;
  font-size: 8px;
  font-weight: 650;
}

.preview-bars {
  display: flex;
  height: 85px;
  align-items: end;
  gap: 8px;
  margin-top: 18px;
  padding: 0 5px;
  border-bottom: 1px solid #e8edf3;
}

.preview-bars i {
  width: 100%;
  border-radius: 5px 5px 0 0;
  background: linear-gradient(180deg, #75b8f0, #358ad6);
}

.educator-copy ul {
  display: grid;
  gap: 14px;
  margin: 28px 0;
  padding: 0;
  list-style: none;
}

.educator-copy li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #43536d;
  font-weight: 650;
}

.educator-copy li svg {
  color: var(--landing-green);
}

.text-link {
  color: var(--landing-blue-dark);
}

.text-link:hover {
  gap: 12px;
}

.closing-section {
  padding: 20px 0 100px;
}

.closing-card {
  position: relative;
  display: flex;
  min-height: 260px;
  align-items: center;
  justify-content: space-between;
  gap: 42px;
  overflow: hidden;
  padding: 55px 66px;
  border-radius: 34px;
  background: var(--landing-ink);
  box-shadow: 0 24px 55px rgb(25 59 121 / 20%);
}

.closing-card::before,
.closing-card::after {
  position: absolute;
  border-radius: 50%;
  content: '';
}

.closing-card::before {
  top: -100px;
  right: 22%;
  width: 250px;
  height: 250px;
  background: rgb(79 114 225 / 24%);
}

.closing-card::after {
  right: -60px;
  bottom: -130px;
  width: 280px;
  height: 280px;
  background: rgb(89 185 59 / 16%);
}

.closing-card > * {
  position: relative;
  z-index: 1;
}
.closing-card .section-kicker {
  color: #a9d8ff;
}
.closing-card h2 {
  margin-bottom: 0;
  color: #fff;
}

.closing-actions {
  display: grid;
  justify-items: center;
  gap: 13px;
}

.landing-button--light {
  background: #fff;
  color: var(--landing-ink);
  box-shadow: 0 12px 25px rgb(0 0 0 / 14%);
}

.closing-actions p {
  margin: 0;
  color: #b8c9de;
  font-size: 12px;
}

.landing-footer {
  border-top: 1px solid #e7edf2;
  background: #f8fafc;
}

.landing-footer__inner {
  display: flex;
  min-height: 116px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  color: #8290a3;
  font-size: 12px;
}

.landing-footer__inner > div {
  display: flex;
  align-items: baseline;
  gap: 14px;
}

.landing-footer strong {
  color: var(--landing-ink);
  font-size: 19px;
}
.landing-footer p {
  margin: 0;
}

@media (max-width: 1040px) {
  .landing-nav {
    display: none;
  }
  .hero-grid {
    grid-template-columns: 1fr;
  }
  .hero-copy {
    max-width: 680px;
  }
  .hero-visual {
    width: min(720px, 94%);
    margin: 10px auto 0;
  }
  .journey-grid,
  .educator-grid {
    gap: 54px;
  }
  .educator-grid {
    grid-template-columns: 1fr;
  }
  .educator-preview {
    order: 2;
  }
  .educator-copy {
    max-width: 650px;
  }
}

@media (max-width: 760px) {
  .landing-container {
    width: min(100% - 32px, 1180px);
  }
  .landing-header__inner {
    height: 68px;
  }
  .landing-header__cta {
    min-height: 40px;
    padding-left: 15px;
  }
  .hero-section {
    padding: 122px 0 75px;
  }
  .hero-copy h1 {
    font-size: clamp(40px, 12vw, 54px);
  }
  .hero-description {
    font-size: 16px;
  }
  .hero-actions {
    align-items: stretch;
    flex-direction: column;
  }
  .landing-button {
    width: 100%;
  }
  .hero-note {
    align-items: flex-start;
  }
  .hero-visual {
    width: 100%;
    padding: 7px;
    border-radius: 23px;
  }
  .hero-visual img {
    border-radius: 16px;
  }
  .hero-visual__label {
    top: -14px;
    left: 18px;
    min-height: 30px;
  }
  .service-section,
  .journey-section,
  .educator-section {
    padding: 82px 0;
  }
  .feature-grid,
  .journey-grid {
    grid-template-columns: 1fr;
  }
  .feature-grid {
    gap: 16px;
  }
  .journey-grid {
    gap: 38px;
  }
  .feature-card {
    padding: 28px 25px;
  }
  .preview-window__body {
    grid-template-columns: 78px 1fr;
  }
  .preview-sidebar {
    padding-inline: 8px;
  }
  .preview-content {
    padding: 18px 14px;
  }
  .preview-metrics {
    grid-template-columns: 1fr 1fr;
  }
  .preview-metrics > span:last-child {
    display: none;
  }
  .closing-section {
    padding-bottom: 70px;
  }
  .closing-card {
    align-items: flex-start;
    padding: 42px 28px;
    flex-direction: column;
  }
  .closing-actions {
    width: 100%;
    justify-items: stretch;
  }
  .landing-footer__inner,
  .landing-footer__inner > div {
    align-items: flex-start;
    flex-direction: column;
  }
  .landing-footer__inner {
    justify-content: center;
    padding-block: 28px;
  }
}

@media (max-width: 420px) {
  .landing-brand__mark span {
    width: 23px;
    height: 23px;
    font-size: 12px;
  }
  .landing-header__cta svg {
    display: block;
  }
  .landing-header__cta {
    padding-left: 13px;
  }
  .landing-header__cta-icon {
    width: 31px;
    height: 31px;
  }
  .hero-copy h1 {
    font-size: 39px;
  }
  .hero-visual {
    margin-top: 0;
  }
  .section-heading h2,
  .journey-copy h2,
  .educator-copy h2,
  .closing-card h2 {
    font-size: 32px;
  }
  .educator-preview {
    margin-inline: -8px;
    padding: 8px;
    border-radius: 20px;
  }
  .preview-window__body {
    grid-template-columns: 1fr;
  }
  .preview-sidebar {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature-card,
  .landing-button,
  .landing-header__cta {
    transition: none;
  }
}
</style>
