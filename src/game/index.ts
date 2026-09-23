/** Public Phase 2 game API. The Phase 1 sample remains available under aliases. */
export { SAMPLE_BOARD, SAMPLE_LEVEL_TITLE } from './sampleBoard'
export {
	canPour as sampleCanPour,
	cloneBoard as cloneSampleBoard,
	createInitialSampleBoard,
	freeCapacity as sampleFreeCapacity,
	getTopColor as sampleTopColor,
	getTopContiguousCount,
	isEmptyTube,
	tryPour as trySamplePour,
} from './sampleLogic'
export {
	applyMove,
	canPour,
	getFreeCapacity,
	getLegalMoves,
	getPourAmount,
	getTopColor,
	getTopGroupSize,
	isSolved,
	serializeBoard,
	deserializeBoard,
	cloneBoard,
	isCompleteTube,
	isValidBoard,
} from './core'
export { getHint, solve } from './solver'
export { generateLevel, generateLevelDetailed, isStructurallyValidLevel } from './generator'
export { runBulkGenerationQa } from './generator'
export { TUBE_CAPACITY } from './types'
export type {
	Board,
	ColorId,
	Move,
	PourResult,
	Tube,
} from './types'
export type { SolverOptions, SolverResult } from './solver'
export type { GeneratedLevel, GenerationAttemptReport, GenerationConfig } from './generator'
export type { BulkQaReport } from './generator'
