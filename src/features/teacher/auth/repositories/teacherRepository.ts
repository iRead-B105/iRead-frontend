import type { TeacherProfile } from '../model'

export interface TeacherRepository {
  readonly getInfo: () => Promise<TeacherProfile>
}
