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
}
