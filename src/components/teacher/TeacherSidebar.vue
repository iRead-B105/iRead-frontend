<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import type { Student } from '@/features/teacher/types'
import { useTeacherAdmin } from '@/features/teacher/useTeacherAdmin'
import SidebarIcon from '@/components/teacher/SidebarIcon.vue'
import StudentSwitcher from '@/components/teacher/StudentSwitcher.vue'

const route = useRoute()
const router = useRouter()
const { students, teacher, loadAdminData, logout: logoutSession } = useTeacherAdmin()
const fallbackStudent: Student = {
  id: 0, name: '학생 없음', age: 0, birthDate: '', gender: '남자', phone: '', school: '',
  guardianName: '', guardianRelation: '', guardianPhone: '', guardianEmail: '', address: '',
  lastLearningDate: '', lastTestDate: '', totalLearningTime: '0시간', latestTraining: '-',
  lastAccess: '-', learningStartDate: '', weeklyAttendance: '0%',
}
const currentStudent = computed(
  () => students.find((student) => student.id === Number(route.params.id)) ?? students[0] ?? fallbackStudent,
)
const studentRouteNames = new Set([
  'student-overview',
  'student-curriculum',
  'student-training-history',
  'student-test-history',
  'student-report',
  'student-edit',
])

function selectStudent(student: Student) {
  const routeName = studentRouteNames.has(String(route.name))
    ? String(route.name)
    : 'student-overview'
  router.push({ name: routeName, params: { id: student.id } })
}

function openProfileSettings() {
  router.push('/teacher/settings')
}

async function logout() {
  await logoutSession()
  await router.push('/login')
}

onMounted(() => void loadAdminData())
</script>

<template>
  <aside class="teacher-sidebar">
    <RouterLink class="sidebar-brand" to="/teacher/dashboard" aria-label="iRead 아동 목록">
      <img src="/images/iread-logo.png" alt="iRead" />
    </RouterLink>

    <div class="sidebar-panel">
      <StudentSwitcher
        :students="students"
        :current-student="currentStudent"
        @select="selectStudent"
        @manage="router.push('/teacher/dashboard')"
      />

      <nav class="sidebar-nav" aria-label="교수자 아동 관리 메뉴">
        <RouterLink to="/teacher/dashboard">
          <span class="sidebar-nav__icon"><SidebarIcon name="users" /></span>
          <strong>아동 목록</strong>
        </RouterLink>
        <RouterLink :to="{ name: 'student-overview', params: { id: currentStudent.id } }">
          <span class="sidebar-nav__icon"><SidebarIcon name="home" /></span><strong>학습 현황</strong>
        </RouterLink>
        <RouterLink :to="{ name: 'student-curriculum', params: { id: currentStudent.id } }">
          <span class="sidebar-nav__icon"><SidebarIcon name="book" /></span
          ><strong>커리큘럼 관리</strong>
        </RouterLink>
        <RouterLink :to="{ name: 'student-training-history', params: { id: currentStudent.id } }">
          <span class="sidebar-nav__icon"><SidebarIcon name="chart" /></span
          ><strong>훈련 이력</strong>
        </RouterLink>
        <RouterLink :to="{ name: 'student-test-history', params: { id: currentStudent.id } }">
          <span class="sidebar-nav__icon"><SidebarIcon name="clipboard" /></span
          ><strong>테스트 이력</strong>
        </RouterLink>
        <RouterLink :to="{ name: 'student-report', params: { id: currentStudent.id } }">
          <span class="sidebar-nav__icon"><SidebarIcon name="report" /></span
          ><strong>보고서</strong>
        </RouterLink>
        <RouterLink :to="{ name: 'student-edit', params: { id: currentStudent.id } }">
          <span class="sidebar-nav__icon"><SidebarIcon name="edit" /></span
          ><strong>아동 정보 관리</strong>
        </RouterLink>
      </nav>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-account">
        <Button
          class="sidebar-account__trigger"
          variant="ghost"
          type="button"
          aria-label="프로필 설정으로 이동"
          @click="openProfileSettings"
        >
          <img src="/images/teacher-profile.png" alt="" />
          <span>
            <strong>{{ teacher?.name ?? '교수자' }}</strong>
            <small>{{ teacher?.organization ?? '' }}</small>
          </span>
        </Button>
        <Button
          class="sidebar-account__logout"
          variant="ghost"
          size="icon"
          type="button"
          aria-label="로그아웃"
          title="로그아웃"
          @click="logout"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10" />
            <path d="m15 8 4 4-4 4M19 12H9" />
          </svg>
        </Button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.teacher-sidebar {
  position: sticky;
  z-index: 40;
  top: 0;
  display: flex;
  height: 100vh;
  min-width: 224px;
  align-self: start;
  flex-direction: column;
  margin: 0;
  padding: 16px 16px 14px;
  overflow: visible;
  border-right: 1px solid var(--sidebar-border);
  background: var(--sidebar);
}

.sidebar-brand {
  display: grid;
  width: 100%;
  height: 48px;
  flex: 0 0 48px;
  margin: 0 0 18px;
  overflow: hidden;
  place-items: center;
}

.sidebar-brand img {
  width: 78px;
  height: 46px;
  max-width: none;
  object-fit: contain;
  transform: scale(1.85);
}

.sidebar-panel {
  display: grid;
  gap: 16px;
}

.sidebar-nav {
  display: grid;
  gap: 2px;
}

.sidebar-nav a {
  display: grid;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  color: var(--sidebar-foreground);
  grid-template-columns: 26px 1fr;
}

.sidebar-nav a:hover {
  background: var(--interactive-hover-background);
  color: var(--sidebar-accent-foreground);
}

.sidebar-nav a.router-link-exact-active {
  background: var(--active-selection-background);
  color: var(--active-selection-foreground);
}

.sidebar-nav__icon {
  display: grid;
  width: 24px;
  height: 24px;
  background: transparent;
  color: var(--slate-500);
  place-items: center;
}

.sidebar-nav a.router-link-exact-active .sidebar-nav__icon {
  color: var(--primary-700);
}

.sidebar-nav strong {
  font-size: 12px;
}

.sidebar-footer {
  margin-top: auto;
  margin-right: -16px;
  margin-bottom: -14px;
  margin-left: -16px;
  padding: 0;
  border-top: 1px solid var(--sidebar-border);
  background: var(--sidebar);
}

.sidebar-account {
  position: relative;
  width: 100%;
  min-height: 64px;
}

.sidebar-account__trigger {
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 64px;
  align-items: center;
  gap: 7px;
  padding: 8px 54px 8px 16px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--slate-700);
  box-shadow: none;
  text-align: left;
  grid-template-columns: 34px minmax(0, 1fr);
}

.sidebar-account__trigger:hover {
  background: var(--interactive-hover-background);
}

.sidebar-account__trigger img {
  width: 34px;
  height: 34px;
  border: 1px solid var(--slate-200);
  border-radius: 50%;
  object-fit: cover;
}

.sidebar-account__trigger > span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.sidebar-account__trigger strong {
  overflow: hidden;
  color: var(--slate-800);
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-account__trigger small {
  overflow: hidden;
  color: var(--slate-500);
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-account__logout {
  position: absolute;
  top: 50%;
  right: 14px;
  width: 30px;
  height: 30px;
  border: 1px solid color-mix(in oklch, var(--destructive) 32%, var(--sidebar-border));
  border-radius: 50%;
  background: var(--sidebar);
  color: var(--danger-600);
  transform: translateY(-50%);
}

.sidebar-account__logout:hover {
  border-color: color-mix(in oklch, var(--destructive) 56%, var(--sidebar-border));
  background: color-mix(in oklch, var(--destructive) 8%, var(--sidebar));
  color: var(--danger-600);
}

.sidebar-account__logout svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}
</style>
