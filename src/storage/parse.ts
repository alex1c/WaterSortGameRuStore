import type { Board } from '../game/types'
import { isValidBoard } from '../game/core'
import { CAMPAIGN_LEVEL_COUNT } from '../campaign/config'
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
import {
	STORAGE_SCHEMA_VERSION,
	LEGACY_STORAGE_SCHEMA_VERSIONS,
	createDefaultPersistedState,
	type PersistedGameState,
	type PersistedLevelSession,
} from './types'

/**
 * Pure parser used by tests and the async loader.
 * Accepts schema v1/v2/v3. Never throws.
 *
 * Migration notes:
 * - Campaign unlocks / session / settings are preserved.
 * - Progression statistics & reconstructible achievements are derived from
 *   highestUnlockedLevel / campaignComplete when richer history is absent.
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

		const currentLevel = asLevelNumber(record.currentLevel) ?? 1
		const highestUnlockedLevel = clamp(
			asLevelNumber(record.highestUnlockedLevel) ?? 1,
			1,
			CAMPAIGN_LEVEL_COUNT,
		)
		const campaignComplete = record.campaignComplete === true
		const tutorialCompleted = record.tutorialCompleted === true
		const session = parseSession(record.session)
		const settings = parseGameSettings(record.settings)

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
