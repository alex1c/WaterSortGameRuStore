import { cloneBoard, type Board } from '../game'

/**
 * Append one empty tube. Idempotent when the board already has the assisted
 * length relative to the original (caller must track entitlement separately).
 */
export function appendEmptyTube(board: Board): Board {
	return [...cloneBoard(board), []]
}

/**
 * Build the restart board: original generated puzzle + optional empty tube.
 * Never mutates the original identity board.
 */
export function buildRestartBoard(
	originalBoard: Board,
	extraTubeGranted: boolean,
): Board {
	const base = cloneBoard(originalBoard)
	return extraTubeGranted ? appendEmptyTube(base) : base
}

/**
 * When an extra tube is granted mid-session, every history snapshot must gain
 * the same empty tube so Undo cannot produce mismatched tube counts.
 */
export function applyExtraTubeToSessionBoards(input: {
	currentBoard: Board
	moveHistory: Board[]
}): {
	currentBoard: Board
	moveHistory: Board[]
} {
	return {
		currentBoard: appendEmptyTube(input.currentBoard),
		moveHistory: input.moveHistory.map(appendEmptyTube),
	}
}

/**
 * True when assisted board is exactly original plus one trailing empty tube.
 * Used by tests / defensive checks; does not grant entitlement by itself.
 */
export function hasTrailingEmptyExtraTube(
	originalBoard: Board,
	assistedBoard: Board,
): boolean {
	if (assistedBoard.length !== originalBoard.length + 1) return false
	const last = assistedBoard[assistedBoard.length - 1]
	if (!last || last.length !== 0) return false
	for (let i = 0; i < originalBoard.length; i += 1) {
		const a = originalBoard[i] ?? []
		const b = assistedBoard[i] ?? []
		if (a.length !== b.length) return false
		for (let j = 0; j < a.length; j += 1) {
			if (a[j] !== b[j]) return false
		}
	}
	return true
}
