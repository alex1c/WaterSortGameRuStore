import type { DifficultyTier } from '../game/generator'

/**
 * Current campaign milestone size.
 * Levels 1–100 are frozen identities from the original release.
 */
export const CAMPAIGN_LEVEL_COUNT = 1000

/** First public milestone — Levels 1–100 must never change. */
export const ORIGINAL_CAMPAIGN_MILESTONE = 100

/** Normal campaign board ceiling (physically verified Expert layouts). */
export const CAMPAIGN_MAX_COLORS = 11
export const CAMPAIGN_EMPTY_TUBE_COUNT = 2

/** Stable seed namespace — must not change for existing levels. */
export const CAMPAIGN_SEED_PREFIX = 'watersort-campaign-v1-level'

/**
 * Deterministic seed overrides.
 * Level 5: original tube-order collision with Level 1.
 * Additional overrides may be added for Levels 101+ that collide with
 * earlier puzzles — never modify the older level.
 */
const CAMPAIGN_SEED_OVERRIDES: Partial<Record<number, string>> = {
	5: `${CAMPAIGN_SEED_PREFIX}-5-calibrated`,
}

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
 * Levels 1–100 keep the original curve; 101–1000 stay at the Expert board
 * size and vary difficulty band only.
 */
export function getCampaignLevelConfig(levelNumber: number): CampaignLevelConfig {
	if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > CAMPAIGN_LEVEL_COUNT) {
		throw new Error(`Campaign level must be 1..${CAMPAIGN_LEVEL_COUNT}`)
	}

	const band = getCampaignDifficultyBand(levelNumber)
	const colorCount = getCampaignColorCount(levelNumber)
	return {
		levelNumber,
		seed: CAMPAIGN_SEED_OVERRIDES[levelNumber] ?? `${CAMPAIGN_SEED_PREFIX}-${levelNumber}`,
		colorCount,
		emptyTubeCount: CAMPAIGN_EMPTY_TUBE_COUNT,
		band,
		maxAttempts: band === 'EXPERT' ? 200 : band === 'HARD' ? 160 : 120,
	}
}

/**
 * Campaign UI band by level range.
 * Levels 1–100 are frozen. Levels 101–1000 use a deterministic rhythm so
 * long stretches are not identical EXPERT configs.
 */
export function getCampaignDifficultyBand(levelNumber: number): CampaignDifficultyBand {
	if (levelNumber <= 10) return 'BEGINNER'
	if (levelNumber <= 30) return 'EASY'
	if (levelNumber <= 55) return 'MEDIUM'
	if (levelNumber <= 80) return 'HARD'
	if (levelNumber <= ORIGINAL_CAMPAIGN_MILESTONE) return 'EXPERT'
	return getExtendedCampaignBand(levelNumber)
}

/**
 * Advanced deterministic band rhythm for Levels 101–1000.
 * No Math.random() — only levelNumber arithmetic.
 */
function getExtendedCampaignBand(levelNumber: number): CampaignDifficultyBand {
	if (levelNumber <= 200) {
		// HARD / EXPERT / HARD / EXPERT / MEDIUM / HARD
		const pattern: CampaignDifficultyBand[] = [
			'HARD',
			'EXPERT',
			'HARD',
			'EXPERT',
			'MEDIUM',
			'HARD',
		]
		return pattern[(levelNumber - 101) % pattern.length]!
	}

	if (levelNumber <= 500) {
		const index = levelNumber - 201
		// Occasional MEDIUM recovery every 11th slot.
		if (index % 11 === 10) return 'MEDIUM'
		return index % 2 === 0 ? 'HARD' : 'EXPERT'
	}

	const index = levelNumber - 501
	// Occasional MEDIUM / HARD recovery among HARD/EXPERT.
	if (index % 13 === 12) return 'MEDIUM'
	if (index % 7 === 6) return 'HARD'
	return index % 2 === 0 ? 'HARD' : 'EXPERT'
}

/**
 * Color-count curve. Cap at CAMPAIGN_MAX_COLORS for Levels 91–1000.
 * Do not grow colors past the physically verified Expert layout size.
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
	return CAMPAIGN_MAX_COLORS
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
