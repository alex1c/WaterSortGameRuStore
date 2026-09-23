import { applyMove, canPour, isSolved } from '../core'
import { getHint, solve } from '../solver'
import type { Board } from '../types'

const twoColorPuzzle: Board = [
	['red', 'red'],
	['blue', 'blue', 'red', 'red'],
	['blue', 'blue'],
	[],
]

const threeColorPuzzle: Board = [
	['red', 'red'],
	['blue', 'blue'],
	['green', 'green'],
	['blue', 'blue', 'red', 'red'],
	['green', 'green'],
	[],
]

describe('solver', () => {
	it('recognizes solved input without searching', () => {
		const result = solve([['red', 'red', 'red', 'red'], [], ['blue', 'blue', 'blue', 'blue']])
		expect(result).toMatchObject({ solved: true, moveCount: 0, cutoff: false, solutionIsOptimal: true })
	})

	it('solves a simple board and returns legal moves reaching solved state', () => {
		const result = solve(twoColorPuzzle, { maxStates: 10_000, maxDepth: 30 })
		expect(result.solved).toBe(true)
		expect(result.cutoff).toBe(false)
		let current = twoColorPuzzle
		for (const move of result.moves) {
			expect(canPour(current, move)).toBe(true)
			current = applyMove(current, move)
		}
		expect(isSolved(current)).toBe(true)
	})

	it('solves a multi-step board deterministically', () => {
		const first = solve(threeColorPuzzle, { maxStates: 50_000, maxDepth: 50 })
		const second = solve(threeColorPuzzle, { maxStates: 50_000, maxDepth: 50 })
		expect(first.solved).toBe(true)
		expect(first.moves).toEqual(second.moves)
		expect(getHint(threeColorPuzzle, { maxStates: 50_000, maxDepth: 50 })).toEqual(first.moves[0])
	})

	it('distinguishes exhaustive unsolvable search from cutoff', () => {
		const impossible: Board = [['red'], ['blue'], [], []]
		const exhausted = solve(impossible, { maxStates: 100_000, maxDepth: 100 })
		expect(exhausted.solved).toBe(false)
		expect(exhausted.cutoff).toBe(false)

		const cutoff = solve(threeColorPuzzle, { maxStates: 1, maxDepth: 1 })
		expect(cutoff.solved).toBe(false)
		expect(cutoff.cutoff).toBe(true)
	})

	it('returns no hint for solved or cutoff boards', () => {
		expect(getHint([['red', 'red', 'red', 'red'], []])).toBeNull()
		expect(getHint(threeColorPuzzle, { maxStates: 1 })).toBeNull()
	})
})
