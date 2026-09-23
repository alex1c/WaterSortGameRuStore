/** Public Phase 2+ game engine API (pure TypeScript, no React). */
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
	moveChangesBoard,
} from './core'
export { getHint, solve } from './solver'
export {
	generateLevel,
	generateLevelDetailed,
	isStructurallyValidLevel,
	runBulkGenerationQa,
} from './generator'
export { TUBE_CAPACITY } from './types'
export type {
	Board,
	ColorId,
	Move,
	PourResult,
	Tube,
} from './types'
export type { SolverOptions, SolverResult } from './solver'
export type {
	GeneratedLevel,
	GenerationAttemptReport,
	GenerationConfig,
	BulkQaReport,
	DifficultyMetrics,
	DifficultyTier,
} from './generator'
