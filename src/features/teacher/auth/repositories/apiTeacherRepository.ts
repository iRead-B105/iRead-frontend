import { createTeacherApi, type TeacherApi } from '../api/teacherApi'
import type { TeacherRepository } from './teacherRepository'

export class ApiTeacherRepository implements TeacherRepository {
  constructor(private readonly api: TeacherApi = createTeacherApi()) {}

  getInfo() {
    return this.api.getInfo()
  }

  updateProfile(input: Parameters<TeacherRepository['updateProfile']>[0]) {
    return this.api.updateProfile(input)
  }

  updateProfileImage(image: File) {
    return this.api.updateProfileImage(image)
  }
}
