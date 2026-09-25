import { isValidBoard } from '../game/core'
import type { Board } from '../game/types'
import { parsePuzzleHelpState } from '../help'
import { parseAttemptFlags } from '../statistics'
import {
	isValidLocalDateKey,
	type LocalDateKey,
} from './date'
import type { DailyDifficulty } from './config'
import {
	computeBestStreakFromKeys,
	recordDailyCompletion,
} from './streak'
import {
	createEmptyDailyState,
	type PersistedDailySession,
	type PersistedDailyState,
} from './types'

const DAILY_DIFFICULTIES: DailyDifficulty[] = ['MEDIUM', 'HARD', 'EXPERT']

/**
 * Parse Daily subsection. Corrupt → empty Daily only.
 */
export function parseDailyState(value: unknown): PersistedDailyState {
	if (!value || typeof value !== 'object') {
		return createEmptyDailyState()
	}
	const record = value as Record<string, unknown>
	const completedDateKeys = asDateKeyList(record.completedDateKeys)
	let currentStreak = asNonNegInt(record.currentStreak, 0)
	let bestStreak = asNonNegInt(record.bestStreak, 0)
	let lastCompletedDateKey: LocalDateKey | null =
		typeof record.lastCompletedDateKey === 'string' &&
		isValidLocalDateKey(record.lastCompletedDateKey)
			? record.lastCompletedDateKey
			: null

	if (completedDateKeys.length > 0) {
		bestStreak = Math.max(
			bestStreak,
			computeBestStreakFromKeys(completedDateKeys),
		)
		if (!lastCompletedDateKey) {
			lastCompletedDateKey = completedDateKeys[completedDateKeys.length - 1] ?? null
		}
	}

	// Reconstruct streak facts if counters were missing but history exists.
	if (completedDateKeys.length > 0 && currentStreak === 0 && lastCompletedDateKey) {
		let rebuilt = createEmptyDailyState()
		for (const key of completedDateKeys) {
			rebuilt = recordDailyCompletion(rebuilt, key)
		}
		currentStreak = rebuilt.currentStreak
		bestStreak = Math.max(bestStreak, rebuilt.bestStreak)
		lastCompletedDateKey = rebuilt.lastCompletedDateKey
	}

	return {
		completedDateKeys,
		currentStreak,
		bestStreak,
		lastCompletedDateKey,
		session: parseDailySession(record.session),
	}
}

export function parseDailySession(
	value: unknown,
): PersistedDailySession | null {
	if (!value || typeof value !== 'object') return null
	const record = value as Record<string, unknown>
	if (
		typeof record.dateKey !== 'string' ||
		!isValidLocalDateKey(record.dateKey)
	) {
		return null
	}
	if (
		typeof record.difficulty !== 'string' ||
		!DAILY_DIFFICULTIES.includes(record.difficulty as DailyDifficulty)
	) {
		return null
	}
	if (typeof record.seed !== 'string' || record.seed.length === 0) return null
	if (!isBoard(record.initialBoard) || !isBoard(record.currentBoard)) return null
	if (!Array.isArray(record.moveHistory) || !record.moveHistory.every(isBoard)) {
		return null
	}
	if (
		typeof record.moveCount !== 'number' ||
		!Number.isFinite(record.moveCount) ||
		record.moveCount < 0
	) {
		return null
	}

	return {
		dateKey: record.dateKey,
		difficulty: record.difficulty as DailyDifficulty,
		seed: record.seed,
		initialBoard: cloneBoard(record.initialBoard),
		currentBoard: cloneBoard(record.currentBoard),
		moveHistory: record.moveHistory.map(cloneBoard),
		moveCount: Math.floor(record.moveCount),
		attempt: parseAttemptFlags(record.attempt),
		isSolved: record.isSolved === true,
		// Corrupt/missing help → defaults; do not invent prior rewarded grants.
		help: parsePuzzleHelpState(record.help),
	}
}

function asDateKeyList(value: unknown): LocalDateKey[] {
	if (!Array.isArray(value)) return []
	const keys = value.filter(isValidLocalDateKey)
	return [...new Set(keys)].sort()
}

function asNonNegInt(value: unknown, fallback: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
		return fallback
	}
	return Math.floor(value)
}

function isBoard(value: unknown): value is Board {
	return Array.isArray(value) && isValidBoard(value as Board)
}

function cloneBoard(board: Board): Board {
	return board.map((tube) => [...tube])
}
