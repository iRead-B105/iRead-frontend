import { appEnvironment } from './runtimeEnv'

export const authSource = appEnvironment.authSource
export const isMockAuthSource = !import.meta.env.PROD && authSource === 'mock'
