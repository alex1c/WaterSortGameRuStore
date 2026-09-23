import { SAMPLE_BOARD } from './sampleBoard'
import { TUBE_CAPACITY, type Board, type ColorId, type PourResult, type Tube } from './types'

/**
 * Temporary sample-board helpers for Phase 1.
 *
 * IMPORTANT: Keep this module free of React / RN imports so Jest can test
 * pouring rules in isolation. Codex will replace this with the pure
 * TypeScript game-core in a later phase — callers should depend on the
 * exported function names rather than internals.
 */

/** Deep-clone a board so mutations never leak into shared sample state. */
export function cloneBoard(board: Board): Board {
	return board.map((tube) => [...tube])
}

/** Initial training board snapshot (always a fresh clone). */
export function createInitialSampleBoard(): Board {
	return cloneBoard(SAMPLE_BOARD)
}

/** True when the tube has no liquid layers. */
export function isEmptyTube(tube: Tube): boolean {
	return tube.length === 0
}

/** Remaining free slots in a tube (never negative). */
export function freeCapacity(tube: Tube): number {
	return Math.max(0, TUBE_CAPACITY - tube.length)
}

/**
 * Topmost color in the tube, or null when empty.
 * "Top" means the last array element (pour source).
 */
export function getTopColor(tube: Tube): ColorId | null {
	if (tube.length === 0) {
		return null
	}
	return tube[tube.length - 1] ?? null
}

/**
 * Count how many contiguous layers share the same color at the top.
 * Example: ['red', 'blue', 'blue'] → 2 (two blues on top).
 */
export function getTopContiguousCount(tube: Tube): number {
	const top = getTopColor(tube)
	if (top === null) {
		return 0
	}

	let count = 0
	for (let i = tube.length - 1; i >= 0; i -= 1) {
		if (tube[i] !== top) {
			break
		}
		count += 1
	}
	return count
}

/**
 * Returns whether pouring from → to is legal under classic Water Sort rules:
 * - source and destination must differ
 * - source must not be empty
 * - destination must have free capacity
 * - destination must be empty OR share the source top color
 */
export function canPour(board: Board, fromIndex: number, toIndex: number): boolean {
	if (fromIndex === toIndex) {
		return false
	}
	if (fromIndex < 0 || toIndex < 0 || fromIndex >= board.length || toIndex >= board.length) {
		return false
	}

	const source = board[fromIndex]
	const destination = board[toIndex]
	if (!source || !destination) {
		return false
	}
	if (isEmptyTube(source)) {
		return false
	}

	const capacity = freeCapacity(destination)
	if (capacity <= 0) {
		return false
	}

	const sourceTop = getTopColor(source)
	const destTop = getTopColor(destination)
	if (sourceTop === null) {
		return false
	}
	if (destTop !== null && destTop !== sourceTop) {
		return false
	}

	return true
}

/**
 * Apply a pour when valid; otherwise return null (caller must keep prior state).
 * Moves the maximum contiguous top-color group that fits in destination capacity.
 */
export function tryPour(board: Board, fromIndex: number, toIndex: number): PourResult | null {
	if (!canPour(board, fromIndex, toIndex)) {
		return null
	}

	const next = cloneBoard(board)
	const source = next[fromIndex]
	const destination = next[toIndex]
	if (!source || !destination) {
		return null
	}

	const movable = getTopContiguousCount(source)
	const capacity = freeCapacity(destination)
	const movedCount = Math.min(movable, capacity)
	if (movedCount <= 0) {
		return null
	}

	// Pop from source top and push onto destination top.
	const layers = source.splice(source.length - movedCount, movedCount)
	destination.push(...layers)

	return {
		board: next,
		movedCount,
		fromIndex,
		toIndex,
	}
}
