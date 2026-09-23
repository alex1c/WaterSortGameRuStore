import { TUBE_CAPACITY, type Board, type ColorId, type Tube } from '../types'

/** Deep-clone a board without sharing tube arrays. */
export function cloneBoard(board: Board): Board {
	return board.map((tube) => [...tube])
}

/** Structural validation shared by solver and generator boundaries. */
export function isValidBoard(board: Board): boolean {
	if (!Array.isArray(board) || board.length === 0) {
		return false
	}

	return board.every(
		(tube) =>
			Array.isArray(tube) &&
			tube.length <= TUBE_CAPACITY &&
			tube.every((color): color is ColorId => typeof color === 'string' && color.length > 0),
	)
}

/** True when a tube is full and all four layers have one color. */
export function isCompleteTube(tube: Tube): boolean {
	if (tube.length !== TUBE_CAPACITY) {
		return false
	}
	const first = tube[0]
	return first !== undefined && tube.every((color) => color === first)
}

/** Count occurrences of every color in a board. */
export function countColors(board: Board): Map<ColorId, number> {
	const counts = new Map<ColorId, number>()
	for (const tube of board) {
		for (const color of tube) {
			counts.set(color, (counts.get(color) ?? 0) + 1)
		}
	}
	return counts
}

