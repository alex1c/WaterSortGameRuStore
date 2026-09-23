import {
	applyMove,
	canPour,
	getFreeCapacity,
	getLegalMoves,
	getPourAmount,
	getTopColor,
	getTopGroupSize,
	isSolved,
	serializeBoard,
	deserializeBoard,
} from '../core'
import { canonicalKey } from '../solver'
import type { Board, Move } from '../types'

describe('production water sort core', () => {
	it('uses index 0 as bottom and the last element as top', () => {
		const tube = ['red', 'blue', 'blue']
		expect(getTopColor(tube)).toBe('blue')
		expect(getTopGroupSize(tube)).toBe(2)
		expect(getFreeCapacity(tube)).toBe(1)
	})

	it.each([
		['empty source', [['red'], []], { from: 1, to: 0 }],
		['full destination', [['red'], ['blue', 'blue', 'blue', 'blue']], { from: 0, to: 1 }],
		['different top color', [['red'], ['blue']], { from: 0, to: 1 }],
		['same tube', [['red'], []], { from: 0, to: 0 }],
	] as const)('rejects %s', (_name, board, move) => {
		expect(canPour(board as unknown as Board, move)).toBe(false)
	})

	it('accepts same-color and empty destinations', () => {
		expect(canPour([['red'], ['blue', 'red']], { from: 0, to: 1 })).toBe(true)
		expect(canPour([['red'], []], { from: 0, to: 1 })).toBe(true)
	})

	it('moves the maximum group limited by destination capacity', () => {
		const board: Board = [['red', 'red', 'red'], ['blue', 'blue', 'red'], [], []]
		const move: Move = { from: 0, to: 1 }
		expect(getPourAmount(board, move)).toBe(1)
		const next = applyMove(board, move)
		expect(next).toEqual([['red', 'red'], ['blue', 'blue', 'red', 'red'], [], []])
		expect(board).toEqual([['red', 'red', 'red'], ['blue', 'blue', 'red'], [], []])
	})

	it('invalid applyMove leaves the state unchanged', () => {
		const board: Board = [['red'], ['blue'], []]
		const next = applyMove(board, { from: 0, to: 1 })
		expect(next).toBe(board)
		expect(next).toEqual(board)
	})

	it('requires full monochrome tubes for solved state', () => {
		expect(isSolved([[], ['red', 'red', 'red', 'red'], []])).toBe(true)
		expect(isSolved([[], ['red', 'red'], []])).toBe(false)
		expect(isSolved([[], ['red', 'blue', 'red', 'blue'], []])).toBe(false)
	})

	it('returns deterministic serialization and a defensive round trip', () => {
		const board: Board = [['red', 'blue'], [], ['green']]
		const encoded = serializeBoard(board)
		expect(encoded).toBe('[["red","blue"],[],["green"]]')
		const restored = deserializeBoard(encoded)
		expect(restored).toEqual(board)
		expect(restored).not.toBe(board)
		expect(serializeBoard(restored)).toBe(encoded)
	})

	it('canonicalizes interchangeable tube order without changing tube contents', () => {
		const left: Board = [['red'], [], ['blue', 'red']]
		const right: Board = [['blue', 'red'], ['red'], []]
		expect(canonicalKey(left)).toBe(canonicalKey(right))
	})

	it('emits one representative move for interchangeable empty tubes', () => {
		const moves = getLegalMoves([['red'], [], [], ['blue']])
		expect(moves.filter((move) => move.from === 0 && move.to === 1)).toHaveLength(1)
		expect(moves.some((move) => move.from === 0 && move.to === 2)).toBe(false)
	})
})
