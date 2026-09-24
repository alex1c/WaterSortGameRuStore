import type { Board } from '../game/types'
import type { AttemptFlags } from '../statistics'
import type { DailyDifficulty } from './config'
import type { LocalDateKey } from './date'

/** In-progress Daily session for one local calendar date. */
export interface PersistedDailySession {
	dateKey: LocalDateKey
	difficulty: DailyDifficulty
	seed: string
	initialBoard: Board
	currentBoard: Board
	moveHistory: Board[]
	moveCount: number
	attempt: AttemptFlags
	isSolved: boolean
}

/**
 * Daily persistence blob.
 *
 * completedDateKeys: unique local dates completed at least once.
 * currentStreak / bestStreak: derived from completion history; best never decreases.
 * session: today's in-progress board only (discarded if dateKey ≠ today).
 */
export interface PersistedDailyState {
	completedDateKeys: LocalDateKey[]
	currentStreak: number
	bestStreak: number
	lastCompletedDateKey: LocalDateKey | null
	session: PersistedDailySession | null
}

export function createEmptyDailyState(): PersistedDailyState {
	return {
		completedDateKeys: [],
		currentStreak: 0,
		bestStreak: 0,
		lastCompletedDateKey: null,
		session: null,
	}
}
