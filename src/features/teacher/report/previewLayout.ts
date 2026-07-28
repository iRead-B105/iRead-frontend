export interface ReportPreviewLayout {
  readonly mobile: boolean
  readonly scale: number
}

export function resolveReportPreviewLayout(
  containerWidth: number,
  reportWidth = 900,
  horizontalPadding = 48,
  mobileBreakpoint = 720,
): ReportPreviewLayout {
  const safeContainerWidth = Math.max(0, containerWidth)
  if (safeContainerWidth <= mobileBreakpoint) {
    return { mobile: true, scale: 1 }
  }

  const availableWidth = Math.max(0, safeContainerWidth - horizontalPadding)
  return {
    mobile: false,
    scale: Math.min(1, availableWidth / reportWidth),
  }
}
