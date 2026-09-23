import type { Board } from '../types'
import { getLegalMoves } from '../core/rules'
import { isCompleteTube } from '../core/state'
import type { SolverResult } from '../solver/solver'

export const DIFFICULTY_TIERS = ['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const
export type DifficultyTier = (typeof DIFFICULTY_TIERS)[number]

export interface DifficultyMetrics {
	colorCount: number
	tubeCount: number
	emptyTubeCount: number
	solutionMoveCount: number
	exploredStates: number
	initialLegalMoveCount: number
	averageBranching: number
	deadEndsEncountered: number
	completedTubesAtStart: number
	difficultyScore: number
	tier: DifficultyTier
}

/**
 * Initial deterministic classifier, intentionally a calibration starting
 * point rather than a claim of player-skill equivalence.
 */
export function classifyDifficulty(score: number): DifficultyTier {
	if (score < 18) return 'BEGINNER'
	if (score < 32) return 'EASY'
	if (score < 55) return 'MEDIUM'
	if (score < 90) return 'HARD'
	return 'EXPERT'
}

export function analyzeDifficulty(board: Board, result: SolverResult): DifficultyMetrics {
	const colors = new Set(board.flat())
	const emptyTubeCount = board.filter((tube) => tube.length === 0).length
	const completedTubesAtStart = board.filter(isCompleteTube).length
	const initialLegalMoveCount = getLegalMoves(board).length
	const difficultyScore =
		result.moveCount +
		colors.size * 2 +
		Math.log2(result.exploredStates + 1) +
		initialLegalMoveCount * 0.35 +
		result.deadEndsEncountered * 0.15

	return {
		colorCount: colors.size,
		tubeCount: board.length,
		emptyTubeCount,
		solutionMoveCount: result.moveCount,
		exploredStates: result.exploredStates,
		initialLegalMoveCount,
		averageBranching: result.exploredStates === 0 ? 0 : result.branchingSum / result.exploredStates,
		deadEndsEncountered: result.deadEndsEncountered,
		completedTubesAtStart,
		difficultyScore,
		tier: classifyDifficulty(difficultyScore),
	}
}

export function minimumSolutionMoves(tier: DifficultyTier): number {
	return { BEGINNER: 2, EASY: 4, MEDIUM: 7, HARD: 10, EXPERT: 14 }[tier]
}

export function defaultScrambleRange(tier: DifficultyTier): { min: number; max: number } {
	return {
		BEGINNER: { min: 8, max: 14 },
		EASY: { min: 12, max: 20 },
		MEDIUM: { min: 18, max: 28 },
		HARD: { min: 26, max: 40 },
		EXPERT: { min: 36, max: 55 },
	}[tier]
}

