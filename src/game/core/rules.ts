import { TUBE_CAPACITY, type Board, type ColorId, type Move, type Tube } from '../types'
import { isCompleteTube } from './state'

/** Top is always the last array element; index 0 is the bottom. */
export function getTopColor(tube: Tube): ColorId | null {
	return tube.length === 0 ? null : (tube[tube.length - 1] ?? null)
}

/** Number of contiguous layers at the top that share the top color. */
export function getTopGroupSize(tube: Tube): number {
	const topColor = getTopColor(tube)
	if (topColor === null) {
		return 0
	}

	let size = 0
	for (let index = tube.length - 1; index >= 0; index -= 1) {
		if (tube[index] !== topColor) {
			break
		}
		size += 1
	}
	return size
}

/** Remaining room in a tube. Invalid over-capacity input reports zero. */
export function getFreeCapacity(tube: Tube): number {
	return Math.max(0, TUBE_CAPACITY - tube.length)
}

function hasTube(board: Board, index: number): boolean {
	return Number.isInteger(index) && index >= 0 && index < board.length && board[index] !== undefined
}

/** Whether a move satisfies the complete classic Water Sort rule set. */
export function canPour(board: Board, move: Move): boolean {
	if (move.from === move.to || !hasTube(board, move.from) || !hasTube(board, move.to)) {
		return false
	}

	const source = board[move.from]
	const destination = board[move.to]
	if (!source || !destination || source.length === 0 || getFreeCapacity(destination) === 0) {
		return false
	}

	const sourceTop = getTopColor(source)
	const destinationTop = getTopColor(destination)
	return sourceTop !== null && (destinationTop === null || destinationTop === sourceTop)
}

/** Maximum number of layers transferred by a legal move, or zero if illegal. */
export function getPourAmount(board: Board, move: Move): number {
	if (!canPour(board, move)) {
		return 0
	}
	const source = board[move.from]
	const destination = board[move.to]
	if (!source || !destination) {
		return 0
	}
	return Math.min(getTopGroupSize(source), getFreeCapacity(destination))
}

/**
 * Generate legal moves in stable order.
 *
 * A full monochrome tube is already complete and never needs to be disturbed.
 * Multiple empty destinations are interchangeable, so only the first empty
 * destination is emitted for a given source. Both reductions preserve
 * completeness while keeping returned moves tied to real tube indices.
 */
export function getLegalMoves(board: Board): Move[] {
	const moves: Move[] = []
	const firstEmpty = board.findIndex((tube) => tube.length === 0)

	for (let from = 0; from < board.length; from += 1) {
		const source = board[from]
		if (!source || source.length === 0 || isCompleteTube(source)) {
			continue
		}

		for (let to = 0; to < board.length; to += 1) {
			if (to === from) {
				continue
			}
			const destination = board[to]
		if (!destination) {
				continue
			}
			if (destination.length === 0 && to !== firstEmpty) {
				continue
			}
			const move = { from, to }
			if (canPour(board, move)) {
				moves.push(move)
			}
		}
	}

	// Same-color merges/completions first, then empty-tube moves, all stable.
	moves.sort((left, right) => {
		const leftDestination = board[left.to]
		const rightDestination = board[right.to]
		const leftPriority = leftDestination && leftDestination.length > 0 ? 0 : 1
		const rightPriority = rightDestination && rightDestination.length > 0 ? 0 : 1
		return leftPriority - rightPriority || left.from - right.from || left.to - right.to
	})

	return moves
}

/** Solved means every tube is empty or full monochrome. */
export function isSolved(board: Board): boolean {
	return board.every((tube) => tube.length === 0 || isCompleteTube(tube))
}

