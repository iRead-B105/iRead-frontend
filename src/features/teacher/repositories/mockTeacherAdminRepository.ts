import { studentListFixture, teacherInfoFixture } from '../fixtures/adminOverview'
import { toAdminStudentSummary, toSessionTeacher } from '../model/adminOverview'
import type { TeacherAdminRepository } from './teacherAdminRepository'

export class MockTeacherAdminRepository implements TeacherAdminRepository {
  async getTeacherInfo() {
    return toSessionTeacher({ ...teacherInfoFixture })
  }

  async listStudents() {
    return studentListFixture.students.map((student) =>
      toAdminStudentSummary({ ...student }, student.fixtureId),
    )
  }

  async logout() {}
}
