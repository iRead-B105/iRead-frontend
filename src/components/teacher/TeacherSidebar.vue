<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { StudentNavigationItem } from '@/features/teacher/student'
import { useSessionStore } from '@/stores/session'
import { useStudentStore } from '@/stores/students'
import SidebarIcon from '@/components/teacher/SidebarIcon.vue'
import StudentSwitcher from '@/components/teacher/StudentSwitcher.vue'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const studentStore = useStudentStore()
const { teacher, logoutPending } = storeToRefs(sessionStore)
const { navigationItems, navigationItemsById, selectedStudentId } = storeToRefs(studentStore)
const logoutError = ref('')
const currentStudent = computed(
  () =>
    navigationItemsById.value[Number(route.params.id)] ??
    (selectedStudentId.value === null
      ? null
      : navigationItemsById.value[selectedStudentId.value]) ??
    navigationItems.value[0] ??
    null,
)
const profileImageUrl = computed(
  () => teacher.value?.profileImageUrl ?? '/images/teacher-profile.png',
)
const studentRouteNames = new Set([
  'student-overview',
  'student-curriculum',
  'student-training-history',
  'student-test-history',
  'student-report',
  'student-edit',
])

function selectStudent(student: StudentNavigationItem) {
  const routeName = studentRouteNames.has(String(route.name))
    ? String(route.name)
    : 'student-overview'
  studentStore.rememberStudent(student)
  router.push({ name: routeName, params: { id: student.studentId } })
}

function openProfileSettings() {
  void router.push('/teacher/settings')
}

async function logout() {
  if (logoutPending.value) return
  logoutError.value = ''
  try {
    await sessionStore.logout()
    await router.push('/login')
  } catch {
    logoutError.value = '로그아웃에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }
}

onMounted(() => {
  if (studentStore.navigationStatus === 'idle') {
    void studentStore.loadNavigation({ reset: true })
  }
})
</script>

<template>
  <aside class="teacher-sidebar">
    <RouterLink class="sidebar-brand" to="/teacher/dashboard" aria-label="iRead 대시보드">
      <img :src="'/images/iread-logo.png'" alt="iRead" />
    </RouterLink>

    <div class="sidebar-panel">
      <StudentSwitcher
        v-if="currentStudent"
        :current-student="currentStudent"
        @select="selectStudent"
        @manage="router.push('/teacher/students')"
      />
      <Button
        v-else
        class="student-list-link"
        variant="outline"
        type="button"
        @click="router.push('/teacher/students')"
      >
        등록된 아동이 없습니다
      </Button>

      <nav class="sidebar-nav" aria-label="교수자 아동 관리 메뉴">
        <RouterLink to="/teacher/dashboard">
          <span class="sidebar-nav__icon"><SidebarIcon name="home" /></span>
          <strong>대시보드</strong>
        </RouterLink>
        <RouterLink to="/teacher/students">
          <span class="sidebar-nav__icon"><SidebarIcon name="users" /></span>
          <strong>아동 목록</strong>
        </RouterLink>
        <template v-if="currentStudent">
          <RouterLink :to="{ name: 'student-overview', params: { id: currentStudent.studentId } }">
            <span class="sidebar-nav__icon"><SidebarIcon name="home" /></span
            ><strong>학습 현황</strong>
          </RouterLink>
          <RouterLink :to="{ name: 'student-curriculum', params: { id: currentStudent.studentId } }">
            <span class="sidebar-nav__icon"><SidebarIcon name="book" /></span
            ><strong>커리큘럼 관리</strong>
          </RouterLink>
          <RouterLink
            :to="{ name: 'student-training-history', params: { id: currentStudent.studentId } }"
          >
            <span class="sidebar-nav__icon"><SidebarIcon name="chart" /></span
            ><strong>훈련 이력</strong>
          </RouterLink>
          <RouterLink :to="{ name: 'student-test-history', params: { id: currentStudent.studentId } }">
            <span class="sidebar-nav__icon"><SidebarIcon name="clipboard" /></span
            ><strong>검사 이력</strong>
          </RouterLink>
          <RouterLink :to="{ name: 'student-report', params: { id: currentStudent.studentId } }">
            <span class="sidebar-nav__icon"><SidebarIcon name="report" /></span
            ><strong>보고서</strong>
          </RouterLink>
          <RouterLink :to="{ name: 'student-edit', params: { id: currentStudent.studentId } }">
            <span class="sidebar-nav__icon"><SidebarIcon name="edit" /></span
            ><strong>아동 정보 관리</strong>
          </RouterLink>
        </template>
        <RouterLink to="/teacher/settings">
          <span class="sidebar-nav__icon"><SidebarIcon name="settings" /></span>
          <strong>설정</strong>
        </RouterLink>
      </nav>
    </div>

    <div class="sidebar-footer">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            class="sidebar-account__trigger"
            variant="ghost"
            type="button"
            aria-label="계정 메뉴 열기"
          >
            <img :src="profileImageUrl" :alt="`${teacher?.name ?? '교수자'} 프로필`" />
            <span>
              <strong>{{ teacher?.name ?? '교수자' }}</strong>
              <small>{{ teacher?.organization ?? '' }}</small>
            </span>
            <span class="sidebar-account__chevron" aria-hidden="true">⌃</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="sidebar-account__menu" side="right" align="end">
          <DropdownMenuLabel>계정 메뉴</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem @select="openProfileSettings">프로필 설정</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            :disabled="logoutPending"
            @select="logout"
          >
            {{ logoutPending ? '로그아웃 중...' : '로그아웃' }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p v-if="logoutPending" class="sidebar-account__status" role="status">
        로그아웃 중...
      </p>
      <p v-if="logoutError" class="sidebar-account__error" role="alert">
        {{ logoutError }}
      </p>
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

.student-list-link {
  width: 100%;
  min-height: 58px;
  color: var(--slate-600);
  font-size: 11px;
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

.sidebar-account__trigger {
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 64px;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--slate-700);
  box-shadow: none;
  text-align: left;
  grid-template-columns: 34px minmax(0, 1fr) 18px;
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

.sidebar-account__chevron {
  color: var(--slate-400);
  font-size: 14px;
  text-align: center;
}

.sidebar-account__status,
.sidebar-account__error {
  margin: 0;
  padding: 0 16px 12px;
  font-size: 10px;
  line-height: 1.45;
}

.sidebar-account__status {
  color: var(--slate-500);
}

.sidebar-account__error {
  color: var(--danger-600);
}

@media (max-width: 900px) {
  .teacher-sidebar {
    position: relative;
    width: 100%;
    height: auto;
    min-width: 0;
    padding: 10px 16px;
    border-right: 0;
    border-bottom: 1px solid var(--sidebar-border);
  }

  .sidebar-brand {
    height: 40px;
    flex-basis: 40px;
    margin-bottom: 8px;
  }

  .sidebar-panel {
    gap: 10px;
  }

  .sidebar-nav {
    display: flex;
    padding-bottom: 2px;
    overflow-x: auto;
  }

  .sidebar-nav a {
    min-width: max-content;
  }

  .sidebar-footer {
    margin: 10px -16px -10px;
  }
}
</style>
