import { apiRequest, isAbortError } from '@/lib/api'

export interface ReferenceDateRequestOptions {
  readonly signal?: AbortSignal
}

export type ReferenceDateResolver = (
  studentId: number,
  options?: ReferenceDateRequestOptions,
) => Promise<Date | null>

interface DemoLearningDateDto {
  readonly currentDate: string
}

function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T12:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const resolveDemoReferenceDate: ReferenceDateResolver = async (studentId, options) => {
  if (!import.meta.env.DEV) return null
  try {
    const result = await apiRequest<DemoLearningDateDto>(
      `/api/admin/dev/students/${studentId}/date`,
      { signal: options?.signal },
    )
    return parseLocalDate(result.currentDate)
  } catch (error) {
    if (isAbortError(error)) throw error
    return null
  }
}

export async function resolveReferenceDate(
  studentId: number,
  now: () => Date,
  resolver: ReferenceDateResolver,
  options?: ReferenceDateRequestOptions,
): Promise<Date> {
  return (await resolver(studentId, options)) ?? now()
}
