import type { AdminStudentSummary } from '../model/adminOverview'
import type { SessionTeacher } from '@/stores/session'

export interface TeacherAdminRepository {
  readonly getTeacherInfo: () => Promise<SessionTeacher>
  readonly listStudents: () => Promise<readonly AdminStudentSummary[]>
  readonly logout: () => Promise<void>
}

export class AdminContractBlockedError extends Error {
  override readonly name = 'AdminContractBlockedError'

  constructor(
    readonly contractId: 'ADMIN-STUDENT-LIST',
    message: string,
  ) {
    super(message)
  }
}
