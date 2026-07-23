// ESLint는 실행 전에 코드의 실수와 일관되지 않은 작성 방식을 찾아 주는 검사 도구입니다.
import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    // Vue와 TypeScript 계열 파일을 검사 대상으로 지정합니다.
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  // 빌드 결과와 테스트 보고서는 사람이 작성한 원본 코드가 아니므로 제외합니다.
  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  // Vue 필수 규칙과 TypeScript 권장 규칙을 적용합니다.
  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  // 빠른 추가 검사기 Oxlint의 별도 설정도 함께 반영합니다.
  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  // 코드 모양은 Prettier가 맡으므로 ESLint의 서식 규칙과 충돌하지 않게 합니다.
  skipFormatting,
)
