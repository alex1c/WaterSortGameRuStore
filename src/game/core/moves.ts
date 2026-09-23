import type { Board, Move } from '../types'
import { cloneBoard } from './state'
import { canPour, getPourAmount } from './rules'

/** Apply the maximum legal pour immutably; invalid moves return the same board. */
export function applyMove(board: Board, move: Move): Board {
	const amount = getPourAmount(board, move)
	if (amount === 0) {
		return board
	}

	const next = cloneBoard(board)
	const source = next[move.from]
	const destination = next[move.to]
	if (!source || !destination || !canPour(board, move)) {
		return board
	}

	const layers = source.splice(source.length - amount, amount)
	destination.push(...layers)
	return next
}

/** Convenience predicate for callers that want to avoid applying a no-op. */
export function moveChangesBoard(board: Board, move: Move): boolean {
	return canPour(board, move) && getPourAmount(board, move) > 0
}

