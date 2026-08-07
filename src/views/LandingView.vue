<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type Component } from 'vue'
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Download,
  Eye,
  Sparkles,
  Users,
} from '@lucide/vue'
import { RouterLink } from 'vue-router'

interface ServiceCard {
  id: string
  category: string
  badge: string
  title: string
  subtitle: string
  description: string
  highlights: string[]
  imageSrc: string
  imageAlt: string
  showcaseTitle: string
  showcaseTag: string
  icon: Component
  tone: string
}

const childAppDownloadUrl = import.meta.env.VITE_CHILD_APP_DOWNLOAD_URL?.trim()
// 아이트래커(Tobii Eye Tracker 5) 드라이버 설치 페이지. 배포 환경에서 env로 바꿀 수 있다.
const eyeTrackerDriverUrl =
  import.meta.env.VITE_EYE_TRACKER_DRIVER_URL?.trim() || 'https://gaming.tobii.com/getstarted/'

const downloadModalOpen = ref(false)

function openDownloadModal(): void {
  downloadModalOpen.value = true
}

function closeDownloadModal(): void {
  downloadModalOpen.value = false
}

const cards: ServiceCard[] = [
  {
    id: 'learner-app',
    category: '아동용 앱',
    badge: '실제 화면',
    title: '아동에게 맞춰진 즐거운 읽기 첫걸음',
    subtitle: '나의 성장 · 이야기 나라 · 글자 연습 · 실력 도전',
    description:
      '아이가 나의 성장, 이야기 나라, 글자 연습, 실력 도전을 직접 고르며 자신의 속도로 읽기 여정을 이어갑니다.',
    highlights: [
      '네 가지 학습 영역을 한눈에 보여주는 섬 지도',
      '큰 글자와 캐릭터로 구성한 아동 친화적 화면',
      '성장과 연습, 이야기를 하나의 학습 여정으로 연결',
    ],
    imageSrc: '/images/landing-learner-home.png',
    imageAlt: '나의 성장, 이야기 나라, 글자 연습, 실력 도전으로 구성된 아동용 아이리드 메인 화면',
    showcaseTitle: '아동용 아이리드 메인 화면',
    showcaseTag: '나만의 읽기 여정',
    icon: Sparkles,
    tone: 'blue',
  },
  {
    id: 'eyetracking-voice',
    category: '맞춤 글자 훈련',
    badge: '상호작용 학습',
    title: '듣고, 보고, 고르며 익히는 글자',
    subtitle: '소리 구별부터 발음 연습까지',
    description:
      '아이가 소리를 듣고 비슷한 글자를 고르며 글자와 소리의 관계를 자연스럽게 익힙니다. 큰 선택 카드와 짧은 안내로 학습에만 집중할 수 있습니다.',
    highlights: [
      '듣기 버튼과 큰 선택 카드로 직관적인 훈련',
      '노랑·민트·보라 카드로 선택지를 명확하게 구분',
      '상단 진행 표시와 다음 버튼으로 학습 순서를 안내',
    ],
    imageSrc: '/images/landing-letter-training.png',
    imageAlt: '비슷한 소리를 듣고 난, 달, 밤 중 정답을 고르는 아동용 글자 훈련 화면',
    showcaseTitle: '아동용 글자·소리 훈련 화면',
    showcaseTag: '듣고 정답 고르기',
    icon: Eye,
    tone: 'purple',
  },
  {
    id: 'story-practice',
    category: '이야기 읽기',
    badge: '맞춤 훈련',
    title: '이야기 속에서 자연스럽게 자라는 문해력',
    subtitle: '이야기를 읽고 스스로 생각하는 시간',
    description:
      '친근한 동화 장면을 함께 읽고 다음 이야기를 예상하며, 내용 이해와 표현력을 함께 키웁니다.',
    highlights: [
      '한 화면에 집중할 수 있는 큰 동화 장면',
      '이야기 흐름을 이어가는 예측·이해 질문',
      '이전·다음 페이지로 자연스럽게 이어지는 독서 흐름',
    ],
    imageSrc: '/images/landing-story-reading.png',
    imageAlt: '토끼와 거북이 이야기를 보며 다음 작전을 묻는 아동용 이야기 읽기 화면',
    showcaseTitle: '아동용 이야기 읽기 화면',
    showcaseTag: '읽고 생각하기',
    icon: BookOpenText,
    tone: 'amber',
  },
  {
    id: 'teacher-web',
    category: '교수자 웹',
    badge: '학습 관리',
    title: '검사 결과를 한눈에, 다음 지도를 더 정교하게',
    subtitle: '검사 이력 · 지표 비교 · 문항별 분석',
    description:
      '교수자는 아동의 검사 점수와 지표별 변화, 문항별 답변과 풀이 과정을 살펴보며 필요한 지도 방향을 구체화할 수 있습니다.',
    highlights: [
      '여러 검사의 점수·풀이 시간·시선 이탈 횟수 비교',
      '음운 인식·짧은 글·유창성을 구분한 영역별 결과',
      '제출 답안, 정답, 점수를 함께 보는 문항별 기록',
    ],
    imageSrc: '/images/landing-teacher-history.png',
    imageAlt: '아동의 검사 점수 비교 차트와 문항별 결과를 보여주는 교수자 검사 이력 화면',
    showcaseTitle: '교수자 검사 이력 화면',
    showcaseTag: '지표별 결과 분석',
    icon: Users,
    tone: 'green',
  },
]

const scrollY = ref(0)
const heroHeight = ref(0)
const activeSectionIndex = ref(-1)

function handleScroll() {
  scrollY.value = window.scrollY
  heroHeight.value = window.innerHeight

  // 현재 활성화된 섹션 계산 (Nav 활성화용)
  const threshold = heroHeight.value * 0.5
  let currentIndex = -1
  for (let i = 0; i < cards.length; i++) {
    const el = document.getElementById(`section-${i}`)
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.top <= threshold && rect.bottom >= threshold) {
        currentIndex = i
        break
      }
    }
  }
  activeSectionIndex.value = currentIndex
}

onMounted(() => {
  heroHeight.value = window.innerHeight
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleScroll)
})

const overlayOpacity = computed(() => {
  if (heroHeight.value === 0) return 0
  
  // 1. Initial fade in (0 to 0.82)
  const heroProgress = Math.min(scrollY.value / (heroHeight.value * 0.8), 1)
  let opacity = heroProgress * 0.82
  
  // 2. Final viewport fade in (0.82 to 1.0)
  const ctaStartScroll = heroHeight.value * cards.length
  
  if (scrollY.value > ctaStartScroll) {
    const endProgress = Math.min((scrollY.value - ctaStartScroll) / (heroHeight.value * 0.8), 1)
    opacity = 0.82 + (0.18 * endProgress)
  }
  
  return opacity
})

function scrollToSection(index: number) {
  if (index === -1) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  const target = document.getElementById(`section-${index}`)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="landing-page-wrapper">
    <!-- 고정 배경 및 화이트 오버레이 -->
    <div class="fixed-background"></div>
    <div class="dynamic-overlay" :style="{ opacity: overlayOpacity }"></div>

    <a class="skip-link" href="#main-content">본문으로 바로가기</a>

    <!-- Header -->
    <header class="landing-header">
      <div class="header-inner">
        <button class="landing-brand-btn" aria-label="아이리드 홈" @click="scrollToSection(-1)">
          <span class="landing-brand__mark" aria-hidden="true">
            <span>아</span><span>이</span><span>리</span><span>드</span>
          </span>
          <span class="landing-brand__text">iRead</span>
        </button>

        <div class="header-actions">
          <RouterLink class="landing-header__cta" to="/login">
            <span>교수자 웹 바로가기</span>
            <span class="landing-header__cta-icon">
              <ArrowRight :size="14" aria-hidden="true" />
            </span>
          </RouterLink>

          <button class="landing-header__dl" type="button" @click="openDownloadModal">
            <svg
              class="windows-icon"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M0 3.45 9.75 2.1v9.15H0V3.45ZM10.95 1.95 24 0v11.25H10.95V1.95ZM0 12.75h9.75v9.15L0 20.55V12.75ZM10.95 12.75H24V24l-13.05-1.95V12.75Z"
              />
            </svg>
            <span>아동용 앱 다운로드</span>
            <span class="landing-header__dl-icon">
              <Download :size="14" aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Grid -->
    <main id="main-content" class="content-wrapper">
      
      <!-- Hero Section -->
      <section class="viewport-section hero-section" id="hero">
        <div class="hero-content-top-left">
          <h1 class="main-hero-title">아이마다 다른 읽기의 속도를<br/>함께 찾아갑니다</h1>
          <p class="main-hero-subtitle">AI 맞춤형 읽기 교육 서비스, 아이리드</p>
          <p class="main-hero-desc">
            개인화된 학습과 정밀한 시선·음성 분석으로 아이의 문해력 성장을 돕습니다.<br/>
            아래로 스크롤하여 아이리드의 주요 서비스들을 확인해보세요.
          </p>
          <div class="action-row hero-actions">
            <RouterLink class="btn btn-primary" to="/login">
              교수자 웹 바로가기
              <ArrowRight :size="18" aria-hidden="true" />
            </RouterLink>

            <button class="btn btn-black" type="button" @click="openDownloadModal">
              <svg
                class="windows-icon"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M0 3.45 9.75 2.1v9.15H0V3.45ZM10.95 1.95 24 0v11.25H10.95V1.95ZM0 12.75h9.75v9.15L0 20.55V12.75ZM10.95 12.75H24V24l-13.05-1.95V12.75Z"
                />
              </svg>
              아동용 앱 다운로드
              <Download :size="18" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <!-- Service Sections -->
      <section 
        v-for="(card, idx) in cards" 
        :key="card.id"
        :id="`section-${idx}`"
        class="viewport-section service-section"
      >
        <div class="hero-grid">
          <!-- Left Side: Card Information -->
          <div class="hero-left">
            <div class="card-meta">
              <span class="category-chip" :class="`chip--${card.tone}`">
                <component :is="card.icon" :size="14" aria-hidden="true" />
                {{ card.category }}
              </span>
              <span class="badge-chip">{{ card.badge }}</span>
            </div>

            <div class="card-typography">
              <h2 class="card-title">{{ card.title }}</h2>
              <p class="card-subtitle">{{ card.subtitle }}</p>
              <p class="card-description">{{ card.description }}</p>
            </div>

            <!-- Feature Highlights -->
            <ul class="highlight-list">
              <li v-for="point in card.highlights" :key="point">
                <CheckCircle2 :size="17" class="check-icon" aria-hidden="true" />
                <span>{{ point }}</span>
              </li>
            </ul>
          </div>

          <!-- Right Side: Content Showcase Card -->
          <div class="hero-right">
            <div class="card-frame" :class="`frame--${card.tone}`">
              <div class="showcase-box image-showcase">
                <div class="showcase-topbar">
                  <span class="dot red"></span>
                  <span class="dot yellow"></span>
                  <span class="dot green"></span>
                  <span class="showcase-title">{{ card.showcaseTitle }}</span>
                </div>
                <div class="image-wrapper">
                  <img :src="card.imageSrc" :alt="card.imageAlt" loading="lazy" />
                  <div class="image-overlay-tag">
                    <Sparkles :size="16" />
                    <span>{{ card.showcaseTag }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Final CTA Section -->
      <section class="viewport-section final-cta-section" id="final-cta">
        <div class="cta-content">
          <div class="cta-mascot-wrapper">
            <img :src="'/images/cta-mascot.png'" alt="아이리드 마스코트" class="cta-mascot-img" />
          </div>
          <h2 class="cta-title">모든 아이가 읽는 즐거움을 깨닫는 그날까지</h2>
          <p class="cta-subtitle">iRead와 함께 맞춤형 읽기 여정을 시작해 보세요.</p>
          <div class="action-row cta-actions">
            <RouterLink class="btn btn-primary" to="/login">
              교수자 웹 바로가기
              <ArrowRight :size="18" aria-hidden="true" />
            </RouterLink>

            <button class="btn btn-black" type="button" @click="openDownloadModal">
              <svg
                class="windows-icon"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M0 3.45 9.75 2.1v9.15H0V3.45ZM10.95 1.95 24 0v11.25H10.95V1.95ZM0 12.75h9.75v9.15L0 20.55V12.75ZM10.95 12.75H24V24l-13.05-1.95V12.75Z"
                />
              </svg>
              아동용 앱 다운로드
              <Download :size="18" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </main>

    <!-- 아동용 앱 다운로드 모달 -->
    <div
      v-if="downloadModalOpen"
      class="download-modal-backdrop"
      role="presentation"
      @click.self="closeDownloadModal"
    >
      <section
        class="download-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-modal-title"
      >
        <button
          class="download-modal__close"
          type="button"
          aria-label="다운로드 안내 닫기"
          @click="closeDownloadModal"
        >
          ×
        </button>
        <h2 id="download-modal-title" class="download-modal__title">아동용 앱 다운로드</h2>
        <p class="download-modal__desc">
          Windows용 아이리드 아동 앱 설치 파일을 내려받습니다.
        </p>
        <a
          v-if="childAppDownloadUrl"
          class="btn btn-black download-modal__download"
          :href="childAppDownloadUrl"
          download
        >
          <svg
            class="windows-icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M0 3.45 9.75 2.1v9.15H0V3.45ZM10.95 1.95 24 0v11.25H10.95V1.95ZM0 12.75h9.75v9.15L0 20.55V12.75ZM10.95 12.75H24V24l-13.05-1.95V12.75Z"
            />
          </svg>
          아동용 앱 다운로드
          <Download :size="18" aria-hidden="true" />
        </a>
        <button
          v-else
          class="btn btn-black btn-disabled download-modal__download"
          type="button"
          disabled
        >
          <svg
            class="windows-icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M0 3.45 9.75 2.1v9.15H0V3.45ZM10.95 1.95 24 0v11.25H10.95V1.95ZM0 12.75h9.75v9.15L0 20.55V12.75ZM10.95 12.75H24V24l-13.05-1.95V12.75Z"
            />
          </svg>
          아동용 앱 다운로드
          <Download :size="18" aria-hidden="true" />
        </button>
        <a
          class="download-modal__driver"
          :href="eyeTrackerDriverUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          아이리드는 Tobii 드라이버를 필요로 합니다(다운로드 링크).
        </a>
      </section>
    </div>

  </div>
</template>

<style scoped>
.landing-page-wrapper {
  --ink: #112546;
  --text-main: #203456;
  --text-soft: #5b6f90;
  --brand-blue: #287fdf;
  --brand-blue-dark: #1664be;
  
  position: relative;
  width: 100%;
  background: #ffffff; /* Fallback */
  color: var(--text-main);
  font-family: Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
}

/* 아동용 앱 다운로드 모달 */
.download-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(17 37 70 / 45%);
}

.download-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  width: min(92vw, 560px);
  padding: 56px 40px 48px;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 24px 64px rgb(17 37 70 / 24%);
  text-align: center;
}

.download-modal__close {
  position: absolute;
  top: 14px;
  right: 16px;
  padding: 2px 8px;
  border: 0;
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
}

.download-modal__close:hover {
  color: var(--ink);
}

.download-modal__title {
  margin: 0;
  color: var(--ink);
  font-size: 24px;
  font-weight: 800;
}

.download-modal__desc {
  margin: 0;
  color: var(--text-soft);
  font-size: 15px;
}

.download-modal__download {
  margin-top: 6px;
}

.download-modal__driver {
  margin-top: 2px;
  color: var(--text-soft);
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.download-modal__driver:hover {
  color: var(--brand-blue);
}

/* Fixed Background Image */
.fixed-background {
  position: fixed;
  inset: 0;
  background-image: url('/images/landing-reading-journey.png');
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
  z-index: 0;
}

/* Dynamic White Overlay */
.dynamic-overlay {
  position: fixed;
  inset: 0;
  background: #ffffff; /* White Wash */
  z-index: 1;
  pointer-events: none;
  transition: opacity 0.1s linear;
}

.skip-link {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 999;
  padding: 8px 12px;
  background: #112546;
  color: #fff;
  border-radius: 8px;
  transform: translateY(-150%);
  transition: transform 0.2s ease;
}
.skip-link:focus {
  transform: translateY(0);
}

/* Header */
.landing-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 50;
  height: 68px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
}

.header-inner {
  max-width: 1320px;
  height: 100%;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.landing-brand-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.landing-brand__mark {
  display: flex;
  align-items: center;
  transform: rotate(-2deg);
}

.landing-brand__mark span {
  display: grid;
  width: 22px;
  height: 22px;
  margin-left: -2px;
  border-radius: 6px;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  place-items: center;
}

.landing-brand__mark span:nth-child(1) { background: #f5a623; }
.landing-brand__mark span:nth-child(2) { background: #7bc601; }
.landing-brand__mark span:nth-child(3) { background: #22a6e8; }
.landing-brand__mark span:nth-child(4) { background: #8f59bb; }

.landing-brand__text {
  font-size: 20px;
  font-weight: 850;
  color: var(--ink);
  letter-spacing: -0.03em;
}

/* Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.landing-header__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 16px;
  border-radius: 999px;
  background: var(--brand-blue);
  color: #fff;
  text-decoration: none;
  font-size: 13px;
  font-weight: 750;
  transition: all 0.2s ease;
}

.landing-header__cta:hover {
  background: var(--brand-blue-dark);
  transform: translateY(-1px);
}

.landing-header__cta-icon {
  display: grid;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  place-items: center;
}

/* Download Button in Header */
.landing-header__dl {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 16px;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  text-decoration: none;
  font-size: 13px;
  font-weight: 750;
  transition: all 0.2s ease;
}

.landing-header__dl:not(:disabled):hover {
  background: #000;
  transform: translateY(-1px);
}

.landing-header__dl-icon {
  display: grid;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  place-items: center;
}

/* Main Content Wrapper */
.content-wrapper {
  position: relative;
  z-index: 10;
}

/* Viewport Section */
.viewport-section {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px 40px; /* offset header */
  max-width: 1320px;
  margin: 0 auto;
}

/* Hero Section (Top Left Aligned) */
.hero-section {
  align-items: flex-start;
  justify-content: flex-start;
  padding-top: 220px; /* Push down from header */
}

.hero-content-top-left {
  text-align: left;
  max-width: 600px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 32px;
  padding: 48px;
  box-shadow: 0 24px 48px rgba(17, 37, 70, 0.08);
}

.main-hero-title {
  font-size: clamp(32px, 3.5vw, 48px);
  font-weight: 900;
  color: var(--ink);
  line-height: 1.2;
  letter-spacing: -0.03em;
  margin-bottom: 16px;
}

.main-hero-subtitle {
  font-size: 20px;
  font-weight: 750;
  color: var(--brand-blue-dark);
  margin-bottom: 24px;
}

.main-hero-desc {
  font-size: 17px;
  line-height: 1.6;
  color: var(--text-main);
  margin-bottom: 40px;
}

.hero-actions {
  justify-content: flex-start;
  margin-bottom: 0;
}

/* Service Section Grid */
.hero-grid {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 36px;
  align-items: center;
  width: 100%;
}

/* Left Column */
.hero-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: transparent;
  padding: 12px 0;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.chip--blue { background: #e8f3ff; color: #1e70cf; }
.chip--purple { background: #f3ebfc; color: #7f44c4; }
.chip--amber { background: #fff5e0; color: #d97706; }
.chip--green { background: #e6f7ec; color: #16a34a; }

.badge-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(17, 37, 70, 0.06);
  color: var(--text-soft);
  font-size: 11px;
  font-weight: 700;
}

.card-title {
  font-size: clamp(28px, 2.5vw, 38px);
  font-weight: 850;
  color: var(--ink);
  line-height: 1.25;
  letter-spacing: -0.04em;
  margin-bottom: 8px;
}

.card-subtitle {
  font-size: 16px;
  font-weight: 750;
  color: var(--brand-blue-dark);
  margin-bottom: 12px;
}

.card-description {
  font-size: 15px;
  line-height: 1.65;
  color: var(--text-soft);
  margin-bottom: 20px;
  max-width: 520px;
}

.highlight-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.highlight-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 650;
  color: var(--text-main);
}

.check-icon {
  color: #22c55e;
  flex-shrink: 0;
}

/* Action Buttons */
.action-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  padding: 0 20px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 750;
  text-decoration: none;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-primary {
  background: var(--brand-blue);
  color: #fff;
  box-shadow: 0 8px 20px rgba(40, 127, 223, 0.25);
}

.btn-primary:hover {
  background: var(--brand-blue-dark);
  transform: translateY(-2px);
}

.btn-black {
  background: var(--ink);
  color: #ffffff;
  border-color: var(--ink);
}

.btn-black:not(:disabled):hover {
  background: #000000;
  transform: translateY(-2px);
}

.btn-secondary {
  background: #ffffff;
  border-color: #d6e4f3;
  color: var(--text-main);
}

.btn-secondary:not(:disabled):hover {
  background: #f7fbff;
  transform: translateY(-2px);
}

.btn-disabled {
  cursor: not-allowed;
}

/* Right Side: Showcase Cards */
.hero-right {
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-frame {
  width: 100%;
  max-width: 620px;
  border-radius: 24px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 24px 60px rgba(25, 59, 121, 0.08);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(8px);
}

.showcase-box {
  border-radius: 16px;
  overflow: hidden;
  background: #fbfdfe;
  border: 1px solid #e2ecf6;
}

.showcase-topbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #edf3fa;
  border-bottom: 1px solid #e0ebf5;
}

.showcase-topbar .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.showcase-topbar .dot.red { background: #ff5f56; }
.showcase-topbar .dot.yellow { background: #ffbd2e; }
.showcase-topbar .dot.green { background: #27c93f; }

.showcase-title {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-soft);
}

/* Image Showcase */
.image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: #f5f7fa;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-overlay-tag {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(17, 37, 70, 0.85);
  color: #fff;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 750;
  backdrop-filter: blur(8px);
}

/* Eyetracking Showcase Visual */
.gaze-visual-body {
  padding: 24px;
  background: linear-gradient(180deg, #f7faff 0%, #eef5fc 100%);
  aspect-ratio: 16 / 10;
  display: flex;
  align-items: center;
}

.gaze-reader-preview {
  width: 100%;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(25, 59, 121, 0.08);
  border: 1px solid #d9e6f5;
}

.reader-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.student-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 800;
  color: var(--ink);
}

.mini-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.gaze-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 750;
  color: #7f44c4;
  background: #f3ebfc;
  padding: 4px 10px;
  border-radius: 999px;
}

.reader-text-box {
  position: relative;
  padding: 20px;
  background: #f9fbfd;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px dashed #cde0f3;
}

.sample-text {
  font-size: 22px;
  font-weight: 800;
  word-spacing: 12px;
  margin: 0;
}

.sample-text .word.read-perfect { color: #16a34a; }
.sample-text .word.gaze-target { color: #287fdf; text-decoration: underline; }
.sample-text .word.read-pending { color: #94a3b8; }

.gaze-point-pulse {
  position: absolute;
  transform: translate(-50%, -50%);
}

.pulse-ring {
  position: absolute;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #7f44c4;
  transform: translate(-50%, -50%);
  animation: pulse-wave 1.8s infinite ease-out;
}

.pulse-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #7f44c4;
  transform: translate(-50%, -50%);
}

@keyframes pulse-wave {
  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
}

.voice-meter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f1f6fc;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12px;
}

.voice-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 750;
  color: var(--brand-blue-dark);
}

.sound-wave {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 16px;
}

.sound-wave i {
  width: 3px;
  background: var(--brand-blue);
  border-radius: 999px;
}

.score-badge {
  margin-left: auto;
  font-weight: 800;
  color: #16a34a;
}

/* Story Scene Visual */
.story-visual-body {
  padding: 24px;
  background: linear-gradient(180deg, #fffcf5 0%, #fff7e8 100%);
  aspect-ratio: 16 / 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.story-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.owl-illustration {
  height: 140px;
  filter: drop-shadow(0 10px 15px rgba(217, 119, 6, 0.15));
}

.story-speech-bubble {
  background: #ffffff;
  padding: 16px 20px;
  border-radius: 16px;
  border: 1px solid #fce8c3;
  box-shadow: 0 6px 20px rgba(217, 119, 6, 0.1);
  text-align: center;
}

.story-quote {
  font-size: 16px;
  font-weight: 800;
  color: #92400e;
  margin-bottom: 10px;
}

.interactive-word-chips {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.word-chip {
  padding: 4px 12px;
  border-radius: 999px;
  background: #fef3c7;
  color: #b45309;
  font-size: 12px;
  font-weight: 750;
}

.word-chip.active {
  background: #f59e0b;
  color: #fff;
}

/* Teacher Dashboard Visual */
.teacher-visual-body {
  padding: 20px;
  background: #f8fafc;
  aspect-ratio: 16 / 10;
}

.teacher-dashboard-preview {
  display: flex;
  height: 100%;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  color: var(--ink);
}

.dash-sidebar {
  width: 130px;
  background: #f1f5f9;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-right: 1px solid #e2e8f0;
}

.dash-menu {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
}

.dash-menu.active {
  background: #ffffff;
  color: var(--brand-blue-dark);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.dash-content {
  flex: 1;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.student-info-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dash-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.student-info-row strong { font-size: 13px; display: block; }
.student-info-row small { font-size: 10px; color: #94a3b8; }

.status-tag {
  margin-left: auto;
  font-size: 10px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 999px;
}
.tag-success { background: #dcfce7; color: #15803d; }

.dash-metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.metric-card {
  background: #f8fafc;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
}
.metric-card small { font-size: 10px; color: #64748b; display: block; }
.metric-card strong { font-size: 14px; color: var(--ink); }

.dash-chart-box {
  background: #f8fafc;
  padding: 10px;
  border-radius: 8px;
  flex: 1;
}

.chart-title {
  font-size: 10px;
  font-weight: 750;
  color: #64748b;
  margin-bottom: 8px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 50px;
}

.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  height: 100%;
  justify-content: flex-end;
}

.bar-col span {
  width: 14px;
  background: #cbd5e1;
  border-radius: 4px 4px 0 0;
}

.bar-col.highlight span {
  background: var(--brand-blue);
}

.bar-col small { font-size: 9px; color: #94a3b8; }

/* Final CTA Section */
.final-cta-section {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 24px;
}

.cta-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-image: url('/images/cta-bg.png');
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  width: 100%;
  max-width: 1000px;
  aspect-ratio: 16 / 9;
  border-radius: 32px;
  padding: 60px 40px;
  box-shadow: 0 24px 60px rgba(25, 59, 121, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.cta-mascot-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.cta-mascot-img {
  width: 140px;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 12px 24px rgba(255, 140, 180, 0.25));
  animation: float-mascot 3s ease-in-out infinite;
}

@keyframes float-mascot {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.cta-title {
  font-size: clamp(32px, 3.5vw, 48px);
  font-weight: 900;
  color: var(--ink);
  line-height: 1.3;
  letter-spacing: -0.04em;
  margin-bottom: 16px;
}

.cta-subtitle {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 40px;
}

.cta-actions {
  justify-content: center;
}


/* Responsive Media Queries */
@media (max-width: 1024px) {
  .hero-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  .card-tabs {
    display: none;
  }
}
</style>
