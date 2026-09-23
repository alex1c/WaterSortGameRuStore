import type { Board } from '../types'
import { serializeBoard } from '../core/serialize'

/**
 * Canonical board key under tube-order symmetry.
 *
 * Every tube has identical rules, so reordering tubes cannot change whether a
 * state is solvable. Sorting serialized tube contents merges those equivalent
 * states. The solver still stores and returns the first real-index board that
 * reached a key, so no move needs a canonical-to-real index translation.
 */
export function canonicalKey(board: Board): string {
	const sortedTubes = board.map((tube) => serializeBoard([tube])).sort()
	return serializeBoard(sortedTubes.map((encoded) => JSON.parse(encoded)[0] as string[]))
}

/** Canonicalized copy, useful for diagnostics and regression tests. */
export function canonicalizeBoard(board: Board): Board {
	return JSON.parse(canonicalKey(board)) as Board
}

