export const chartColors = {
  blue: '#1d9bf0',
  green: '#00ba7c',
  amber: '#f59e0b',
  red: '#f4212e',
  ink: '#0f1419',
  secondary: '#536471',
  muted: '#8899a6',
  grid: '#eff3f4',
  border: '#cfd9de',
  white: '#ffffff',
} as const

export const twitterChartTheme = {
  color: [
    chartColors.blue,
    chartColors.green,
    chartColors.amber,
    chartColors.red,
    chartColors.muted,
  ],
  backgroundColor: 'transparent',
  textStyle: {
    color: chartColors.secondary,
    fontFamily: 'Pretendard Variable, Pretendard, sans-serif',
    fontSize: 11,
  },
  legend: {
    top: 4,
    itemWidth: 12,
    itemHeight: 6,
    itemGap: 16,
    icon: 'roundRect',
    textStyle: {
      color: chartColors.secondary,
      fontFamily: 'Pretendard Variable, Pretendard, sans-serif',
      fontSize: 11,
      fontWeight: 600,
    },
  },
  tooltip: {
    backgroundColor: chartColors.white,
    borderColor: chartColors.border,
    borderWidth: 1,
    padding: [9, 11],
    textStyle: {
      color: chartColors.ink,
      fontFamily: 'Pretendard Variable, Pretendard, sans-serif',
      fontSize: 12,
      fontWeight: 500,
    },
    extraCssText:
      'border-radius:10px;box-shadow:0 8px 24px rgba(15,20,25,.10);line-height:1.5;',
    axisPointer: {
      lineStyle: { color: chartColors.muted, width: 1 },
      shadowStyle: { color: 'rgba(29,155,240,.08)' },
    },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: chartColors.border } },
    axisTick: { show: false },
    axisLabel: {
      color: chartColors.secondary,
      fontFamily: 'Pretendard Variable, Pretendard, sans-serif',
      fontSize: 11,
      fontWeight: 500,
    },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: chartColors.secondary,
      fontFamily: 'Pretendard Variable, Pretendard, sans-serif',
      fontSize: 11,
      fontWeight: 500,
    },
    splitLine: {
      show: true,
      lineStyle: { color: chartColors.grid, width: 1 },
    },
  },
  line: {
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: { width: 2.5 },
    itemStyle: {
      borderColor: chartColors.white,
      borderWidth: 2,
    },
    emphasis: {
      focus: 'series',
      scale: 1.15,
    },
  },
  bar: {
    barMaxWidth: 32,
    itemStyle: {
      borderRadius: [5, 5, 0, 0],
    },
    emphasis: {
      focus: 'series',
    },
  },
  animationDuration: 180,
  animationDurationUpdate: 180,
  animationEasing: 'cubicOut',
  animationEasingUpdate: 'cubicOut',
}
