import { describe, expect, it } from 'vitest'
import { MockTeacherRepository } from '@/features/teacher/auth'
import { MockReportRepository } from '@/features/teacher/report'
import { MockStudentRepository } from '@/features/teacher/student'
import { MockTestRepository } from '@/features/teacher/test'
import { MockTrainingRepository } from '@/features/teacher/training'
import { createMockDemoDate, MOCK_DEMO_REFERENCE_TIME, mockDemoScenario } from './mockDemoScenario'

describe('교수자 mock 데모 시나리오', () => {
  it('고정 기준 시각을 매 호출마다 새 Date로 제공한다', () => {
    const first = createMockDemoDate()
    const second = createMockDemoDate()

    expect(first.toISOString()).toBe(new Date(MOCK_DEMO_REFERENCE_TIME).toISOString())
    expect(second).not.toBe(first)
    expect(second.getTime()).toBe(first.getTime())
  })

  it('교수자와 보호자 fixture에 실제 연락처를 포함하지 않는다', async () => {
    const teacherRepository = new MockTeacherRepository()
    const studentRepository = new MockStudentRepository()
    const teacher = await teacherRepository.getInfo()
    const students = await studentRepository.list({ size: 100 })

    expect(teacher.email.endsWith('@example.com')).toBe(true)
    expect(students.students).toHaveLength(12)

    for (const student of students.students) {
      const detail = await studentRepository.getDetail(student.studentId)
      expect(detail.guardianContact).toMatch(/^010-0000-\d{4}$/)
      expect(detail.guardianEmail).toBeNull()
      expect(detail.address).toBeNull()
    }
  })

  it('대표 학습자의 개요부터 커리큘럼·이력·검사·보고서를 연결한다', async () => {
    const teacherRepository = new MockTeacherRepository()
    const studentRepository = new MockStudentRepository()
    const trainingRepository = new MockTrainingRepository()
    const testRepository = new MockTestRepository()
    const reportRepository = new MockReportRepository({ delayMs: 0 })
    const { student, curriculum, training, test, report, teacher } = mockDemoScenario

    await expect(teacherRepository.getInfo()).resolves.toMatchObject({
      email: teacher.email,
    })

    const searchResult = await studentRepository.list({ keyword: student.primaryName })
    expect(searchResult.students.map((item) => item.studentId)).toEqual([student.primaryId])
    const recentStudents = await studentRepository.list({ recentDays: 7, size: 100 })
    expect(recentStudents.students.map((item) => item.studentId)).toEqual([1, 2, 7, 8, 9])
    await expect(studentRepository.getLearningSummary(student.primaryId)).resolves.toMatchObject({
      studentId: student.primaryId,
    })
    await expect(
      studentRepository.listLearningEvents(student.primaryId, { limit: 3 }),
    ).resolves.toHaveLength(3)

    await expect(trainingRepository.getCurrentCurriculum(student.primaryId)).resolves.toMatchObject(
      {
        curriculumId: curriculum.currentId,
      },
    )
    await expect(
      trainingRepository.getCurriculumLogs(student.primaryId, '30d'),
    ).resolves.toHaveLength(2)
    await expect(
      trainingRepository.getGazeAnalysis(student.primaryId, training.availableGazeId),
    ).resolves.toMatchObject({ status: 'AVAILABLE' })
    await expect(
      trainingRepository.getGazeAnalysis(student.primaryId, training.noDataGazeId),
    ).resolves.toEqual({ status: 'NO_DATA', analysis: null })
    await expect(
      trainingRepository.getGazeAnalysis(student.primaryId, training.failedGazeId),
    ).resolves.toEqual({ status: 'FAILED', analysis: null })

    const tests = await testRepository.getTests(student.primaryId)
    expect(tests.map((item) => item.testId)).toContain(test.currentId)
    await expect(
      testRepository.compareTests(student.primaryId, test.currentId, [test.comparisonId]),
    ).resolves.toMatchObject({
      currentTest: { testId: test.currentId },
      comparisonTests: [{ testId: test.comparisonId }],
    })
    await expect(
      testRepository.getGazeAnalysis(student.primaryId, test.failedGazeId),
    ).resolves.toEqual({ status: 'FAILED', analysis: null })

    const reports = await reportRepository.listByStudent(student.primaryId)
    expect(reports.map((item) => item.reportId)).toContain(report.primaryId)
    await expect(reportRepository.get(report.primaryId)).resolves.toMatchObject({
      reportId: report.primaryId,
      studentId: student.primaryId,
      snapshot: {
        gazeTrend: {
          training: { status: 'AVAILABLE' },
        },
      },
    })
    await expect(reportRepository.get(report.noDataAndFailedId)).resolves.toMatchObject({
      snapshot: {
        gazeTrend: {
          training: { status: 'NO_DATA' },
          test: { status: 'FAILED' },
        },
      },
    })
  })

  it('빈 상태 학습자를 제공하고 새 Repository에서 mutation을 초기화한다', async () => {
    const { student, curriculum, report } = mockDemoScenario
    const mutableTeacherRepository = new MockTeacherRepository()
    const mutableStudentRepository = new MockStudentRepository()
    const mutableTrainingRepository = new MockTrainingRepository()
    const mutableReportRepository = new MockReportRepository({ delayMs: 0 })

    await expect(
      mutableTrainingRepository.getCurrentCurriculum(student.emptyStateId),
    ).resolves.toBeNull()
    await expect(
      mutableTrainingRepository.getCurriculumLogs(student.emptyStateId, '3m'),
    ).resolves.toEqual([])
    await expect(new MockTestRepository().getTests(student.emptyStateId)).resolves.toEqual([])
    await expect(mutableReportRepository.listByStudent(student.emptyStateId)).resolves.toEqual([])

    await mutableTeacherRepository.updateProfile({
      name: '변경된 교사',
      organization: null,
      gender: null,
    })
    await mutableStudentRepository.updateTeacherMemo(student.primaryId, '새로고침 전 임시 메모')
    await mutableTrainingRepository.updateCurriculum(student.primaryId, curriculum.currentId, {
      trainingTemplateIds: [14, 13, 12, 11, 14],
    })
    const createdReport = await mutableReportRepository.create({
      studentId: student.primaryId,
      startDate: '2026-07-03',
      endDate: '2026-07-24',
    })
    await mutableReportRepository.updateTeacherMemo(createdReport.reportId, '새로고침 전 임시 의견')
    expect(createdReport.createdAt).toBe(createMockDemoDate().toISOString())

    await expect(mutableTeacherRepository.getInfo()).resolves.toMatchObject({
      name: '변경된 교사',
    })
    await expect(mutableStudentRepository.getDetail(student.primaryId)).resolves.toMatchObject({
      teacherMemo: '새로고침 전 임시 메모',
    })
    await expect(mutableReportRepository.get(createdReport.reportId)).resolves.toMatchObject({
      teacherMemo: '새로고침 전 임시 의견',
    })

    await expect(new MockTeacherRepository().getInfo()).resolves.not.toMatchObject({
      name: '변경된 교사',
    })
    await expect(new MockStudentRepository().getDetail(student.primaryId)).resolves.toMatchObject({
      teacherMemo: null,
    })
    await expect(
      new MockTrainingRepository().getCurrentCurriculum(student.primaryId),
    ).resolves.toMatchObject({
      trainings: [
        { trainingTemplateId: 12 },
        { trainingTemplateId: 12 },
        { trainingTemplateId: 13 },
      ],
    })
    await expect(
      new MockReportRepository({ delayMs: 0 }).get(createdReport.reportId),
    ).rejects.toMatchObject({
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
    })
    await expect(
      new MockReportRepository({ delayMs: 0 }).get(report.primaryId),
    ).resolves.toMatchObject({
      teacherMemo: '선택 기간 동안 완료한 학습 기록을 바탕으로 다음 훈련 계획을 조정할 예정입니다.',
    })
  })
})
