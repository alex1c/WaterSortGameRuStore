import {
	generateLevel,
	generateLevelDetailed,
	type GeneratedLevel,
} from '../game/generator'
import { getCampaignLevelConfig } from './config'

export interface CampaignLevel extends GeneratedLevel {
	levelNumber: number
	/** Design-intent campaign band used for UI (may differ from metrics.tier). */
	campaignBand: GeneratedLevel['metrics']['tier']
}

/**
 * Create a deterministic campaign puzzle for a level number.
 * Uses the Phase 2 seeded generator — never Math.random().
 *
 * Strategy:
 * 1) Prefer a board whose engine tier matches the campaign band.
 * 2) If none appears within maxAttempts, fall back to the same seed without
 *    a tier filter (still solver-verified). Same inputs → same board.
 */
export function createCampaignLevel(levelNumber: number): CampaignLevel {
	const config = getCampaignLevelConfig(levelNumber)
	const base = {
		colorCount: config.colorCount,
		emptyTubeCount: config.emptyTubeCount,
		seed: config.seed,
		maxAttempts: config.maxAttempts,
	}

	const targeted = generateLevelDetailed({
		...base,
		targetDifficulty: config.band,
	})
	if (targeted.level) {
		return {
			...targeted.level,
			levelNumber,
			campaignBand: config.band,
		}
	}

	const fallback = generateLevel({
		...base,
		targetDifficulty: undefined,
	})
	return {
		...fallback,
		levelNumber,
		campaignBand: config.band,
	}
}

/** Alias matching the Phase 3 brief naming. */
export const createLevel = createCampaignLevel
