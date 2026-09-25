import { isValidBoard } from '../game/core'
import type { Board } from '../game/types'
import { parsePuzzleHelpState } from '../help'
import { parseAttemptFlags } from '../statistics'
import { FREE_PLAY_DIFFICULTIES, type FreePlayDifficulty } from './config'
import {
	createEmptyFreePlayState,
	type PersistedFreePlaySession,
	type PersistedFreePlayState,
} from './types'

/**
 * Parse Free Play subsection. Corrupt data → empty Free Play only
 * (Campaign is handled by the outer parser).
 */
export function parseFreePlayState(value: unknown): PersistedFreePlayState {
	if (!value || typeof value !== 'object') {
		return createEmptyFreePlayState()
	}
	const record = value as Record<string, unknown>
	const seedCounter =
		typeof record.seedCounter === 'number' &&
		Number.isFinite(record.seedCounter) &&
		record.seedCounter >= 0
			? Math.floor(record.seedCounter)
			: 0
	return {
		seedCounter,
		session: parseFreePlaySession(record.session),
	}
}

export function parseFreePlaySession(
	value: unknown,
): PersistedFreePlaySession | null {
	if (!value || typeof value !== 'object') return null
	const record = value as Record<string, unknown>
	if (
		typeof record.difficulty !== 'string' ||
		!FREE_PLAY_DIFFICULTIES.includes(record.difficulty as FreePlayDifficulty)
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
		difficulty: record.difficulty as FreePlayDifficulty,
		seed: record.seed,
		initialBoard: cloneBoard(record.initialBoard),
		currentBoard: cloneBoard(record.currentBoard),
		moveHistory: record.moveHistory.map(cloneBoard),
		attempt: parseAttemptFlags(record.attempt),
		moveCount: Math.floor(record.moveCount),
		isSolved: record.isSolved === true,
		// Corrupt/missing help → defaults; do not invent prior rewarded grants.
		help: parsePuzzleHelpState(record.help),
	}
}

function isBoard(value: unknown): value is Board {
	return Array.isArray(value) && isValidBoard(value as Board)
}

function cloneBoard(board: Board): Board {
	return board.map((tube) => [...tube])
}
