import {
	applyMove,
	getHint,
	getLegalMoves,
	isSolved,
	solve,
	type Board,
	type Move,
	type SolverOptions,
} from '../game'

/**
 * Fast responsive pass — same budget as historical production callers.
 * Prefer returning quickly so the UI stays interactive.
 */
export const HINT_FAST_BUDGET: Required<SolverOptions> = {
	maxStates: 250_000,
	maxDepth: 250,
	timeoutMs: 4_000,
}

/**
 * Stronger deferred pass when the fast search hits a cutoff.
 * Still bounded so Android cannot freeze for unbounded wall time.
 */
export const HINT_STRONG_BUDGET: Required<SolverOptions> = {
	maxStates: 1_000_000,
	maxDepth: 400,
	timeoutMs: 8_000,
}

export type HintSearchStatus =
	| 'found'
	| 'already_solved'
	| 'cutoff'
	| 'unsolvable'
	| 'illegal_guard'

export interface HintSearchResult {
	status: HintSearchStatus
	move: Move | null
	/** Which budget produced the result (if any). */
	pass: 'fast' | 'strong' | 'none'
}

/**
 * Shared Campaign / Free Play / Daily hint strategy.
 *
 * 1) Fast pass for responsive UX.
 * 2) If cutoff/timeout → stronger bounded search.
 * 3) Never invent a move: every returned move must be legal on currentBoard
 *    and come from a solver-confirmed continuation.
 * 4) Distinguishes cutoff vs exhaustive unsolvable when the solver reports it.
 */
export function findHintMove(
	board: Board,
	options?: {
		fast?: SolverOptions
		strong?: SolverOptions
		/** When false, skip the stronger pass (tests / sync callers). */
		allowStrongPass?: boolean
	},
): HintSearchResult {
	if (isSolved(board)) {
		return { status: 'already_solved', move: null, pass: 'none' }
	}

	const fastBudget = { ...HINT_FAST_BUDGET, ...options?.fast }
	const fast = runHintPass(board, fastBudget)
	if (fast.status === 'found') {
		return { ...fast, pass: 'fast' }
	}
	if (fast.status === 'unsolvable' || fast.status === 'illegal_guard') {
		return { ...fast, pass: 'fast' }
	}

	const allowStrong = options?.allowStrongPass !== false
	if (!allowStrong) {
		return { ...fast, pass: 'fast' }
	}

	const strongBudget = { ...HINT_STRONG_BUDGET, ...options?.strong }
	const strong = runHintPass(board, strongBudget)
	return { ...strong, pass: 'strong' }
}

/**
 * Async wrapper: yields to the UI between fast and strong passes so the
 * stronger search does not block the first paint of "Ищем подсказку…".
 */
export async function findHintMoveAsync(
	board: Board,
	options?: {
		fast?: SolverOptions
		strong?: SolverOptions
		onSearchingStronger?: () => void
	},
): Promise<HintSearchResult> {
	if (isSolved(board)) {
		return { status: 'already_solved', move: null, pass: 'none' }
	}

	const fastBudget = { ...HINT_FAST_BUDGET, ...options?.fast }
	const fast = runHintPass(board, fastBudget)
	if (fast.status === 'found') {
		return { ...fast, pass: 'fast' }
	}
	if (fast.status === 'unsolvable' || fast.status === 'illegal_guard') {
		return { ...fast, pass: 'fast' }
	}

	options?.onSearchingStronger?.()
	await yieldToUi()

	const strongBudget = { ...HINT_STRONG_BUDGET, ...options?.strong }
	const strong = runHintPass(board, strongBudget)
	return { ...strong, pass: 'strong' }
}

function runHintPass(board: Board, budget: SolverOptions): Omit<HintSearchResult, 'pass'> {
	const result = solve(board, budget)
	if (result.solved) {
		const move = result.moves[0] ?? getHint(board, budget)
		if (!move || !isLegalSolverBackedMove(board, move)) {
			return { status: 'illegal_guard', move: null }
		}
		return { status: 'found', move }
	}
	if (result.cutoff) {
		return { status: 'cutoff', move: null }
	}
	return { status: 'unsolvable', move: null }
}

/**
 * Guard: hint must be among current legal moves and must produce a board
 * the solver accepted as part of a solution path (already implied by solve()).
 */
export function isLegalSolverBackedMove(board: Board, move: Move): boolean {
	const legal = getLegalMoves(board)
	const matched = legal.some((m) => m.from === move.from && m.to === move.to)
	if (!matched) return false
	const next = applyMove(board, move)
	return next !== board
}

/** User-facing Russian copy for non-found outcomes (never "Подсказка недоступна"). */
export function hintFailureMessage(status: HintSearchStatus): string {
	switch (status) {
		case 'already_solved':
			return 'Уровень уже решён'
		case 'cutoff':
			return 'Из этой позиции решение не найдено. Попробуйте отменить несколько ходов.'
		case 'unsolvable':
			return 'Из этой позиции решение не найдено. Попробуйте отменить несколько ходов.'
		case 'illegal_guard':
			return 'Из этой позиции решение не найдено. Попробуйте отменить несколько ходов.'
		default:
			return 'Из этой позиции решение не найдено. Попробуйте отменить несколько ходов.'
	}
}

function yieldToUi(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0)
	})
}
