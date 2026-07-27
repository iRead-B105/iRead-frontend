import { studentFixtures, type StudentFixtureRecord } from '../fixtures'
import { normalizeStudentListQuery } from '../query'
import type { StudentListItem } from '../model'
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
  constructor(
    private readonly students: readonly StudentFixtureRecord[] = studentFixtures,
    private readonly now: () => Date = () => new Date(),
  ) {}

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
}
