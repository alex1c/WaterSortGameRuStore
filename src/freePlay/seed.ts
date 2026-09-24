import type { FreePlayDifficulty } from './config'

/**
 * Deterministic Free Play seed identity.
 * Counter is a persisted monotonic value — not wall-clock alone.
 */
export function createFreePlaySeed(
	counter: number,
	difficulty: FreePlayDifficulty,
): string {
	return `watersort-freeplay-v1-${difficulty}-${counter}`
}

export type FreePlaySeedFactory = (
	counter: number,
	difficulty: FreePlayDifficulty,
) => string
