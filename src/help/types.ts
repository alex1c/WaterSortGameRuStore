/**
 * Per-puzzle voluntary help state (Campaign / Free Play / Daily).
 *
 * Credits belong to one puzzle identity. Restart and Undo do not refill
 * free hints or revoke an earned extra tube.
 */
export interface PuzzleHelpState {
	/** Remaining free hints for this puzzle (starts at FREE_HINTS_PER_PUZZLE). */
	freeHintsRemaining: number
	/** Remaining hints granted via rewarded packs. */
	rewardedHintsRemaining: number
	/** Whether the player already earned the one rewarded empty tube. */
	extraTubeGranted: boolean
}

/** First N hints on each new puzzle identity are free. */
export const FREE_HINTS_PER_PUZZLE = 2

/** One verified rewarded ad grants this many hint credits. */
export const REWARDED_HINT_PACK_SIZE = 3

/** At most one rewarded empty tube per puzzle identity. */
export const MAX_EXTRA_TUBES_PER_PUZZLE = 1
