import type { TeacherProfile } from '../model'
import type { TeacherProfileUpdateInput } from '../profileValidation'

export interface TeacherRepository {
  readonly getInfo: () => Promise<TeacherProfile>
  readonly updateProfile: (input: TeacherProfileUpdateInput) => Promise<TeacherProfile>
  readonly updateProfileImage: (image: File) => Promise<TeacherProfile>
}
