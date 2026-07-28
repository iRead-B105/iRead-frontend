function secondsFromMilliseconds(milliseconds: number): number {
  return Number((milliseconds / 1_000).toFixed(2))
}

export function formatGazeDuration(milliseconds: number): string {
  const totalSeconds = secondsFromMilliseconds(milliseconds)
  if (totalSeconds < 60) return `${totalSeconds}초`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Number((totalSeconds - minutes * 60).toFixed(2))
  return seconds === 0 ? `${minutes}분` : `${minutes}분 ${seconds}초`
}

export function formatGazeAverage(milliseconds: number | null): string {
  return milliseconds === null ? '-' : `${secondsFromMilliseconds(milliseconds)}초`
}

export function formatGazeCount(count: number): string {
  return `${count}회`
}
