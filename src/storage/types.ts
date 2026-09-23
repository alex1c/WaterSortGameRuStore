import type { Board } from '../game/types'
import type { CampaignDifficultyBand } from '../campaign/config'

/** Bump when persisted shape changes incompatibly. */
export const STORAGE_SCHEMA_VERSION = 1

export const STORAGE_KEY = 'watersort.campaign.v1'

/** In-progress mid-level snapshot for undo-capable restore. */
export interface PersistedLevelSession {
	levelNumber: number
	seed: string
	campaignBand: CampaignDifficultyBand
	initialBoard: Board
	currentBoard: Board
	/** Previous boards after each successful move (oldest → newest). */
	moveHistory: Board[]
	moveCount: number
}

export interface PersistedGameState {
	schemaVersion: number
	currentLevel: number
	highestUnlockedLevel: number
	/** True after the player finishes level 100. */
	campaignComplete: boolean
	tutorialCompleted: boolean
	session: PersistedLevelSession | null
}

export function createDefaultPersistedState(): PersistedGameState {
	return {
		schemaVersion: STORAGE_SCHEMA_VERSION,
		currentLevel: 1,
		highestUnlockedLevel: 1,
		campaignComplete: false,
		tutorialCompleted: false,
		session: null,
	}
}
