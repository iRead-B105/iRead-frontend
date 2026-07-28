import { mockTeacherProfile } from '../fixtures'
import type { TeacherProfile } from '../model'
import type { TeacherProfileUpdateInput } from '../profileValidation'
import type { TeacherRepository } from './teacherRepository'

export class MockTeacherRepository implements TeacherRepository {
  private profile: TeacherProfile

  constructor(profile: TeacherProfile = mockTeacherProfile) {
    this.profile = { ...profile }
  }

  async getInfo() {
    return { ...this.profile }
  }

  async updateProfile(input: TeacherProfileUpdateInput) {
    this.profile = {
      ...this.profile,
      ...input,
    }
    return { ...this.profile }
  }

  async updateProfileImage(image: File) {
    this.profile = {
      ...this.profile,
      profileImageUrl: `/images/mock/${encodeURIComponent(image.name)}`,
    }
    return { ...this.profile }
  }
}
