import { defineStore } from 'pinia'

export type TeacherGender = 'MALE' | 'FEMALE'

export interface SessionTeacher {
  readonly name: string
  readonly email: string
  readonly organization?: string
  readonly gender?: TeacherGender
  readonly profileImageUrl?: string | null
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    authenticated: false,
    teacher: null as SessionTeacher | null,
  }),
  actions: {
    initialize(teacher: SessionTeacher) {
      this.teacher = teacher
      this.authenticated = true
    },
    reset() {
      this.teacher = null
      this.authenticated = false
    },
  },
})
