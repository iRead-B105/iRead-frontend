import { isApiError } from '@/lib/api'

const GAZE_ANALYSIS_NOT_FOUND_MESSAGE = '시선 분석 결과를 찾을 수 없습니다.'

export function isGazeAnalysisNotFoundError(error: unknown): boolean {
  if (!isApiError(error) || error.status !== 404) return false
  if (error.code === 'GAZE_ANALYSIS_NOT_FOUND') return true
  return error.code === 'RESOURCE_NOT_FOUND' && error.message === GAZE_ANALYSIS_NOT_FOUND_MESSAGE
}
