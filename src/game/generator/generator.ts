import type { Board, ColorId } from '../types'
import { getLegalMoves } from '../core/rules'
import { countColors, isCompleteTube, isValidBoard } from '../core/state'
import { solve, type SolverOptions, type SolverResult } from '../solver/solver'
import { SeededRng } from './rng'
import {
	analyzeDifficulty,
	minimumSolutionMoves,
	type DifficultyMetrics,
	type DifficultyTier,
} from './difficulty'

export interface GenerationConfig {
	colorCount: number
	emptyTubeCount: number
	seed: number | string
	targetDifficulty?: DifficultyTier
	maxAttempts?: number
	solver?: SolverOptions
}

export interface GeneratedLevel {
	board: Board
	metrics: DifficultyMetrics
	seed: number | string
}

export interface GenerationAttemptReport {
	level: GeneratedLevel | null
	candidateAttempts: number
	rejectedCandidates: number
	solverCutoffs: number
}

const DEFAULT_SOLVER: SolverOptions = {
	maxStates: 250_000,
	maxDepth: 250,
	timeoutMs: 4_000,
}

/**
 * Generate candidates by shuffling the exact color multiset into full tubes.
 * This deliberately does not assume a random distribution is playable: every
 * candidate still goes through structural validation and the real solver.
 * Solver verification is the acceptance authority.
 */
export function generateLevel(config: GenerationConfig): GeneratedLevel {
	const report = generateLevelDetailed(config)
	if (report.level) return report.level
	throw new Error(`Unable to generate a verified ${config.targetDifficulty ?? 'unclassified'} level within ${report.candidateAttempts} attempts`)
}

export function generateLevelDetailed(config: GenerationConfig): GenerationAttemptReport {
	validateConfig(config)
	const target = config.targetDifficulty
	const attempts = config.maxAttempts ?? 80
	const solverOptions = { ...DEFAULT_SOLVER, ...config.solver }
	let rejectedCandidates = 0
	let solverCutoffs = 0

	for (let attempt = 0; attempt < attempts; attempt += 1) {
		const rng = new SeededRng(`${String(config.seed)}:${attempt}`)
		const candidate = randomDistribution(config.colorCount, config.emptyTubeCount, rng)

		if (!isStructurallyValidLevel(candidate, config)) {
			rejectedCandidates += 1
			continue
		}
		if (isSolvedCandidate(candidate)) {
			rejectedCandidates += 1
			continue
		}
		const completedAtStart = candidate.filter(isCompleteTube).length
		if (completedAtStart > 1) {
			rejectedCandidates += 1
			continue
		}
		const legalMoveCount = candidate.length === 0 ? 0 : requireLegalMoves(candidate)
		if (legalMoveCount < 2) {
			rejectedCandidates += 1
			continue
		}

		const result = solve(candidate, solverOptions)
		if (result.cutoff) solverCutoffs += 1
		if (!result.solved || result.cutoff) {
			rejectedCandidates += 1
			continue
		}

		const metrics = analyzeDifficulty(candidate, result)
		const minimumMoves = target ? minimumSolutionMoves(target) : 2
		if (metrics.solutionMoveCount < minimumMoves || (target !== undefined && metrics.tier !== target)) {
			rejectedCandidates += 1
			continue
		}

		return {
			level: { board: candidate, metrics, seed: config.seed },
			candidateAttempts: attempt + 1,
			rejectedCandidates,
			solverCutoffs,
		}
	}

	return { level: null, candidateAttempts: attempts, rejectedCandidates, solverCutoffs }
}

/** Structural validation is exported for generator and future content tools. */
export function isStructurallyValidLevel(board: Board, config: Pick<GenerationConfig, 'colorCount' | 'emptyTubeCount'>): boolean {
	if (!isValidBoard(board) || board.length !== config.colorCount + config.emptyTubeCount) return false
	if (board.filter((tube) => tube.length === 0).length !== config.emptyTubeCount) return false
	const counts = countColors(board)
	if (counts.size !== config.colorCount) return false
	return [...counts.values()].every((count) => count === 4)
}

function validateConfig(config: GenerationConfig): void {
	if (!Number.isInteger(config.colorCount) || config.colorCount < 2 || config.colorCount > 12) {
		throw new Error('colorCount must be an integer from 2 through 12')
	}
	if (!Number.isInteger(config.emptyTubeCount) || config.emptyTubeCount < 1) {
		throw new Error('emptyTubeCount must be a positive integer')
	}
	if ((config.maxAttempts ?? 80) < 1) throw new Error('maxAttempts must be positive')
}

function colorIds(colorCount: number): ColorId[] {
	return Array.from({ length: colorCount }, (_, index) => `color-${index + 1}`)
}

function randomDistribution(colorCount: number, emptyTubeCount: number, rng: SeededRng): Board {
	const layers = colorIds(colorCount).flatMap((color) => [color, color, color, color])
	const shuffled = rng.shuffle(layers)
	return [
		...Array.from({ length: colorCount }, (_, index) => shuffled.slice(index * 4, index * 4 + 4)),
		...Array.from({ length: emptyTubeCount }, () => [] as ColorId[]),
	]
}

function isSolvedCandidate(board: Board): boolean {
	return board.every((tube) => tube.length === 0 || (tube.length === 4 && tube.every((color) => color === tube[0])))
}

function requireLegalMoves(board: Board): number {
	return getLegalMoves(board).length
}

/** Useful for bulk QA without exposing mutable internal candidates. */
export function verifyGeneratedLevel(level: GeneratedLevel): SolverResult {
	const result = solve(level.board, DEFAULT_SOLVER)
	if (!result.solved || result.cutoff) throw new Error('Generated level failed solver verification')
	return result
}
