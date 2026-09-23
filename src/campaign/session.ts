import {
	applyMove,
	canPour,
	cloneBoard,
	getHint,
	isSolved,
	type Board,
	type Move,
} from '../game'

/** Pure mid-level session state used by tests and the React hook. */
export interface PlaySession {
	initialBoard: Board
	currentBoard: Board
	moveHistory: Board[]
	moveCount: number
	selectedTube: number | null
	hintMove: Move | null
	isSolved: boolean
}

export function createPlaySession(initialBoard: Board): PlaySession {
	const board = cloneBoard(initialBoard)
	return {
		initialBoard: cloneBoard(initialBoard),
		currentBoard: board,
		moveHistory: [],
		moveCount: 0,
		selectedTube: null,
		hintMove: null,
		isSolved: isSolved(board),
	}
}

export type TubeTapResult =
	| { type: 'select'; session: PlaySession }
	| { type: 'deselect'; session: PlaySession }
	| { type: 'invalid'; session: PlaySession; flashIndex: number }
	| { type: 'poured'; session: PlaySession }
	| { type: 'ignored'; session: PlaySession }

/** Apply one tube tap using production canPour / applyMove rules. */
export function tapTube(session: PlaySession, index: number): TubeTapResult {
	if (session.isSolved) {
		return { type: 'ignored', session }
	}

	if (session.selectedTube === null) {
		const tube = session.currentBoard[index]
		if (!tube || tube.length === 0) {
			return { type: 'invalid', session, flashIndex: index }
		}
		return {
			type: 'select',
			session: {
				...session,
				selectedTube: index,
				hintMove: null,
			},
		}
	}

	if (session.selectedTube === index) {
		return {
			type: 'deselect',
			session: { ...session, selectedTube: null },
		}
	}

	const move: Move = { from: session.selectedTube, to: index }
	if (!canPour(session.currentBoard, move)) {
		return {
			type: 'invalid',
			session: { ...session, selectedTube: null },
			flashIndex: index,
		}
	}

	const previous = cloneBoard(session.currentBoard)
	const nextBoard = applyMove(session.currentBoard, move)
	const next: PlaySession = {
		...session,
		moveHistory: [...session.moveHistory, previous],
		currentBoard: nextBoard,
		moveCount: session.moveCount + 1,
		selectedTube: null,
		hintMove: null,
		isSolved: isSolved(nextBoard),
	}
	return { type: 'poured', session: next }
}

export function undoMove(session: PlaySession): PlaySession {
	if (session.moveHistory.length === 0) {
		return session
	}
	const history = [...session.moveHistory]
	const previous = history.pop()
	if (!previous) return session
	return {
		...session,
		moveHistory: history,
		currentBoard: previous,
		moveCount: Math.max(0, session.moveCount - 1),
		selectedTube: null,
		hintMove: null,
		isSolved: isSolved(previous),
	}
}

export function restartSession(session: PlaySession): PlaySession {
	return createPlaySession(session.initialBoard)
}

export function requestHint(session: PlaySession): {
	session: PlaySession
	move: Move | null
} {
	if (session.isSolved) {
		return { session, move: null }
	}
	const move = getHint(session.currentBoard, {
		maxStates: 250_000,
		maxDepth: 250,
		timeoutMs: 4_000,
	})
	if (!move) {
		return {
			session: { ...session, hintMove: null },
			move: null,
		}
	}
	return {
		session: {
			...session,
			selectedTube: null,
			hintMove: move,
		},
		move,
	}
}
