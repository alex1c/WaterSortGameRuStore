import type { Board } from '../game/types'
import { isValidBoard } from '../game/core'
import {
	CAMPAIGN_LEVEL_COUNT,
	ORIGINAL_CAMPAIGN_MILESTONE,
} from '../campaign/config'
import { parseGameSettings } from '../settings/parse'
import {
	parseAttemptFlags,
	parseGameStatistics,
	reconstructStatisticsFromProgress,
} from '../statistics'
import {
	parseAchievementState,
	reconstructAchievementsFromStats,
} from '../achievements'
import { parseFreePlayState } from '../freePlay'
import { parseDailyState } from '../daily'
import {
	STORAGE_SCHEMA_VERSION,
	LEGACY_STORAGE_SCHEMA_VERSIONS,
	createDefaultPersistedState,
	type PersistedGameState,
	type PersistedLevelSession,
} from './types'

/**
 * Pure parser used by tests and the async loader.
 * Accepts schema v1–v6. Never throws.
 *
 * Migration notes:
 * - v3 → v4: old campaignComplete (100-level) unlocks 101, clears complete flag.
 * - v4 → v5: freePlay defaults to empty; Campaign session untouched.
 * - v5 → v6: daily defaults to empty; Campaign / Free Play untouched.
 * - Corrupt freePlay subsection → empty Free Play only.
 * - Corrupt daily subsection → empty Daily only.
 * - Historical pours / hint / undo / restart counts are NOT invented.
 */
export function parsePersistedGameState(raw: string): PersistedGameState {
	const fallback = createDefaultPersistedState()
	try {
		const data = JSON.parse(raw) as unknown
		if (!data || typeof data !== 'object') {
			return fallback
		}
		const record = data as Record<string, unknown>
		const schemaVersion = record.schemaVersion
		const accepted =
			schemaVersion === STORAGE_SCHEMA_VERSION ||
			LEGACY_STORAGE_SCHEMA_VERSIONS.includes(
				schemaVersion as (typeof LEGACY_STORAGE_SCHEMA_VERSIONS)[number],
			)
		if (!accepted) {
			return fallback
		}

		const incomingSchema =
			typeof schemaVersion === 'number' ? schemaVersion : 0

		let currentLevel = asLevelNumber(record.currentLevel) ?? 1
		let highestUnlockedLevel = clamp(
			asLevelNumber(record.highestUnlockedLevel) ?? 1,
			1,
			CAMPAIGN_LEVEL_COUNT,
		)
		let campaignComplete = record.campaignComplete === true
		const tutorialCompleted = record.tutorialCompleted === true
		const session = parseSession(record.session)
		const settings = parseGameSettings(record.settings)
		const freePlay = parseFreePlayState(record.freePlay)
		const daily = parseDailyState(record.daily)

		// v3 (and earlier) campaignComplete meant the 100-level milestone.
		if (incomingSchema <= 3 && campaignComplete) {
			campaignComplete = false
			highestUnlockedLevel = Math.max(
				highestUnlockedLevel,
				ORIGINAL_CAMPAIGN_MILESTONE + 1,
			)
			if (currentLevel < 1) currentLevel = 1
		}

		const parsedStats = parseGameStatistics(record.statistics)
		const statistics = reconstructStatisticsFromProgress(
			highestUnlockedLevel,
			campaignComplete,
			parsedStats,
		)
		const parsedAchievements = parseAchievementState(record.achievements)
		const achievements = reconstructAchievementsFromStats(
			statistics,
			parsedAchievements,
		)

		return {
			schemaVersion: STORAGE_SCHEMA_VERSION,
			currentLevel,
			highestUnlockedLevel: Math.max(
				highestUnlockedLevel,
				session?.levelNumber ?? 1,
				1,
			),
			campaignComplete,
			tutorialCompleted,
			session,
			settings,
			statistics,
			achievements,
			freePlay,
			daily,
		}
	} catch {
		return fallback
	}
}

function parseSession(value: unknown): PersistedLevelSession | null {
	if (!value || typeof value !== 'object') {
		return null
	}
	const record = value as Record<string, unknown>
	const levelNumber = asLevelNumber(record.levelNumber)
	if (levelNumber === null) return null
	if (typeof record.seed !== 'string' || record.seed.length === 0) return null
	if (typeof record.campaignBand !== 'string') return null
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
		levelNumber,
		seed: record.seed,
		campaignBand: record.campaignBand as PersistedLevelSession['campaignBand'],
		initialBoard: cloneBoardTree(record.initialBoard),
		currentBoard: cloneBoardTree(record.currentBoard),
		moveHistory: record.moveHistory.map(cloneBoardTree),
		moveCount: Math.floor(record.moveCount),
		attempt: parseAttemptFlags(record.attempt),
	}
}

function isBoard(value: unknown): value is Board {
	return Array.isArray(value) && isValidBoard(value as Board)
}

function cloneBoardTree(board: Board): Board {
	return board.map((tube) => [...tube])
}

function asLevelNumber(value: unknown): number | null {
	if (typeof value !== 'number' || !Number.isInteger(value)) return null
	if (value < 1 || value > CAMPAIGN_LEVEL_COUNT) return null
	return value
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}
