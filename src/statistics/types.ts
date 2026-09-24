import type { CampaignDifficultyBand } from '../campaign/config'

/**
 * Cumulative gameplay statistics.
 *
 * Semantics:
 * - levelsCompleted / highestLevelCompleted / completedByDifficulty /
 *   levelsCompletedWithout* count UNIQUE campaign levels (first qualifying
 *   completion only).
 * - totalPours / hintsUsed / undosUsed / restartsUsed are lifetime counters
 *   incremented on every qualifying action (including replays).
 * - Completion of a level updates unique counters at most once per level id.
 */
export interface GameStatistics {
	levelsCompleted: number
	totalPours: number
	hintsUsed: number
	undosUsed: number
	restartsUsed: number
	levelsCompletedWithoutHint: number
	levelsCompletedWithoutUndo: number
	levelsCompletedWithoutRestart: number
	highestLevelCompleted: number
	completedByDifficulty: Record<CampaignDifficultyBand, number>
	/** Level numbers already counted toward unique completion stats. */
	completedLevelNumbers: number[]
	/** Levels counted toward without-hint unique stats. */
	withoutHintLevelNumbers: number[]
	withoutUndoLevelNumbers: number[]
	withoutRestartLevelNumbers: number[]
}

/** Flags for the current open attempt of a level. */
export interface AttemptFlags {
	usedHint: boolean
	usedUndo: boolean
	usedRestart: boolean
}

export function createEmptyStatistics(): GameStatistics {
	return {
		levelsCompleted: 0,
		totalPours: 0,
		hintsUsed: 0,
		undosUsed: 0,
		restartsUsed: 0,
		levelsCompletedWithoutHint: 0,
		levelsCompletedWithoutUndo: 0,
		levelsCompletedWithoutRestart: 0,
		highestLevelCompleted: 0,
		completedByDifficulty: {
			BEGINNER: 0,
			EASY: 0,
			MEDIUM: 0,
			HARD: 0,
			EXPERT: 0,
		},
		completedLevelNumbers: [],
		withoutHintLevelNumbers: [],
		withoutUndoLevelNumbers: [],
		withoutRestartLevelNumbers: [],
	}
}

export function createFreshAttemptFlags(): AttemptFlags {
	return {
		usedHint: false,
		usedUndo: false,
		usedRestart: false,
	}
}

/**
 * Derive how many campaign levels are reliably completed from unlock state.
 * Completing N unlocks N+1 (capped at 100); campaignComplete means all 100.
 */
export function inferCompletedLevelCount(
	highestUnlockedLevel: number,
	campaignComplete: boolean,
): number {
	if (campaignComplete) return 100
	return Math.max(0, Math.min(100, highestUnlockedLevel - 1))
}
