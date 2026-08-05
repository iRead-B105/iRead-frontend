<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type Component } from 'vue'
import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  CheckCircle2,
  Download,
  Eye,
  Mic,
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
  type: 'image' | 'visual-gaze' | 'visual-story' | 'visual-teacher'
  imageSrc: string
  imageAlt: string
  icon: Component
  tone: string
}

const childAppDownloadUrl = import.meta.env.VITE_CHILD_APP_DOWNLOAD_URL?.trim()

const cards: ServiceCard[] = [
  {
    id: 'learner-app',
    category: '아동용 앱',
    badge: '실제 화면',
    title: '아동에게 맞춰진 즐거운 읽기 첫걸음',
    subtitle: '나의 성장 · 이야기 나라 · 글자 연습 · 실력 도전',
    description:
      '초등 저학년 아동이 부담 없이 자신의 속도에 맞춰 글자와 소리를 익히고 이야기 탐험을 이어갈 수 있는 아동 전용 인터페이스입니다.',
    highlights: [
      '아동 친화적 UI 및 흥미 유도 캐릭터 구성',
      '오늘의 읽기 미션으로 꾸준한 습관 형성',
      '난이도 자동 조절로 아동별 읽기 자신감 향상',
    ],
    type: 'image',
    imageSrc: '/images/learner-home-screenshot.png',
    imageAlt: '나의 성장, 이야기 나라, 글자 연습, 실력 도전으로 구성된 아동용 아이리드 메인 화면',
    icon: Sparkles,
    tone: 'blue',
  },
  {
    id: 'eyetracking-voice',
    category: '시선·음성 훈련',
    badge: 'AI 정밀 분석',
    title: '시선 추적과 음성 반응으로 정밀하게',
    subtitle: '읽기 흐름과 발음 정확도를 한 번에',
    description:
      '아이가 글을 읽는 시선의 이탈과 머무름을 분석하고, Azure Speech 기반 음성 평가로 발음 정확도와 억양을 다각도로 관측합니다.',
    highlights: [
      '시선 고정(Fixation) 및 역행(Regression) 실시간 관측',
      '단어별 발음 정확도 및 음성 훈련 피드백',
      '비침습적 웹캠 기반 시선 인식 기술 지원',
    ],
    type: 'visual-gaze',
    imageSrc: '',
    imageAlt: '',
    icon: Eye,
    tone: 'purple',
  },
  {
    id: 'story-practice',
    category: '이야기 읽기',
    badge: '맞춤 훈련',
    title: '이야기 속에서 자연스럽게 자라는 문해력',
    subtitle: '단어 연습에서 단락 이해까지',
    description:
      '재미있는 동화와 이야기 속에서 글자-소리 대응을 익히고, 아이의 개별 반응 데이터에 맞춰 유기적인 커리큘럼을 제공합니다.',
    highlights: [
      '단계별 어휘 및 상호작용형 동화 콘텐츠',
      '오독·재시도 시 따뜻한 안내 및 힌트 팝업',
      '아동의 읽기 동기를 높이는 스티커 보상',
    ],
    type: 'visual-story',
    imageSrc: '',
    imageAlt: '',
    icon: BookOpenText,
    tone: 'amber',
  },
  {
    id: 'teacher-web',
    category: '교수자 웹',
    badge: '학습 관리',
    title: '아이의 오늘을 보고 다음 성장을 지원합니다',
    subtitle: '학습 현황 · 정밀 분석 · 개별 커리큘럼',
    description:
      '교수자는 아동별 학습 이력, 검사 결과, 시선·음성 분석 리포트를 종합적으로 확인하고 최적의 교육 지침을 수립할 수 있습니다.',
    highlights: [
      '아동별 실시간 학습 현황 및 출석 관리',
      '시선 히트맵 및 읽기 속도 데이터 시각화',
      '전문가 가이드라인에 맞춘 개별 보고서 생성',
    ],
    type: 'visual-teacher',
    imageSrc: '',
    imageAlt: '',
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

          <a
            v-if="childAppDownloadUrl"
            class="landing-header__dl"
            :href="childAppDownloadUrl"
            download
          >
            <span>아동용 앱 다운로드</span>
            <span class="landing-header__dl-icon">
              <Download :size="14" aria-hidden="true" />
            </span>
          </a>
          <button v-else class="landing-header__dl btn-disabled" type="button" disabled>
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

            <a
              v-if="childAppDownloadUrl"
              class="btn btn-black"
              :href="childAppDownloadUrl"
              download
            >
              아동용 앱 다운로드
              <Download :size="18" aria-hidden="true" />
            </a>
            <button v-else class="btn btn-black btn-disabled" type="button" disabled>
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
              <!-- Card Type 1: Learner App Image Screenshot -->
              <div v-if="card.type === 'image'" class="showcase-box image-showcase">
                <div class="showcase-topbar">
                  <span class="dot red"></span>
                  <span class="dot yellow"></span>
                  <span class="dot green"></span>
                  <span class="showcase-title">아동용 아이리드 실행 화면</span>
                </div>
                <div class="image-wrapper">
                  <img :src="card.imageSrc" :alt="card.imageAlt" />
                  <div class="image-overlay-tag">
                    <Sparkles :size="16" />
                    <span>개인화 학습 홈</span>
                  </div>
                </div>
              </div>

              <!-- Card Type 2: Eyetracking & Voice Visual -->
              <div v-else-if="card.type === 'visual-gaze'" class="showcase-box gaze-showcase">
                <div class="showcase-topbar">
                  <span class="dot red"></span>
                  <span class="dot yellow"></span>
                  <span class="dot green"></span>
                  <span class="showcase-title">시선 추적 & 음성 평가 엔진</span>
                </div>
                <div class="gaze-visual-body">
                  <div class="gaze-reader-preview">
                    <div class="reader-header">
                      <span class="student-badge">
                        <img src="/images/student-profile-boy.png" alt="아동 프로필" class="mini-avatar" />
                        민우 아동 훈련 중
                      </span>
                      <span class="gaze-status">
                        <Eye :size="14" /> 시선 추적 활성
                      </span>
                    </div>

                    <div class="reader-text-box">
                      <p class="sample-text">
                        <span class="word read-perfect">소나무가</span>
                        <span class="word read-perfect">바람에</span>
                        <span class="word gaze-target">살랑살랑</span>
                        <span class="word read-pending">흔들립니다.</span>
                      </p>
                      <div class="gaze-point-pulse" style="top: 48%; left: 52%">
                        <span class="pulse-ring"></span>
                        <span class="pulse-dot"></span>
                      </div>
                    </div>

                    <div class="voice-meter-bar">
                      <div class="voice-label">
                        <Mic :size="15" /> Azure Speech 음성 정밀 분석
                      </div>
                      <div class="sound-wave">
                        <i style="height: 60%"></i><i style="height: 100%"></i><i style="height: 40%"></i><i style="height: 80%"></i><i style="height: 50%"></i>
                      </div>
                      <span class="score-badge">발음 정확도 94점</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Card Type 3: Story Scene Visual -->
              <div v-else-if="card.type === 'visual-story'" class="showcase-box story-showcase">
                <div class="showcase-topbar">
                  <span class="dot red"></span>
                  <span class="dot yellow"></span>
                  <span class="dot green"></span>
                  <span class="showcase-title">이야기 나라 · 부엉이의 숲</span>
                </div>
                <div class="story-visual-body">
                  <div class="story-canvas">
                    <img src="/images/story-scene-owl.svg" alt="부엉이 이야기 장면" class="owl-illustration" />
                    <div class="story-speech-bubble">
                      <p class="story-quote">"밤하늘의 별들이 반짝이며 길을 밝혀주어요!"</p>
                      <div class="interactive-word-chips">
                        <span class="word-chip active">밤하늘</span>
                        <span class="word-chip">반짝반짝</span>
                        <span class="word-chip">길잡이</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Card Type 4: Teacher Web Visual -->
              <div v-else-if="card.type === 'visual-teacher'" class="showcase-box teacher-showcase">
                <div class="showcase-topbar">
                  <span class="dot red"></span>
                  <span class="dot yellow"></span>
                  <span class="dot green"></span>
                  <span class="showcase-title">교수자 학습 관리 콘솔</span>
                </div>
                <div class="teacher-visual-body">
                  <div class="teacher-dashboard-preview">
                    <div class="dash-sidebar">
                      <span class="dash-menu active"><Users :size="14" /> 아동 목록</span>
                      <span class="dash-menu"><BrainCircuit :size="14" /> 분석 리포트</span>
                    </div>
                    <div class="dash-content">
                      <div class="student-info-row">
                        <img src="/images/student-profile-girl.png" alt="학생" class="dash-avatar" />
                        <div>
                          <strong>이지은 아동</strong>
                          <small>최근 학습: 오늘 14:20</small>
                        </div>
                        <span class="status-tag tag-success">훈련 정상</span>
                      </div>

                      <div class="dash-metrics-grid">
                        <div class="metric-card">
                          <small>주간 학습 시간</small>
                          <strong>140분</strong>
                        </div>
                        <div class="metric-card">
                          <small>읽기 속도 (WPM)</small>
                          <strong>118 WPM</strong>
                        </div>
                      </div>

                      <div class="dash-chart-box">
                        <div class="chart-title">주간 읽기 수행률 변화</div>
                        <div class="chart-bars">
                          <div class="bar-col"><span style="height: 45%"></span><small>월</small></div>
                          <div class="bar-col"><span style="height: 60%"></span><small>화</small></div>
                          <div class="bar-col"><span style="height: 75%"></span><small>수</small></div>
                          <div class="bar-col"><span style="height: 90%"></span><small>목</small></div>
                          <div class="bar-col highlight"><span style="height: 95%"></span><small>금</small></div>
                        </div>
                      </div>
                    </div>
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

            <a
              v-if="childAppDownloadUrl"
              class="btn btn-black"
              :href="childAppDownloadUrl"
              download
            >
              아동용 앱 다운로드
              <Download :size="18" aria-hidden="true" />
            </a>
            <button v-else class="btn btn-black btn-disabled" type="button" disabled>
              아동용 앱 다운로드
              <Download :size="18" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </main>

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
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
