/**
 * Barrel for temporary sample game helpers.
 * Codex can replace sampleLogic / sampleBoard with game-core exports later.
 */
export { SAMPLE_BOARD, SAMPLE_LEVEL_TITLE } from './sampleBoard'
export {
	canPour,
	cloneBoard,
	createInitialSampleBoard,
	freeCapacity,
	getTopColor,
	getTopContiguousCount,
	isEmptyTube,
	tryPour,
} from './sampleLogic'
export { TUBE_CAPACITY } from './types'
export type { Board, ColorId, PourResult, Tube } from './types'
