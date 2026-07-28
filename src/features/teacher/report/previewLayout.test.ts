import { describe, expect, it } from 'vitest'
import { resolveReportPreviewLayout } from './previewLayout'

describe('resolveReportPreviewLayout', () => {
  it('모바일 폭에서는 보고서를 축소하지 않고 유동 레이아웃을 사용한다', () => {
    expect(resolveReportPreviewLayout(320)).toEqual({ mobile: true, scale: 1 })
    expect(resolveReportPreviewLayout(720)).toEqual({ mobile: true, scale: 1 })
  })

  it('넓은 화면에서는 padding을 제외한 폭에 맞춰 축소한다', () => {
    expect(resolveReportPreviewLayout(768)).toEqual({ mobile: false, scale: 0.8 })
    expect(resolveReportPreviewLayout(1200)).toEqual({ mobile: false, scale: 1 })
  })

  it('잘못된 음수 폭도 안전하게 모바일 레이아웃으로 처리한다', () => {
    expect(resolveReportPreviewLayout(-1)).toEqual({ mobile: true, scale: 1 })
  })
})
