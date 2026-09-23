import {
	canPour,
	cloneBoard,
	createInitialSampleBoard,
	freeCapacity,
	getTopColor,
	getTopContiguousCount,
	tryPour,
} from '../../src/game/sampleLogic'
import { SAMPLE_BOARD } from '../../src/game/sampleBoard'
import { TUBE_CAPACITY, type Board } from '../../src/game/types'

describe('sample pouring logic', () => {
	const boardWith = (overrides: Partial<Record<number, Board[number]>>): Board => {
		const board = createInitialSampleBoard()
		for (const [index, tube] of Object.entries(overrides)) {
			board[Number(index)] = tube ?? []
		}
		return board
	}

	it('cannot pour onto a different top color', () => {
		const board = boardWith({
			0: ['red', 'red'],
			1: ['blue'],
		})
		expect(canPour(board, 0, 1)).toBe(false)
		expect(tryPour(board, 0, 1)).toBeNull()
		expect(board[0]).toEqual(['red', 'red'])
		expect(board[1]).toEqual(['blue'])
	})

	it('can pour into an empty tube', () => {
		const board = boardWith({
			0: ['green', 'blue', 'blue'],
			8: [],
		})
		const result = tryPour(board, 0, 8)
		expect(result).not.toBeNull()
		expect(result?.movedCount).toBe(2)
		expect(result?.board[0]).toEqual(['green'])
		expect(result?.board[8]).toEqual(['blue', 'blue'])
	})

	it('can pour onto the same top color', () => {
		const board = boardWith({
			0: ['yellow', 'red'],
			1: ['blue', 'red'],
		})
		const result = tryPour(board, 0, 1)
		expect(result).not.toBeNull()
		expect(result?.movedCount).toBe(1)
		expect(result?.board[0]).toEqual(['yellow'])
		expect(result?.board[1]).toEqual(['blue', 'red', 'red'])
	})

	it('cannot exceed capacity 4', () => {
		const board = boardWith({
			0: ['teal', 'teal', 'teal'],
			1: ['orange', 'teal', 'teal', 'teal'],
		})
		expect(freeCapacity(board[1]!)).toBe(0)
		expect(canPour(board, 0, 1)).toBe(false)
		expect(tryPour(board, 0, 1)).toBeNull()
	})

	it('moves contiguous same-color layers together up to free capacity', () => {
		const board = boardWith({
			0: ['pink', 'purple', 'purple', 'purple'],
			1: ['purple'],
		})
		const result = tryPour(board, 0, 1)
		expect(result).not.toBeNull()
		// Three purples want to move, destination has 3 free slots → all three move.
		expect(result?.movedCount).toBe(3)
		expect(result?.board[0]).toEqual(['pink'])
		expect(result?.board[1]).toEqual(['purple', 'purple', 'purple', 'purple'])
		expect(result?.board[1]?.length).toBe(TUBE_CAPACITY)
	})

	it('partially pours when contiguous group exceeds remaining capacity', () => {
		const board = boardWith({
			0: ['red', 'red', 'red'],
			1: ['blue', 'blue', 'red'],
		})
		const result = tryPour(board, 0, 1)
		expect(result?.movedCount).toBe(1)
		expect(result?.board[0]).toEqual(['red', 'red'])
		expect(result?.board[1]).toEqual(['blue', 'blue', 'red', 'red'])
	})

	it('undo restores the previous board snapshot', () => {
		const initial = createInitialSampleBoard()
		const history: Board[] = []
		const poured = tryPour(initial, 0, 8)
		expect(poured).not.toBeNull()

		history.push(cloneBoard(initial))
		let current = poured!.board

		const previous = history.pop()
		expect(previous).toEqual(initial)
		current = previous!
		expect(current).toEqual(createInitialSampleBoard())
		expect(current).not.toBe(SAMPLE_BOARD)
	})

	it('restart restores the initial sample board', () => {
		const mutated = tryPour(createInitialSampleBoard(), 4, 9)
		expect(mutated).not.toBeNull()
		const restarted = createInitialSampleBoard()
		expect(restarted).toEqual(SAMPLE_BOARD)
		expect(restarted).not.toEqual(mutated!.board)
	})

	it('reports top color and contiguous counts correctly', () => {
		expect(getTopColor([])).toBeNull()
		expect(getTopColor(['red', 'blue', 'blue'])).toBe('blue')
		expect(getTopContiguousCount(['red', 'blue', 'blue'])).toBe(2)
		expect(getTopContiguousCount(['green'])).toBe(1)
		expect(getTopContiguousCount([])).toBe(0)
	})
})
