import type { Board } from '../game/types'
import type { CampaignDifficultyBand } from '../campaign/config'
import {
	DEFAULT_GAME_SETTINGS,
	type GameSettings,
} from '../settings/types'
import {
	createEmptyStatistics,
	type AttemptFlags,
	type GameStatistics,
} from '../statistics'
import {
	createEmptyAchievementState,
	type AchievementState,
} from '../achievements'
import {
	createEmptyFreePlayState,
	type PersistedFreePlayState,
} from '../freePlay'
import {
	createEmptyDailyState,
	type PersistedDailyState,
} from '../daily'

/**
 * Schema v6: Daily Puzzle + streak, isolated from Campaign / Free Play.
 */
export const STORAGE_SCHEMA_VERSION = 6

export const LEGACY_STORAGE_SCHEMA_VERSIONS = [1, 2, 3, 4, 5] as const

export const STORAGE_KEY = 'watersort.campaign.v1'

/** In-progress mid-level snapshot for undo-capable restore. */
export interface PersistedLevelSession {
	levelNumber: number
	seed: string
	campaignBand: CampaignDifficultyBand
	initialBoard: Board
	currentBoard: Board
	moveHistory: Board[]
	moveCount: number
	attempt?: AttemptFlags
}

export interface PersistedGameState {
	schemaVersion: number
	currentLevel: number
	highestUnlockedLevel: number
	campaignComplete: boolean
	tutorialCompleted: boolean
	session: PersistedLevelSession | null
	settings: GameSettings
	statistics: GameStatistics
	achievements: AchievementState
	freePlay: PersistedFreePlayState
	daily: PersistedDailyState
}

export function createDefaultPersistedState(): PersistedGameState {
	return {
		schemaVersion: STORAGE_SCHEMA_VERSION,
		currentLevel: 1,
		highestUnlockedLevel: 1,
		campaignComplete: false,
		tutorialCompleted: false,
		session: null,
		settings: { ...DEFAULT_GAME_SETTINGS },
		statistics: createEmptyStatistics(),
		achievements: createEmptyAchievementState(),
		freePlay: createEmptyFreePlayState(),
		daily: createEmptyDailyState(),
	}
}
