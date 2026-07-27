import { resolveEnvironment } from './env'

export const appEnvironment = resolveEnvironment(import.meta.env, {
  isProduction: import.meta.env.PROD,
})
