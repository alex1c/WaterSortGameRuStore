import type { Board } from '../types'
import { isValidBoard } from './state'

/** Deterministic JSON encoding; array order is meaningful before canonicalization. */
export function serializeBoard(board: Board): string {
	return JSON.stringify(board)
}

/** Parse and validate a serialized board, throwing a useful boundary error. */
export function deserializeBoard(serialized: string): Board {
	let parsed: unknown
	try {
		parsed = JSON.parse(serialized)
	} catch {
		throw new Error('Invalid board serialization: expected JSON')
	}

	if (!isValidBoard(parsed as Board)) {
		throw new Error('Invalid board serialization: malformed board')
	}
	return (parsed as Board).map((tube) => [...tube])
}

