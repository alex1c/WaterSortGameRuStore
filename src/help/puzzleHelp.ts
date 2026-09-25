import {
	FREE_HINTS_PER_PUZZLE,
	MAX_EXTRA_TUBES_PER_PUZZLE,
	REWARDED_HINT_PACK_SIZE,
	type PuzzleHelpState,
} from './types'

/**
 * Fresh help state for a newly started puzzle identity.
 * Never invents prior rewarded grants.
 */
export function createInitialPuzzleHelpState(): PuzzleHelpState {
	return {
		freeHintsRemaining: FREE_HINTS_PER_PUZZLE,
		rewardedHintsRemaining: 0,
		extraTubeGranted: false,
	}
}

/** Total remaining hint credits (free + rewarded). */
export function totalHintCredits(help: PuzzleHelpState): number {
	return Math.max(0, help.freeHintsRemaining) + Math.max(0, help.rewardedHintsRemaining)
}

export function canUseHint(help: PuzzleHelpState): boolean {
	return totalHintCredits(help) > 0
}

/**
 * Consume exactly one credit after a valid solver-backed hint was shown.
 * Prefers free credits first, then rewarded pack credits.
 * Failed/timeout searches must not call this.
 */
export function consumeSuccessfulHint(help: PuzzleHelpState): PuzzleHelpState {
	if (help.freeHintsRemaining > 0) {
		return {
			...help,
			freeHintsRemaining: help.freeHintsRemaining - 1,
		}
	}
	if (help.rewardedHintsRemaining > 0) {
		return {
			...help,
			rewardedHintsRemaining: help.rewardedHintsRemaining - 1,
		}
	}
	return normalizeHelpState(help)
}

/** Grant +REWARDED_HINT_PACK_SIZE after a verified rewarded callback. */
export function grantRewardedHintPack(help: PuzzleHelpState): PuzzleHelpState {
	return normalizeHelpState({
		...help,
		rewardedHintsRemaining:
			Math.max(0, help.rewardedHintsRemaining) + REWARDED_HINT_PACK_SIZE,
	})
}

export function canGrantExtraTube(help: PuzzleHelpState): boolean {
	return !help.extraTubeGranted && MAX_EXTRA_TUBES_PER_PUZZLE >= 1
}

/**
 * Mark the single extra-tube entitlement. Callers add the empty tube to boards.
 * Duplicate calls are no-ops (still exactly one entitlement).
 */
export function grantExtraTube(help: PuzzleHelpState): PuzzleHelpState {
	if (help.extraTubeGranted) {
		return help
	}
	return {
		...help,
		extraTubeGranted: true,
	}
}

/**
 * Clamp corrupt / legacy help numbers without inventing rewarded history.
 * Missing fields default to a fresh free allotment and no tube.
 */
export function parsePuzzleHelpState(value: unknown): PuzzleHelpState {
	if (!value || typeof value !== 'object') {
		return createInitialPuzzleHelpState()
	}
	const record = value as Record<string, unknown>
	const free = asNonNegInt(record.freeHintsRemaining, FREE_HINTS_PER_PUZZLE)
	const rewarded = asNonNegInt(record.rewardedHintsRemaining, 0)
	const extraTubeGranted = record.extraTubeGranted === true
	return normalizeHelpState({
		freeHintsRemaining: Math.min(free, FREE_HINTS_PER_PUZZLE),
		rewardedHintsRemaining: rewarded,
		extraTubeGranted,
	})
}

export function normalizeHelpState(help: PuzzleHelpState): PuzzleHelpState {
	return {
		freeHintsRemaining: Math.max(0, Math.floor(help.freeHintsRemaining)),
		rewardedHintsRemaining: Math.max(0, Math.floor(help.rewardedHintsRemaining)),
		extraTubeGranted: help.extraTubeGranted === true,
	}
}

function asNonNegInt(value: unknown, fallback: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
		return fallback
	}
	return Math.floor(value)
}
