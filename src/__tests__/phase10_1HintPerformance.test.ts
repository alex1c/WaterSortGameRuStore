import { createCampaignLevel, getCampaignDifficultyBand } from '../campaign'
import {
	applyMove,
	serializeBoard,
	isSolved,
	type Board,
} from '../game'
import {
	appendEmptyTube,
	canUseHint,
	consumeSuccessfulHint,
	createInitialPuzzleHelpState,
	findHintMove,
	HINT_FAST_BUDGET,
	HINT_STRONG_BUDGET,
	hintFailureMessage,
	isLegalSolverBackedMove,
	totalHintCredits,
} from '../help'
import {
	createDailyPuzzle,
	createDailySeed,
	getDailyDifficulty,
} from '../daily'
import { createFreePlayPuzzle, createFreePlaySeed } from '../freePlay'

function assertFoundHint(board: Board, label: string) {
	const before = serializeBoard(board)
	const result = findHintMove(board)
	expect(result.status).toBe('found')
	expect(result.move).not.toBeNull()
	expect(isLegalSolverBackedMove(board, result.move!)).toBe(true)
	expect(serializeBoard(board)).toBe(before)
	const next = applyMove(board, result.move!)
	expect(serializeBoard(next)).not.toBe(before)
	expect(result.pass === 'fast' || result.pass === 'strong').toBe(true)
	expect(result.exploredStates).toBeGreaterThan(0)
	return result
}

describe('PH10.1 hint performance budgets', () => {
	it('uses calibrated phone-safe FAST/STRONG ceilings', () => {
		expect(HINT_FAST_BUDGET.maxStates).toBe(25_000)
		expect(HINT_FAST_BUDGET.maxDepth).toBe(180)
		expect(HINT_FAST_BUDGET.timeoutMs).toBe(2_000)
		expect(HINT_STRONG_BUDGET.maxStates).toBe(80_000)
		expect(HINT_STRONG_BUDGET.maxDepth).toBe(220)
		expect(HINT_STRONG_BUDGET.timeoutMs).toBe(1_500)
		// Strong must remain far below the unsafe PH10 1M/8s budget.
		expect(HINT_STRONG_BUDGET.maxStates).toBeLessThan(200_000)
		expect(HINT_STRONG_BUDGET.timeoutMs).toBeLessThan(4_000)
	})

	it('finds Hint on representative Campaign HARD / EXPERT / L446 / L1000', () => {
		expect(getCampaignDifficultyBand(70)).toBe('HARD')
		expect(getCampaignDifficultyBand(90)).toBe('EXPERT')
		assertFoundHint(createCampaignLevel(70).board, 'L70')
		assertFoundHint(createCampaignLevel(90).board, 'L90')
		assertFoundHint(createCampaignLevel(446).board, 'L446')
		assertFoundHint(createCampaignLevel(1000).board, 'L1000')
	}, 30_000)

	it('finds Hint on deterministic Free Play and Daily Expert boards', () => {
		const free = createFreePlayPuzzle('EXPERT', createFreePlaySeed(7, 'EXPERT'))
		expect(free.ok).toBe(true)
		if (free.ok) assertFoundHint(free.level.board, 'free-expert')

		const dateKey = '2026-09-25'
		expect(getDailyDifficulty(dateKey)).toBe('EXPERT')
		const daily = createDailyPuzzle(
			getDailyDifficulty(dateKey),
			createDailySeed(dateKey),
		)
		expect(daily.ok).toBe(true)
		if (daily.ok) assertFoundHint(daily.level.board, 'daily-expert')
	}, 30_000)

	it('finds Hint on a 14-tube assisted Expert board', () => {
		const level = createCampaignLevel(90)
		const assisted = appendEmptyTube(level.board)
		expect(assisted.length).toBe(level.board.length + 1)
		assertFoundHint(assisted, '14-tube')
	}, 20_000)

	it('preserves cutoff vs unsolvable and never invents a move', () => {
		const level = createCampaignLevel(446)
		const cutoff = findHintMove(level.board, {
			fast: { maxStates: 2, maxDepth: 1, timeoutMs: 20 },
			strong: { maxStates: 3, maxDepth: 1, timeoutMs: 20 },
			allowStrongPass: true,
		})
		expect(cutoff.status).toBe('cutoff')
		expect(cutoff.move).toBeNull()
		expect(cutoff.pass).toBe('strong')
		expect(hintFailureMessage(cutoff.status)).toContain('отменить')

		// Deterministic already-solved fixture (complete monochrome tubes).
		const solvedBoard: Board = [
			[1, 1, 1, 1],
			[2, 2, 2, 2],
			[],
			[],
		]
		expect(isSolved(solvedBoard)).toBe(true)
		const done = findHintMove(solvedBoard)
		expect(done.status).toBe('already_solved')
		expect(done.move).toBeNull()
		expect(done.status).not.toBe('cutoff')
		expect(done.status).not.toBe('unsolvable')

		// Valid board with no legal moves and not solved → exhaustive unsolvable.
		const dead: Board = [
			[1, 1, 1, 2],
			[2, 2, 2, 1],
		]
		expect(isSolved(dead)).toBe(false)
		const unsolvable = findHintMove(dead, {
			fast: { maxStates: 1_000, maxDepth: 50, timeoutMs: 500 },
			allowStrongPass: false,
		})
		expect(unsolvable.status).toBe('unsolvable')
		expect(unsolvable.move).toBeNull()
		expect(unsolvable.status).not.toBe('cutoff')
	})

	it('strong fallback can recover when FAST is intentionally tiny', () => {
		const level = createCampaignLevel(70)
		const result = findHintMove(level.board, {
			fast: { maxStates: 1, maxDepth: 1, timeoutMs: 10 },
			strong: { ...HINT_STRONG_BUDGET },
			allowStrongPass: true,
		})
		expect(result.status).toBe('found')
		expect(result.pass).toBe('strong')
		expect(result.move).not.toBeNull()
		expect(isLegalSolverBackedMove(level.board, result.move!)).toBe(true)
	}, 20_000)

	it('failed/cutoff Hint does not imply credit consumption', () => {
		let help = createInitialPuzzleHelpState()
		expect(totalHintCredits(help)).toBe(2)
		const level = createCampaignLevel(90)
		const failed = findHintMove(level.board, {
			fast: { maxStates: 1, maxDepth: 0, timeoutMs: 5 },
			strong: { maxStates: 1, maxDepth: 0, timeoutMs: 5 },
		})
		expect(failed.move).toBeNull()
		// Integration boundary: callers must consume only on success.
		if (failed.status === 'found' && failed.move) {
			help = consumeSuccessfulHint(help)
		}
		expect(canUseHint(help)).toBe(true)
		expect(totalHintCredits(help)).toBe(2)
	})
})
