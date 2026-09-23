import { deserializeBoard, isSolved } from '../core'
import {
	generateLevel,
	isStructurallyValidLevel,
	verifyGeneratedLevel,
} from '../generator'

describe('seeded level generator', () => {
	const config = { colorCount: 3, emptyTubeCount: 2, seed: 'phase2-test', maxAttempts: 80 }

	it('is reproducible and structurally valid', () => {
		const first = generateLevel(config)
		const second = generateLevel(config)
		expect(first.board).toEqual(second.board)
		expect(first.metrics).toEqual(second.metrics)
		expect(isStructurallyValidLevel(first.board, config)).toBe(true)
		expect(first.board).not.toEqual([['color-1', 'color-1', 'color-1', 'color-1'], ['color-2', 'color-2', 'color-2', 'color-2'], ['color-3', 'color-3', 'color-3', 'color-3'], [], []])
		expect(isSolved(first.board)).toBe(false)
	})

	it('has exactly four layers of every generated color and expected empties', () => {
		const level = generateLevel({ ...config, seed: 2718 })
		const counts = new Map<string, number>()
		for (const tube of level.board) {
			expect(tube.length).toBeLessThanOrEqual(4)
			for (const color of tube) counts.set(color, (counts.get(color) ?? 0) + 1)
		}
		expect(level.board).toHaveLength(5)
		expect(level.board.filter((tube) => tube.length === 0)).toHaveLength(2)
		expect([...counts.values()]).toEqual([4, 4, 4])
		expect(verifyGeneratedLevel(level).solved).toBe(true)
	})

	it('usually varies with seed', () => {
		const first = generateLevel({ ...config, seed: 'seed-a' })
		const second = generateLevel({ ...config, seed: 'seed-b' })
		expect(JSON.stringify(first.board)).not.toBe(JSON.stringify(second.board))
	})

	it('round trips generated state through deterministic serialization', () => {
		const level = generateLevel(config)
		expect(deserializeBoard(JSON.stringify(level.board))).toEqual(level.board)
	})
})
