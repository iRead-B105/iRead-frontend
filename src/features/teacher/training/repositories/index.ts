import { ApiTrainingRepository } from './apiTrainingRepository'
import type { TrainingRepository } from './trainingRepository'

export * from './apiTrainingRepository'
export * from './trainingRepository'

export const trainingRepository: TrainingRepository = new ApiTrainingRepository()
