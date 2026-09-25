import type { Board } from '../game/types'
import type { CampaignDifficultyBand } from '../campaign/config'
import {
	createInitialPuzzleHelpState,
	type PuzzleHelpState,
} from '../help'
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
 * Schema v7: per-puzzle help (hint credits + extra tube) and Free Play discovery.
 * Storage key remains watersort.campaign.v1 for continuity.
 */
export const STORAGE_SCHEMA_VERSION = 7

export const LEGACY_STORAGE_SCHEMA_VERSIONS = [1, 2, 3, 4, 5, 6] as const

export const STORAGE_KEY = 'watersort.campaign.v1'

/**
 * In-progress mid-level snapshot for undo-capable restore.
 * initialBoard is always the ORIGINAL generated campaign board (identity freeze).
 * Extra tube lives in help + currentBoard / moveHistory tube counts.
 */
export interface PersistedLevelSession {
	levelNumber: number
	seed: string
	campaignBand: CampaignDifficultyBand
	initialBoard: Board
	currentBoard: Board
	moveHistory: Board[]
	moveCount: number
	attempt?: AttemptFlags
	help: PuzzleHelpState
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
	/** One-time Free Play discoverability prompt has been shown. */
	freePlayDiscoveryShown: boolean
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
		freePlayDiscoveryShown: false,
	}
}

export { createInitialPuzzleHelpState }
