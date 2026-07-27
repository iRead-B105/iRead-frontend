import { apiRequest, jsonBody } from '@/lib/api'

export type TeacherGender = 'Male' | 'Female'
export type StudentGender = 'Boy' | 'Girl'

export interface TeacherInfo {
  id?: number
  email: string
  name: string
  organization: string
  gender: TeacherGender
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
  birthday: string
  gender: StudentGender
  school: string
  guardian: string
  guardianContact: string
  guardianEmail: string
  address: string
  imageUrl: string | null
  teacherMemo: string | null
}

export interface StudentPayload {
  name: string
  birthday: string
  gender: StudentGender
  school: string
  guardian: string
  guardianContact: string
  guardianEmail: string
  address: string
  imageUrl?: string | null
}

export interface CreateStudentResponse {
  studentId: number
}

export interface AccuracyTrend {
  date: string
  accuracy: number
}

export interface ReadingSpeedTrend {
  from: string
  to: string
  unit: 'WORDS_PER_MINUTE'
  voiceChangeRate: number | null
  gazeChangeRate: number | null
  points: Array<{
    date: string
    voiceSpeed: number | null
    gazeSpeed: number | null
    voiceWordCount: number | null
    gazeWordCount: number | null
    voiceDurationMs: number | null
    gazeDurationMs: number | null
    trainingCount: number
  }>
}

export interface TrainingHistory {
  trainingId: number
  date: string
  learningType: string
  startedAt: string | null
  finishedAt: string | null
  achievement: number | null
  questions: Array<{
    questionNumber: number
    question: string | null
    correct: boolean
    selectedAnswer: string | null
    correctAnswer: string | null
  }>
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

export const teacherApi = {
  getInfo: () => apiRequest<TeacherInfo>('/api/admin/teacher/info'),
}

export const studentApi = {
  list: () => apiRequest<StudentListItem[]>('/api/admin/student/list'),
  get: (studentId: number) => apiRequest<StudentDetail>(`/api/admin/student/${studentId}`),
  create: (payload: StudentPayload) =>
    apiRequest<CreateStudentResponse>('/api/admin/student', {
      method: 'POST',
      body: jsonBody(payload),
    }),
  update: (studentId: number, payload: StudentPayload) =>
    apiRequest<void>(`/api/admin/student/${studentId}`, {
      method: 'PATCH',
      body: jsonBody(payload),
    }),
  remove: (studentId: number) =>
    apiRequest<void>(`/api/admin/student/${studentId}`, { method: 'DELETE' }),
  accuracyTrend: (studentId: number) =>
    apiRequest<AccuracyTrend[]>(`/api/admin/student/${studentId}/accuracy-trend`),
  readingSpeedTrend: (studentId: number, from?: string, to?: string) => {
    const query = new URLSearchParams()
    if (from) query.set('from', from)
    if (to) query.set('to', to)
    const suffix = query.size ? `?${query}` : ''
    return apiRequest<ReadingSpeedTrend>(
      `/api/admin/student/${studentId}/reading-speed-trend${suffix}`,
    )
  },
  trainingHistory: (studentId: number) =>
    apiRequest<TrainingHistory[]>(`/api/admin/student/${studentId}/training-history`),
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
}
