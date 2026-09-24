import {
	getCampaignDifficultyBand,
	type CampaignDifficultyBand,
} from '../campaign/config'
import {
	createEmptyStatistics,
	inferCompletedLevelCount,
	type AttemptFlags,
	type GameStatistics,
} from './types'

const DIFFICULTIES: CampaignDifficultyBand[] = [
	'BEGINNER',
	'EASY',
	'MEDIUM',
	'HARD',
	'EXPERT',
]

/** Parse statistics; missing/invalid fields → empty defaults. */
export function parseGameStatistics(value: unknown): GameStatistics {
	const empty = createEmptyStatistics()
	if (!value || typeof value !== 'object') return empty
	const record = value as Record<string, unknown>
	const completedByDifficulty = { ...empty.completedByDifficulty }
	if (record.completedByDifficulty && typeof record.completedByDifficulty === 'object') {
		const raw = record.completedByDifficulty as Record<string, unknown>
		for (const key of DIFFICULTIES) {
			completedByDifficulty[key] = asNonNegInt(raw[key], 0)
		}
	}
	return {
		levelsCompleted: asNonNegInt(record.levelsCompleted, 0),
		totalPours: asNonNegInt(record.totalPours, 0),
		hintsUsed: asNonNegInt(record.hintsUsed, 0),
		undosUsed: asNonNegInt(record.undosUsed, 0),
		restartsUsed: asNonNegInt(record.restartsUsed, 0),
		levelsCompletedWithoutHint: asNonNegInt(record.levelsCompletedWithoutHint, 0),
		levelsCompletedWithoutUndo: asNonNegInt(record.levelsCompletedWithoutUndo, 0),
		levelsCompletedWithoutRestart: asNonNegInt(record.levelsCompletedWithoutRestart, 0),
		highestLevelCompleted: asNonNegInt(record.highestLevelCompleted, 0),
		completedByDifficulty,
		completedLevelNumbers: asLevelNumberList(record.completedLevelNumbers),
		withoutHintLevelNumbers: asLevelNumberList(record.withoutHintLevelNumbers),
		withoutUndoLevelNumbers: asLevelNumberList(record.withoutUndoLevelNumbers),
		withoutRestartLevelNumbers: asLevelNumberList(record.withoutRestartLevelNumbers),
	}
}

export function parseAttemptFlags(value: unknown): AttemptFlags {
	if (!value || typeof value !== 'object') {
		return { usedHint: false, usedUndo: false, usedRestart: false }
	}
	const record = value as Record<string, unknown>
	return {
		usedHint: record.usedHint === true,
		usedUndo: record.usedUndo === true,
		usedRestart: record.usedRestart === true,
	}
}

/**
 * Reconstruct progression-only stats from unlock frontier.
 * Does NOT invent historical pours / hint / undo / restart usage.
 */
export function reconstructStatisticsFromProgress(
	highestUnlockedLevel: number,
	campaignComplete: boolean,
	existing?: GameStatistics | null,
): GameStatistics {
	const base = existing ? { ...existing } : createEmptyStatistics()
	const completedCount = inferCompletedLevelCount(
		highestUnlockedLevel,
		campaignComplete,
	)
	if (completedCount <= 0) {
		return base
	}

	const completedLevelNumbers = Array.from(
		{ length: completedCount },
		(_, i) => i + 1,
	)
	const completedByDifficulty = createEmptyStatistics().completedByDifficulty
	for (const level of completedLevelNumbers) {
		const band = getCampaignDifficultyBand(level)
		completedByDifficulty[band] += 1
	}

	return {
		...base,
		// Keep any richer recorded counters; only fill progression gaps.
		levelsCompleted: Math.max(base.levelsCompleted, completedCount),
		highestLevelCompleted: Math.max(base.highestLevelCompleted, completedCount),
		completedByDifficulty: mergeDifficultyCounts(
			base.completedByDifficulty,
			completedByDifficulty,
		),
		completedLevelNumbers: unionSorted(
			base.completedLevelNumbers,
			completedLevelNumbers,
		),
	}
}

export function recordPour(stats: GameStatistics): GameStatistics {
	return { ...stats, totalPours: stats.totalPours + 1 }
}

export function recordHintUsed(stats: GameStatistics): GameStatistics {
	return { ...stats, hintsUsed: stats.hintsUsed + 1 }
}

export function recordUndoUsed(stats: GameStatistics): GameStatistics {
	return { ...stats, undosUsed: stats.undosUsed + 1 }
}

export function recordRestartUsed(stats: GameStatistics): GameStatistics {
	return { ...stats, restartsUsed: stats.restartsUsed + 1 }
}

/**
 * Apply a successful level completion once per level for unique counters.
 * Returns { stats, wasFirstCompletion } for achievement evaluation.
 */
export function recordLevelCompletion(
	stats: GameStatistics,
	levelNumber: number,
	difficulty: CampaignDifficultyBand,
	attempt: AttemptFlags,
): { stats: GameStatistics; wasFirstCompletion: boolean } {
	const already = stats.completedLevelNumbers.includes(levelNumber)
	let next: GameStatistics = { ...stats }

	if (!already) {
		next = {
			...next,
			levelsCompleted: next.levelsCompleted + 1,
			highestLevelCompleted: Math.max(next.highestLevelCompleted, levelNumber),
			completedByDifficulty: {
				...next.completedByDifficulty,
				[difficulty]: next.completedByDifficulty[difficulty] + 1,
			},
			completedLevelNumbers: unionSorted(next.completedLevelNumbers, [levelNumber]),
		}
	}

	if (!attempt.usedHint && !next.withoutHintLevelNumbers.includes(levelNumber)) {
		next = {
			...next,
			levelsCompletedWithoutHint: next.levelsCompletedWithoutHint + 1,
			withoutHintLevelNumbers: unionSorted(next.withoutHintLevelNumbers, [
				levelNumber,
			]),
		}
	}
	if (!attempt.usedUndo && !next.withoutUndoLevelNumbers.includes(levelNumber)) {
		next = {
			...next,
			levelsCompletedWithoutUndo: next.levelsCompletedWithoutUndo + 1,
			withoutUndoLevelNumbers: unionSorted(next.withoutUndoLevelNumbers, [
				levelNumber,
			]),
		}
	}
	if (
		!attempt.usedRestart &&
		!next.withoutRestartLevelNumbers.includes(levelNumber)
	) {
		next = {
			...next,
			levelsCompletedWithoutRestart: next.levelsCompletedWithoutRestart + 1,
			withoutRestartLevelNumbers: unionSorted(next.withoutRestartLevelNumbers, [
				levelNumber,
			]),
		}
	}

	return { stats: next, wasFirstCompletion: !already }
}

function asNonNegInt(value: unknown, fallback: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
		return fallback
	}
	return Math.floor(value)
}

function asLevelNumberList(value: unknown): number[] {
	if (!Array.isArray(value)) return []
	const numbers = value
		.filter((item): item is number => typeof item === 'number' && Number.isInteger(item))
		.filter((item) => item >= 1 && item <= 100)
	return unionSorted(numbers, [])
}

function unionSorted(a: number[], b: number[]): number[] {
	return [...new Set([...a, ...b])].sort((x, y) => x - y)
}

function mergeDifficultyCounts(
	a: Record<CampaignDifficultyBand, number>,
	b: Record<CampaignDifficultyBand, number>,
): Record<CampaignDifficultyBand, number> {
	const out = { ...a }
	for (const key of DIFFICULTIES) {
		out[key] = Math.max(a[key], b[key])
	}
	return out
}
