import type { Board, Move } from '../types'
import { applyMove } from '../core/moves'
import { canonicalKey } from './canonical'
import { getLegalMoves, isSolved } from '../core/rules'
import { isValidBoard } from '../core/state'

export interface SolverOptions {
	/** Maximum unique canonical states to explore before returning cutoff. */
	maxStates?: number
	/** Maximum path depth. Reaching it without a solution is a cutoff. */
	maxDepth?: number
	/** Optional wall-clock guard for phone-safe callers. */
	timeoutMs?: number
}

export interface SolverResult {
	solved: boolean
	moves: Move[]
	moveCount: number
	exploredStates: number
	maxDepthReached: number
	cutoff: boolean
	elapsedMs: number
	/** False because this depth-first search intentionally favors bounded memory. */
	solutionIsOptimal: boolean
	deadEndsEncountered: number
	branchingSum: number
}

const DEFAULT_MAX_STATES = 250_000
const DEFAULT_MAX_DEPTH = 250

interface SearchContext {
	readonly maxStates: number
	readonly maxDepth: number
	readonly deadline: number | null
	readonly visited: Set<string>
	exploredStates: number
	maxDepthReached: number
	cutoff: boolean
	deadEndsEncountered: number
	branchingSum: number
}

/**
 * Bounded depth-first search with canonical visited-state detection.
 *
 * It is complete for a finite board when no guard fires. It is deliberately
 * non-optimal: keeping memory bounded is more useful for generation and a
 * mobile hint path than guaranteeing minimum moves on large boards.
 */
export function solve(board: Board, options: SolverOptions = {}): SolverResult {
	const startedAt = Date.now()
	const maxStates = Math.max(0, options.maxStates ?? DEFAULT_MAX_STATES)
	const maxDepth = Math.max(0, options.maxDepth ?? DEFAULT_MAX_DEPTH)
	const deadline = options.timeoutMs === undefined ? null : startedAt + Math.max(0, options.timeoutMs)

	const context: SearchContext = {
		maxStates,
		maxDepth,
		deadline,
		visited: new Set<string>(),
		exploredStates: 0,
		maxDepthReached: 0,
		cutoff: false,
		deadEndsEncountered: 0,
		branchingSum: 0,
	}

	let solution: Move[] | null = null
	if (!isValidBoard(board)) {
		return createResult(context, false, [], startedAt)
	}
	if (isSolved(board)) {
		return createResult(context, true, [], startedAt, true)
	}

	const search = (current: Board, path: Move[], previousBoard: Board | null, previousMove: Move | null): boolean => {
		if (isSolved(current)) {
			solution = [...path]
			return true
		}
		if (context.exploredStates >= context.maxStates || (context.deadline !== null && Date.now() >= context.deadline)) {
			context.cutoff = true
			return false
		}
		if (path.length >= context.maxDepth) {
			context.cutoff = true
			context.maxDepthReached = Math.max(context.maxDepthReached, path.length)
			return false
		}

		const key = canonicalKey(current)
		if (context.visited.has(key)) {
			return false
		}
		context.visited.add(key)
		context.exploredStates += 1
		context.maxDepthReached = Math.max(context.maxDepthReached, path.length)

		const candidates = getLegalMoves(current)
		context.branchingSum += candidates.length
		let expanded = 0
		for (const move of candidates) {
			const next = applyMove(current, move)
			if (next === current) {
				continue
			}

			// Only prune a reverse when it returns exactly to the parent state.
			// This is safe even for partial pours, where a reverse-looking move
			// can otherwise transfer a different amount and remain useful.
			if (previousBoard && previousMove && move.from === previousMove.to && move.to === previousMove.from) {
				if (canonicalKey(next) === canonicalKey(previousBoard)) {
					continue
				}
			}

			expanded += 1
			if (search(next, [...path, move], current, move)) {
				return true
			}
			if (context.cutoff) {
				return false
			}
		}

		if (expanded === 0) {
			context.deadEndsEncountered += 1
		}
		return false
	}

	search(board, [], null, null)
	return createResult(context, solution !== null, solution ?? [], startedAt)
}

function createResult(
	context: SearchContext,
	solved: boolean,
	moves: Move[],
	startedAt: number,
	solvedInput = false,
): SolverResult {
	return {
		solved,
		moves,
		moveCount: moves.length,
		exploredStates: context.exploredStates,
		maxDepthReached: context.maxDepthReached,
		cutoff: !solved && context.cutoff,
		elapsedMs: Date.now() - startedAt,
		solutionIsOptimal: solvedInput || false,
		deadEndsEncountered: context.deadEndsEncountered,
		branchingSum: context.branchingSum,
	}
}

/** Return the first move from a solver-confirmed solution, if available. */
export function getHint(board: Board, options: SolverOptions = {}): Move | null {
	const result = solve(board, options)
	return result.solved ? (result.moves[0] ?? null) : null
}

