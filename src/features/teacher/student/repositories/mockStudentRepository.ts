import { studentFixtures, type StudentFixtureRecord } from '../fixtures'
import { createLearningInsightsFixture } from '../learningInsightsFixtures'
import { normalizeStudentListQuery } from '../query'
import { ApiError } from '@/lib/api'
import type {
  StudentAccuracyPoint,
  StudentCreateInput,
  StudentDetail,
  StudentLearningEvent,
  StudentLearningEventDetail,
  StudentLearningSummary,
  StudentListItem,
  StudentMutationCommand,
  StudentTrainingHistoryItem,
  StudentTrainingHistoryPeriod,
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
  private readonly learningSummaries = new Map<number, StudentLearningSummary>()
  private readonly learningEvents = new Map<number, StudentLearningEvent[]>()
  private readonly learningEventDetails = new Map<
    number,
    Map<number, StudentLearningEventDetail>
  >()
  private readonly accuracyTrends = new Map<number, StudentAccuracyPoint[]>()
  private readonly trainingHistories = new Map<number, StudentTrainingHistoryItem[]>()

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
      this.learningSummaries.set(student.studentId, this.createLearningSummary(student))
      const insights = createLearningInsightsFixture(student)
      this.learningEvents.set(student.studentId, insights.events.map(this.cloneEvent))
      this.learningEventDetails.set(
        student.studentId,
        new Map(
          insights.eventDetails.map((event) => [
            event.eventId,
            this.cloneEventDetail(event),
          ]),
        ),
      )
      this.accuracyTrends.set(
        student.studentId,
        insights.accuracy.map((point) => ({ ...point })),
      )
      this.trainingHistories.set(
        student.studentId,
        insights.trainingHistory.map((item) => ({ ...item })),
      )
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
    this.learningSummaries.set(studentId, {
      studentId,
      currentStage: null,
      lastLearningAt: null,
      attentionRequiredCount: 0,
      attentionReasons: ['NO_HISTORY'],
    })
    this.learningEvents.set(studentId, [])
    this.learningEventDetails.set(studentId, new Map())
    this.accuracyTrends.set(studentId, [])
    this.trainingHistories.set(studentId, [])
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
    this.learningSummaries.delete(studentId)
    this.learningEvents.delete(studentId)
    this.learningEventDetails.delete(studentId)
    this.accuracyTrends.delete(studentId)
    this.trainingHistories.delete(studentId)
    const index = this.students.findIndex((student) => student.studentId === studentId)
    if (index >= 0) this.students.splice(index, 1)
  }

  async getLearningSummary(studentId: number, options?: StudentRequestOptions) {
    throwIfAborted(options)
    const summary = this.learningSummaries.get(studentId)
    if (!summary) {
      throw new ApiError({
        status: 404,
        code: 'STUDENT_NOT_FOUND',
        message: '아동을 찾을 수 없습니다.',
      })
    }
    return {
      ...summary,
      attentionReasons: [...summary.attentionReasons],
    }
  }

  async listLearningEvents(
    studentId: number,
    query: { readonly limit?: number } = {},
    options?: StudentRequestOptions,
  ) {
    throwIfAborted(options)
    await this.getDetail(studentId, options)
    const events = [...(this.learningEvents.get(studentId) ?? [])].sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    )
    const limit =
      query.limit === undefined ? events.length : Math.max(0, Math.trunc(query.limit))
    return events.slice(0, limit).map(this.cloneEvent)
  }

  async getLearningEvent(
    studentId: number,
    eventId: number,
    options?: StudentRequestOptions,
  ) {
    throwIfAborted(options)
    await this.getDetail(studentId, options)
    const event = this.learningEventDetails.get(studentId)?.get(eventId)
    if (!event) {
      throw new ApiError({
        status: 404,
        code: 'LEARNING_EVENT_NOT_FOUND',
        message: '학습 이벤트를 찾을 수 없습니다.',
      })
    }
    return this.cloneEventDetail(event)
  }

  async getAccuracyTrend(studentId: number, options?: StudentRequestOptions) {
    throwIfAborted(options)
    await this.getDetail(studentId, options)
    return {
      dailyAccuracy: [...(this.accuracyTrends.get(studentId) ?? [])]
        .sort((left, right) => left.date.localeCompare(right.date))
        .map((point) => ({ ...point })),
    }
  }

  async getTrainingHistory(
    studentId: number,
    period: StudentTrainingHistoryPeriod,
    options?: StudentRequestOptions,
  ) {
    throwIfAborted(options)
    await this.getDetail(studentId, options)
    const cutoff = startOfDay(this.now())
    if (period === '30d') {
      cutoff.setDate(cutoff.getDate() - 29)
    } else {
      cutoff.setMonth(cutoff.getMonth() - 3)
    }
    return {
      learningHistory: [...(this.trainingHistories.get(studentId) ?? [])]
        .filter((item) => new Date(`${item.date}T00:00:00`).getTime() >= cutoff.getTime())
        .sort((left, right) => right.date.localeCompare(left.date))
        .map((item) => ({ ...item })),
    }
  }

  async updateTeacherMemo(studentId: number, teacherMemo: string | null): Promise<void> {
    const current = await this.getDetail(studentId)
    this.details.set(studentId, {
      ...current,
      teacherMemo,
    })
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

  private createLearningSummary(student: StudentFixtureRecord): StudentLearningSummary {
    if (!student.recentLearningDate) {
      return {
        studentId: student.studentId,
        currentStage: null,
        lastLearningAt: null,
        attentionRequiredCount: 0,
        attentionReasons: ['NO_HISTORY'],
      }
    }

    const reasons =
      student.studentId === 5
        ? (['LOW_ACCURACY'] as const)
        : student.studentId === 6
          ? (['INACTIVE'] as const)
          : student.studentId === 9
            ? (['GAZE_ANALYSIS_FAILED'] as const)
            : student.studentId === 12
              ? (['LOW_ACCURACY', 'INACTIVE'] as const)
              : []

    return {
      studentId: student.studentId,
      currentStage: student.recentTraining,
      lastLearningAt: `${student.recentLearningDate}T16:00:00+09:00`,
      attentionRequiredCount: reasons.length,
      attentionReasons: reasons,
    }
  }

  private cloneEvent(event: StudentLearningEvent): StudentLearningEvent {
    return {
      ...event,
      attentionReasons: [...event.attentionReasons],
    }
  }

  private cloneEventDetail(event: StudentLearningEventDetail): StudentLearningEventDetail {
    return {
      ...event,
      attentionReasons: [...event.attentionReasons],
      problemSegments: [...event.problemSegments],
    }
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
