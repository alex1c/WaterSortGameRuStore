import {
	generateLevel,
	generateLevelDetailed,
	type GeneratedLevel,
} from '../game/generator'
import {
	FREE_PLAY_COLOR_COUNT,
	FREE_PLAY_EMPTY_TUBE_COUNT,
	FREE_PLAY_MAX_ATTEMPTS,
	type FreePlayDifficulty,
} from './config'

export type FreePlayGenerationResult =
	| { ok: true; level: GeneratedLevel }
	| { ok: false; reason: 'generation_failed' }

/**
 * Create a solver-verified Free Play puzzle.
 * Never returns an unverified board — failure is explicit.
 */
export function createFreePlayPuzzle(
	difficulty: FreePlayDifficulty,
	seed: string,
): FreePlayGenerationResult {
	const base = {
		colorCount: FREE_PLAY_COLOR_COUNT[difficulty],
		emptyTubeCount: FREE_PLAY_EMPTY_TUBE_COUNT,
		seed,
		maxAttempts: FREE_PLAY_MAX_ATTEMPTS[difficulty],
	}

	const targeted = generateLevelDetailed({
		...base,
		targetDifficulty: difficulty,
	})
	if (targeted.level) {
		return { ok: true, level: targeted.level }
	}

	// Same seed without tier filter — still solver-verified by generateLevel.
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
