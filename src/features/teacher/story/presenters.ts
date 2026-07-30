import type {
  StoryGazeAnalysisStatus,
  StoryHistoryItem,
  StoryReadingStatus,
  StoryStatus,
} from './model'

export function storyStatusLabel(status: Exclude<StoryStatus, 'DELETED'>): string {
  return status === 'IN_PROGRESS' ? '이야기 생성 중' : '이야기 생성 완료'
}

export function storyReadingStatusLabel(story: StoryHistoryItem): string {
  const labels: Record<StoryReadingStatus, string> = {
    NOT_STARTED: '읽기 전',
    IN_PROGRESS: `읽는 중 (${story.readLineCount}/${story.totalLineCount})`,
    COMPLETED: '읽기 완료',
  }
  return labels[story.readingStatus]
}

export function storyGazeStatusLabel(status: StoryGazeAnalysisStatus): string {
  const labels: Record<StoryGazeAnalysisStatus, string> = {
    NOT_COLLECTED: '시선 미수집',
    RUNNING: '시선 분석 중',
    AVAILABLE: '시선 분석 완료',
    FAILED: '시선 분석 실패',
  }
  return labels[status]
}

export function formatStoryActivityAt(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}
