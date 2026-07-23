import { apiRequest, jsonBody } from '@/lib/api'

export type Gender = 'MALE' | 'FEMALE'

export interface TeacherInfo {
  id?: number
  email: string
  name: string
  organization: string
  gender: Gender
  imagesId?: number | null
  profileImageUrl?: string | null
}

export interface StudentListItem {
  id: number
  name: string
  age: number
  recentLearningDate: string | null
  totalLearningTime: number
  recentTraining: string | null
}

export interface StudentDetail {
  id: number
  name: string
  studentCode: string
  birthday: string
  gender: Gender
  school: string
  guardian: string
  guardianContact: string
  guardianEmail: string
  address: string
  imageId: number | null
}

export type StudentPayload = Omit<StudentDetail, 'id'>

export interface AccuracyTrend {
  date: string
  accuracy: number
}

export interface TrainingHistory {
  date: string
  learningType: string
  startedAt: string
  finishedAt: string
  achievement: number
}

export interface TrainingCatalog {
  trainingId: number
  category: string
  sequence: number
  trainingName: string
  studentAchievement: number | null
}

export interface CurriculumLog {
  curriculumId: number
  date: string
  achievement: number
  trainings: Array<{ trainingId: number; unitName: string; trainingName: string }>
}

export interface TestListItem {
  testId: number
  date: string
}

export interface TestDetail {
  testId: number
  date: string
  readingTimeSeconds: number
  solvingTimeSeconds: number
  accuracy: number
  gazeDepartureCount: number
  questions: Array<{
    questionNumber: number
    question: string
    isCorrect: boolean
    correctAnswer: string
    selectedAnswer: string
  }>
}

export interface TestComparison {
  currentTest: TestDetail
  comparisonTests: TestDetail[]
}

export interface ReportSnapshot {
  learningDays: number
  totalTrainingTimeMinutes: number
  completedTrainingCount: number
  averageAccuracy: number
  averageReadingSpeed: number
  readingSpeedUnit: string
  growthHistory: Array<{ date: string; accuracy: number; readingSpeed: number; pronunciationScore: number }>
  areaAchievements: Array<{ area: string; achievement: number }>
  frequentlyIncorrectWords: Array<{
    wordId: number
    wordName: string
    attemptCount: number
    incorrectCount: number
    incorrectRate: number
  }>
  improvedPatterns: string[]
  persistentDifficultyPatterns: string[]
}

export interface Report {
  reportId: number
  studentId: number
  startDate: string
  endDate: string
  snapshot: ReportSnapshot
  teacherMemo: string
}

export interface ReportShare {
  shareId: number
  reportId: number
  shareUrl?: string
  expiresAt: string
  createdAt: string
  expired?: boolean
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<TeacherInfo>('/api/auth/login', {
      method: 'POST',
      body: jsonBody({ email, password }),
    }),
  signup: (payload: { email: string; password: string; name: string; organization: string; gender: Gender }) =>
    apiRequest<TeacherInfo>('/api/auth/sign-up', {
      method: 'POST',
      body: jsonBody(payload),
    }),
  me: () => apiRequest<TeacherInfo>('/api/auth/me'),
  logout: () => apiRequest<void>('/api/auth/logout', { method: 'POST' }),
}

export const teacherApi = {
  getInfo: () => apiRequest<TeacherInfo>('/api/admin/teacher/info'),
}

export const studentApi = {
  list: () => apiRequest<StudentListItem[]>('/api/admin/student/list'),
  get: (studentId: number) => apiRequest<StudentDetail>(`/api/admin/student/${studentId}`),
  create: (payload: StudentPayload) =>
    apiRequest<void>('/api/admin/student', { method: 'POST', body: jsonBody(payload) }),
  update: (studentId: number, payload: StudentPayload) =>
    apiRequest<void>(`/api/admin/student/${studentId}`, {
      method: 'PATCH',
      body: jsonBody(payload),
    }),
  remove: (studentId: number) =>
    apiRequest<void>(`/api/admin/student/${studentId}`, { method: 'DELETE' }),
  accuracyTrend: (studentId: number) =>
    apiRequest<AccuracyTrend[]>(`/api/admin/student/${studentId}/accuracy-trend`),
  trainingHistory: (studentId: number) =>
    apiRequest<TrainingHistory[]>(`/api/admin/student/${studentId}/training-history`),
}

export const trainingApi = {
  catalog: (studentId: number) =>
    apiRequest<TrainingCatalog[]>(`/api/admin/training/${studentId}`),
  curriculumLogs: (studentId: number) =>
    apiRequest<CurriculumLog[]>(`/api/admin/training/${studentId}/curriculum-log`),
  dailyCurriculum: (studentId: number, curriculumId: number) =>
    apiRequest<{ curriculumId: number; trainings: CurriculumLog['trainings'] }>(
      `/api/admin/training/${studentId}/${curriculumId}`,
    ),
  updateCurriculum: (studentId: number, curriculumId: number, trainingTemplateIds: number[]) =>
    apiRequest<void>(`/api/admin/training/${studentId}/${curriculumId}`, {
      method: 'PATCH',
      body: jsonBody({ trainingTemplateIds }),
    }),
  expectedWords: (studentId: number, trainingId: number) =>
    apiRequest<Array<{ wordId: number; wordName: string }>>(
      `/api/admin/training/${studentId}/${trainingId}/expected-word`,
    ),
  addExpectedWord: (studentId: number, trainingId: number, wordName: string) =>
    apiRequest<void>(`/api/admin/training/${studentId}/${trainingId}/expected-word`, {
      method: 'POST',
      body: jsonBody({ wordName }),
    }),
  deleteExpectedWord: (studentId: number, trainingId: number, wordId: number) =>
    apiRequest<void>(
      `/api/admin/training/${studentId}/${trainingId}/expected-word/${wordId}`,
      { method: 'DELETE' },
    ),
  generate: (studentId: number, trainingId: number) =>
    apiRequest<Record<string, unknown>>(
      `/api/admin/training/${studentId}/${trainingId}/generate`,
      { method: 'POST' },
    ),
}

export const testApi = {
  list: (studentId: number) =>
    apiRequest<TestListItem[]>(`/api/admin/test/${studentId}/list`),
  compare: (studentId: number, currentTestId: number, comparisonTestIds: number[]) => {
    const query = new URLSearchParams({ currentTestId: String(currentTestId) })
    comparisonTestIds.forEach((id) => query.append('comparisonTestIds', String(id)))
    return apiRequest<TestComparison>(`/api/admin/test/${studentId}/compare?${query}`)
  },
}

export const reportApi = {
  create: (studentId: number, startDate: string, endDate: string, teacherMemo: string) =>
    apiRequest<{ reportId: number }>('/api/admin/report', {
      method: 'POST',
      body: jsonBody({ studentId, startDate, endDate, teacherMemo }),
    }),
  get: (reportId: number) => apiRequest<Report>(`/api/admin/report/${reportId}`),
  createShare: (reportId: number) =>
    apiRequest<ReportShare>(`/api/admin/report/${reportId}/shares`, { method: 'POST' }),
  shares: (reportId: number) =>
    apiRequest<ReportShare[]>(`/api/admin/report/${reportId}/shares`),
  feedbacks: (unreadOnly = false) =>
    apiRequest<Array<{
      feedbackId: number
      reportId: number
      studentId: number
      studentName: string
      content: string
      createdAt: string
      readAt: string | null
    }>>(`/api/admin/report/feedbacks?unreadOnly=${unreadOnly}`),
  markFeedbackRead: (feedbackId: number) =>
    apiRequest<void>(`/api/admin/report/feedbacks/${feedbackId}/read`, { method: 'PATCH' }),
}
