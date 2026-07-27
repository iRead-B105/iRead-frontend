import { studentFixtures, type StudentFixtureRecord } from '../fixtures'
import { normalizeStudentListQuery } from '../query'
import { ApiError } from '@/lib/api'
import type {
  StudentCreateInput,
  StudentDetail,
  StudentListItem,
  StudentMutationCommand,
  StudentUpdateInput,
} from '../model'
import type {
  StudentRepository,
  StudentRequestOptions,
} from './studentRepository'

function startOfDay(value: Date): Date {
  const result = new Date(value)
  result.setHours(0, 0, 0, 0)
  return result
}

function isWithinRecentDays(date: string | null, days: 7 | 30, today: Date): boolean {
  if (!date) return false
  const learnedAt = new Date(`${date}T00:00:00`)
  const elapsedDays = Math.floor(
    (startOfDay(today).getTime() - learnedAt.getTime()) / 86_400_000,
  )
  return elapsedDays >= 0 && elapsedDays < days
}

function matchesKeyword(student: StudentFixtureRecord, keyword?: string): boolean {
  if (!keyword) return true
  const normalized = keyword.toLocaleLowerCase()
  return (
    student.name.toLocaleLowerCase().includes(normalized) ||
    student.school.toLocaleLowerCase().includes(normalized)
  )
}

function toListItem(student: StudentFixtureRecord): StudentListItem {
  const { scheduledToday: _scheduledToday, ...item } = student
  return { ...item }
}

function throwIfAborted(options?: StudentRequestOptions): void {
  options?.signal?.throwIfAborted()
}

export class MockStudentRepository implements StudentRepository {
  private readonly students: StudentFixtureRecord[]
  private readonly details = new Map<number, StudentDetail>()

  constructor(
    students: readonly StudentFixtureRecord[] = studentFixtures,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.students = students.map((student) => ({ ...student }))
    for (const student of this.students) {
      const birthdayYear = this.now().getFullYear() - student.age
      this.details.set(student.studentId, {
        studentId: student.studentId,
        name: student.name,
        birthday: `${birthdayYear}-03-15`,
        gender: student.studentId % 2 === 0 ? 'Girl' : 'Boy',
        school: student.school,
        guardian: `${student.name.slice(0, 1)}보호자`,
        guardianContact: `010-0000-${String(student.studentId).padStart(4, '0')}`,
        guardianEmail: null,
        address: null,
        createdAt: `${birthdayYear + 6}-03-01T09:00:00+09:00`,
        imageUrl: student.imageUrl,
        teacherMemo: null,
      })
    }
  }

  async list(query = {}, options?: StudentRequestOptions) {
    throwIfAborted(options)
    const normalized = normalizeStudentListQuery(query)
    const filtered = [...this.students]
      .sort((left, right) => left.studentId - right.studentId)
      .filter((student) => matchesKeyword(student, normalized.keyword))
      .filter((student) => normalized.age === undefined || student.age === normalized.age)
      .filter(
        (student) =>
          normalized.recentDays === undefined ||
          isWithinRecentDays(student.recentLearningDate, normalized.recentDays, this.now()),
      )
    const start = normalized.page * normalized.size
    const totalElements = filtered.length

    return {
      students: filtered.slice(start, start + normalized.size).map(toListItem),
      page: normalized.page,
      size: normalized.size,
      totalElements,
      totalPages: Math.ceil(totalElements / normalized.size),
    }
  }

  async getSummary(options?: StudentRequestOptions) {
    throwIfAborted(options)
    return {
      totalStudents: this.students.length,
      scheduledTodayCount: this.students.filter((student) => student.scheduledToday).length,
    }
  }

  async getDetail(studentId: number, options?: StudentRequestOptions) {
    throwIfAborted(options)
    const detail = this.details.get(studentId)
    if (!detail) {
      throw new ApiError({
        status: 404,
        code: 'STUDENT_NOT_FOUND',
        message: '아동을 찾을 수 없습니다.',
      })
    }
    return { ...detail }
  }

  async create(command: StudentMutationCommand<StudentCreateInput>) {
    const studentId =
      this.students.reduce((maximum, student) => Math.max(maximum, student.studentId), 0) + 1
    const detail = this.createDetail(studentId, command.input, command.image)
    this.details.set(studentId, detail)
    this.students.push({
      studentId,
      name: detail.name,
      school: detail.school,
      age: this.ageFromBirthday(detail.birthday),
      imageUrl: detail.imageUrl,
      recentTraining: null,
      recentLearningDate: null,
      weeklyScheduledCount: 0,
      weeklyCompletedCount: 0,
      weeklyParticipationRate: null,
      totalLearningMinutes: 0,
      scheduledToday: false,
    })
    return studentId
  }

  async update(
    studentId: number,
    command: StudentMutationCommand<StudentUpdateInput>,
  ): Promise<void> {
    const current = await this.getDetail(studentId)
    const imageUrl = command.image
      ? this.mockImageUrl(studentId, command.image)
      : current.imageUrl
    const detail: StudentDetail = {
      ...current,
      ...command.input,
      imageUrl,
    }
    this.details.set(studentId, detail)

    const index = this.students.findIndex((student) => student.studentId === studentId)
    if (index >= 0) {
      this.students[index] = {
        ...this.students[index]!,
        name: detail.name,
        school: detail.school,
        age: this.ageFromBirthday(detail.birthday),
        imageUrl: detail.imageUrl,
      }
    }
  }

  async remove(studentId: number): Promise<void> {
    if (!this.details.has(studentId)) {
      throw new ApiError({
        status: 404,
        code: 'STUDENT_NOT_FOUND',
        message: '아동을 찾을 수 없습니다.',
      })
    }
    this.details.delete(studentId)
    const index = this.students.findIndex((student) => student.studentId === studentId)
    if (index >= 0) this.students.splice(index, 1)
  }

  private createDetail(
    studentId: number,
    input: StudentCreateInput,
    image?: File,
  ): StudentDetail {
    return {
      studentId,
      ...input,
      guardianEmail: input.guardianEmail ?? null,
      address: input.address ?? null,
      createdAt: this.now().toISOString(),
      imageUrl: image ? this.mockImageUrl(studentId, image) : null,
      teacherMemo: null,
    }
  }

  private mockImageUrl(studentId: number, image: File): string {
    return `/mock/student-images/${studentId}/${encodeURIComponent(image.name)}`
  }

  private ageFromBirthday(birthday: string): number {
    const today = this.now()
    const [year, month, day] = birthday.split('-').map(Number)
    let age = today.getFullYear() - (year ?? today.getFullYear())
    if (
      today.getMonth() + 1 < (month ?? 1) ||
      (today.getMonth() + 1 === (month ?? 1) && today.getDate() < (day ?? 1))
    ) {
      age -= 1
    }
    return Math.max(0, age)
  }
}
