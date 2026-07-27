import { mockTeacherProfile } from '../fixtures'
import type { TeacherRepository } from './teacherRepository'

export class MockTeacherRepository implements TeacherRepository {
  async getInfo() {
    return { ...mockTeacherProfile }
  }
}
