/**
 * DEVELOPMENT-ONLY Hint budget verification harness for PH10.1.
 *
 * Run separately from normal Jest:
 *   npm run qa:hint-budget
 *
 * Desktop timings are informational only and do not prove Android runtime.
 */
import { createCampaignLevel, getCampaignDifficultyBand } from '../src/campaign'
import { solve, type Board } from '../src/game'
import {
	appendEmptyTube,
	findHintMove,
	HINT_FAST_BUDGET,
	HINT_STRONG_BUDGET,
} from '../src/help'
import {
	createDailyPuzzle,
	createDailySeed,
	getDailyDifficulty,
} from '../src/daily'
import {
	createFreePlayPuzzle,
	createFreePlaySeed,
} from '../src/freePlay'

describe('hint budget verification (dev-only)', () => {
	it('reports final PH10.1 budgets on representative boards', () => {
		const hard = createCampaignLevel(70)
		const expert = createCampaignLevel(90)
		const worst = createCampaignLevel(446)
		const last = createCampaignLevel(1000)
		expect(getCampaignDifficultyBand(70)).toBe('HARD')
		expect(getCampaignDifficultyBand(90)).toBe('EXPERT')

		const free = createFreePlayPuzzle('EXPERT', createFreePlaySeed(7, 'EXPERT'))
		expect(free.ok).toBe(true)
		const dailyDate = '2026-09-25'
		expect(getDailyDifficulty(dailyDate)).toBe('EXPERT')
		const daily = createDailyPuzzle(
			getDailyDifficulty(dailyDate),
			createDailySeed(dailyDate),
		)
		expect(daily.ok).toBe(true)

		const cases: { name: string; board: Board }[] = [
			{ name: 'Campaign HARD L70', board: hard.board },
			{ name: 'Campaign EXPERT L90', board: expert.board },
			{ name: 'Campaign L446', board: worst.board },
			{ name: 'Campaign L1000', board: last.board },
			{ name: 'FreePlay EXPERT seed7', board: free.ok ? free.level.board : [] },
			{ name: 'Daily EXPERT 2026-09-25', board: daily.ok ? daily.level.board : [] },
			{ name: '14-tube assisted L90', board: appendEmptyTube(expert.board) },
		]

		// eslint-disable-next-line no-console
		console.log('\nPH10.1_FINAL_HINT_BUDGETS')
		// eslint-disable-next-line no-console
		console.log(
			`FAST=${HINT_FAST_BUDGET.maxStates}/${HINT_FAST_BUDGET.maxDepth}/${HINT_FAST_BUDGET.timeoutMs}`,
		)
		// eslint-disable-next-line no-console
		console.log(
			`STRONG=${HINT_STRONG_BUDGET.maxStates}/${HINT_STRONG_BUDGET.maxDepth}/${HINT_STRONG_BUDGET.timeoutMs}`,
		)

		for (const entry of cases) {
			const started = Date.now()
			const hint = findHintMove(entry.board)
			const elapsedMs = Date.now() - started
			const probe = solve(entry.board, {
				...HINT_FAST_BUDGET,
			})
			// eslint-disable-next-line no-console
			console.log(
				[
					entry.name,
					hint.pass,
					`states=${hint.exploredStates}`,
					`probeStates=${probe.exploredStates}`,
					`ms=${elapsedMs}`,
					hint.status,
				].join(' | '),
			)
			expect(hint.status).toBe('found')
			expect(hint.move).not.toBeNull()
		}

		const pathological = findHintMove(worst.board, {
			fast: { maxStates: 2, maxDepth: 1, timeoutMs: 20 },
			strong: { maxStates: 3, maxDepth: 1, timeoutMs: 20 },
		})
		// eslint-disable-next-line no-console
		console.log(
			`Pathological tiny budget | ${pathological.pass} | ${pathological.status}`,
		)
		expect(pathological.status).toBe('cutoff')
		expect(pathological.move).toBeNull()
	}, 60_000)
})
