import { ApiTestRepository } from './apiTestRepository'
import type { TestRepository } from './testRepository'

export * from './apiTestRepository'
export * from './testRepository'

export const testRepository: TestRepository = new ApiTestRepository()
