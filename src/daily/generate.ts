import {
	generateLevel,
	generateLevelDetailed,
	type GeneratedLevel,
} from '../game/generator'
import {
	DAILY_COLOR_COUNT,
	DAILY_EMPTY_TUBE_COUNT,
	DAILY_MAX_ATTEMPTS,
	type DailyDifficulty,
} from './config'

export type DailyGenerationResult =
	| { ok: true; level: GeneratedLevel }
	| { ok: false; reason: 'generation_failed' }

/**
 * Solver-verified Daily puzzle. Never returns an unverified board.
 */
export function createDailyPuzzle(
	difficulty: DailyDifficulty,
	seed: string,
): DailyGenerationResult {
	const base = {
		colorCount: DAILY_COLOR_COUNT[difficulty],
		emptyTubeCount: DAILY_EMPTY_TUBE_COUNT,
		seed,
		maxAttempts: DAILY_MAX_ATTEMPTS[difficulty],
	}

	const targeted = generateLevelDetailed({
		...base,
		targetDifficulty: difficulty,
	})
	if (targeted.level) {
		return { ok: true, level: targeted.level }
	}

	try {
		const fallback = generateLevel({
			...base,
			targetDifficulty: undefined,
		})
		return { ok: true, level: fallback }
	} catch {
		return { ok: false, reason: 'generation_failed' }
	}
}
