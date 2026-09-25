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
 * Fast pass budget for the shared Hint path.
 *
 * Calibrated from PH10.1 desktop benchmarks against Campaign L446
 * (worst known audit case: ~5941 explored states) plus representative
 * HARD/EXPERT / Free Play / Daily / 14-tube boards.
 *
 * All measured generated puzzles solved well under this state ceiling.
 * timeoutMs is only a secondary guard — work still runs synchronously
 * on the React Native JS thread.
 */
export const HINT_FAST_BUDGET: Required<SolverOptions> = {
	maxStates: 25_000,
	maxDepth: 180,
	timeoutMs: 2_000,
}

/**
 * Stronger second pass after a fast cutoff.
 *
 * Intentionally far below the previous 1_000_000 / 8s budget. Pathological
 * player positions may still exhaust this bound; recovery guidance is then
 * preferred over a long UI freeze. timeoutMs caps wall-clock work but does
 * not move solve() off the JS thread.
 */
export const HINT_STRONG_BUDGET: Required<SolverOptions> = {
	maxStates: 80_000,
	maxDepth: 220,
	timeoutMs: 1_500,
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
	/** States explored by the pass that produced this result (0 if none). */
	exploredStates: number
}

/**
 * Shared Campaign / Free Play / Daily hint strategy.
 *
 * 1) Fast synchronous solve with a phone-safe budget.
 * 2) If cutoff → stronger synchronous solve (still bounded).
 * 3) Never invent a move: every returned move must be legal on currentBoard
 *    and come from a solver-confirmed continuation.
 * 4) Distinguishes cutoff vs exhaustive unsolvable when the solver reports it.
 *
 * Both passes run on the JS thread. Budgets exist to bound freeze duration,
 * not to imply background/parallel execution.
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
		return {
			status: 'already_solved',
			move: null,
			pass: 'none',
			exploredStates: 0,
		}
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
 * Async wrapper that yields once between passes so React can paint the
 * "Ищем подсказку…" state before the second synchronous solve.
 *
 * Important: yieldToUi() does NOT run solve() in parallel or on another
 * thread. The strong pass still blocks the JS thread for up to its budget.
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
		return {
			status: 'already_solved',
			move: null,
			pass: 'none',
			exploredStates: 0,
		}
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

function runHintPass(
	board: Board,
	budget: SolverOptions,
): Omit<HintSearchResult, 'pass'> {
	const result = solve(board, budget)
	if (result.solved) {
		const move = result.moves[0] ?? getHint(board, budget)
		if (!move || !isLegalSolverBackedMove(board, move)) {
			return {
				status: 'illegal_guard',
				move: null,
				exploredStates: result.exploredStates,
			}
		}
		return {
			status: 'found',
			move,
			exploredStates: result.exploredStates,
		}
	}
	if (result.cutoff) {
		return {
			status: 'cutoff',
			move: null,
			exploredStates: result.exploredStates,
		}
	}
	return {
		status: 'unsolvable',
		move: null,
		exploredStates: result.exploredStates,
	}
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

/**
 * Yields a macrotask so React can commit the searching UI before the next
 * synchronous solve. This is not background execution.
 */
function yieldToUi(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0)
	})
}
