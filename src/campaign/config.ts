import type { DifficultyTier } from '../game/generator'

/** First campaign ends at level 100; later phases may extend. */
export const CAMPAIGN_LEVEL_COUNT = 100

/** Stable seed namespace — must not change for existing levels. */
export const CAMPAIGN_SEED_PREFIX = 'watersort-campaign-v1-level'

export type CampaignDifficultyBand = DifficultyTier

export interface CampaignLevelConfig {
	levelNumber: number
	seed: string
	colorCount: number
	emptyTubeCount: number
	/** Design-intent band for UI labels and generator targeting. */
	band: CampaignDifficultyBand
	maxAttempts: number
}

/**
 * Map a campaign level to generator inputs.
 * Progression grows color count gradually so early levels teach mechanics
 * without jumping straight to huge boards.
 */
export function getCampaignLevelConfig(levelNumber: number): CampaignLevelConfig {
	if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > CAMPAIGN_LEVEL_COUNT) {
		throw new Error(`Campaign level must be 1..${CAMPAIGN_LEVEL_COUNT}`)
	}

	const band = getCampaignDifficultyBand(levelNumber)
	const colorCount = getCampaignColorCount(levelNumber)
	return {
		levelNumber,
		seed: `${CAMPAIGN_SEED_PREFIX}-${levelNumber}`,
		colorCount,
		emptyTubeCount: 2,
		band,
		maxAttempts: band === 'EXPERT' ? 200 : band === 'HARD' ? 160 : 120,
	}
}

/** Campaign UI band by level range (independent of engine score labels). */
export function getCampaignDifficultyBand(levelNumber: number): CampaignDifficultyBand {
	if (levelNumber <= 10) return 'BEGINNER'
	if (levelNumber <= 30) return 'EASY'
	if (levelNumber <= 55) return 'MEDIUM'
	if (levelNumber <= 80) return 'HARD'
	return 'EXPERT'
}

/**
 * Color-count curve used as the primary difficulty driver.
 * Representative points: 3 / 5 / 7 / 9 / 11 colors appear in the campaign.
 */
export function getCampaignColorCount(levelNumber: number): number {
	if (levelNumber <= 5) return 2
	if (levelNumber <= 10) return 3
	if (levelNumber <= 18) return 4
	if (levelNumber <= 30) return 5
	if (levelNumber <= 42) return 6
	if (levelNumber <= 55) return 7
	if (levelNumber <= 68) return 8
	if (levelNumber <= 80) return 9
	if (levelNumber <= 90) return 10
	return 11
}

/** Russian difficulty labels for the compact header. */
export function getDifficultyLabelRu(band: CampaignDifficultyBand): string {
	switch (band) {
		case 'BEGINNER':
			return 'Новичок'
		case 'EASY':
			return 'Легко'
		case 'MEDIUM':
			return 'Средне'
		case 'HARD':
			return 'Сложно'
		case 'EXPERT':
			return 'Эксперт'
		default: {
			const _exhaustive: never = band
			return _exhaustive
		}
	}
}

export function isLevelUnlocked(levelNumber: number, highestUnlockedLevel: number): boolean {
	return levelNumber >= 1 && levelNumber <= highestUnlockedLevel
}

/**
 * A level counts as completed once the unlock frontier has moved past it,
 * or when the full campaign is marked complete.
 */
export function isLevelCompleted(
	levelNumber: number,
	highestUnlockedLevel: number,
	campaignComplete = false,
): boolean {
	if (levelNumber < 1 || levelNumber > CAMPAIGN_LEVEL_COUNT) {
		return false
	}
	if (campaignComplete) {
		return true
	}
	return levelNumber < highestUnlockedLevel
}

export function nextUnlockAfterClearing(levelNumber: number, highestUnlockedLevel: number): number {
	const candidate = Math.min(CAMPAIGN_LEVEL_COUNT, levelNumber + 1)
	return Math.max(highestUnlockedLevel, candidate)
}
