import type { Board } from '../game/types'
import type { PuzzleHelpState } from '../help'
import type { AttemptFlags } from '../statistics'
import type { FreePlayDifficulty } from './config'

/**
 * Persisted Free Play mid-puzzle snapshot (isolated from Campaign).
 * initialBoard stays the ORIGINAL generated board for seed identity.
 */
export interface PersistedFreePlaySession {
	difficulty: FreePlayDifficulty
	seed: string
	initialBoard: Board
	currentBoard: Board
	moveHistory: Board[]
	moveCount: number
	attempt: AttemptFlags
	isSolved: boolean
	help: PuzzleHelpState
}

export interface PersistedFreePlayState {
	/** Monotonic counter used to mint new Free Play seeds. */
	seedCounter: number
	session: PersistedFreePlaySession | null
}

export function createEmptyFreePlayState(): PersistedFreePlayState {
	return {
		seedCounter: 0,
		session: null,
	}
}
