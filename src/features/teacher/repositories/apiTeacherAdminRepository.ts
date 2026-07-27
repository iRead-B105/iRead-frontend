import { createAdminOverviewApi, type AdminOverviewApi } from '../api/adminOverviewApi'
import { toAdminStudentSummary, toSessionTeacher } from '../model/adminOverview'
import type { TeacherAdminRepository } from './teacherAdminRepository'

export class ApiTeacherAdminRepository implements TeacherAdminRepository {
  constructor(private readonly api: AdminOverviewApi = createAdminOverviewApi()) {}

  async getTeacherInfo() {
    return toSessionTeacher(await this.api.getTeacherInfo())
  }

  async listStudents() {
    const { students } = await this.api.listStudents()

    // 확정 OpenAPI에 식별자가 없으므로 Backend 구현의 id를 임의로 읽지 않는다.
    return students.map((student) => toAdminStudentSummary(student, null))
  }

  async logout() {
    await this.api.logout()
  }
}
