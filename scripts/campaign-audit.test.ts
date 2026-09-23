import {
	applyMove,
	canPour,
	getHint,
	getLegalMoves,
	isSolved,
	isValidBoard,
	serializeBoard,
	solve,
	type Board,
	type DifficultyTier,
	type Move,
} from '../src/game'
import { createCampaignLevel, getCampaignLevelConfig } from '../src/campaign'
import { minimumSolutionMoves } from '../src/game/generator/difficulty'
import { canonicalKey } from '../src/game/solver'

const CAMPAIGN_COUNT = 100
const PRODUCTION_SOLVER = { maxStates: 250_000, maxDepth: 250, timeoutMs: 4_000 }
const REPRESENTATIVE_LEVELS = [1, 10, 11, 30, 31, 55, 56, 80, 81, 100]

interface AuditLevel {
	level: number
	band: DifficultyTier
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
	generatorTier: DifficultyTier
	solverStatus: 'SOLVED' | 'UNSOLVED'
	cutoff: boolean
	replayValid: boolean
	exactBoardKey: string
	equivalenceKey: string
}

interface BandSummary {
	levels: number
	colorRange: [number, number]
	solutionMoves: Stats
	exploredStates: Stats
	initialLegalMoves: Stats
	difficultyScore: Stats
	completedTubesAtStart: Stats
	outlierLevels: number[]
}

interface Stats {
	min: number
	median: number
	mean: number
	max: number
}

function median(values: number[]): number {
	if (values.length === 0) return 0
	const sorted = [...values].sort((a, b) => a - b)
	const middle = Math.floor(sorted.length / 2)
	return sorted.length % 2 === 0
		? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
		: (sorted[middle] ?? 0)
}

function stats(values: number[]): Stats {
	return {
		min: values.length === 0 ? 0 : Math.min(...values),
		median: median(values),
		mean: values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length,
		max: values.length === 0 ? 0 : Math.max(...values),
	}
}

function round(value: number): number {
	return Math.round(value * 100) / 100
}

function summarizeBand(levels: AuditLevel[], band: DifficultyTier): BandSummary {
	const selected = levels.filter((item) => item.band === band)
	const solutionMoves = selected.map((item) => item.solutionMoveCount)
	const exploredStates = selected.map((item) => item.exploredStates)
	const initialLegalMoves = selected.map((item) => item.initialLegalMoveCount)
	const difficultyScore = selected.map((item) => item.difficultyScore)
	const completedTubesAtStart = selected.map((item) => item.completedTubesAtStart)
	const colors = selected.map((item) => item.colorCount)
	const outlierLevels = selected
		.filter((item) => isTukeyOutlier(item.solutionMoveCount, solutionMoves) || isTukeyOutlier(item.exploredStates, exploredStates))
		.map((item) => item.level)

	return {
		levels: selected.length,
		colorRange: [Math.min(...colors), Math.max(...colors)],
		solutionMoves: stats(solutionMoves),
		exploredStates: stats(exploredStates),
		initialLegalMoves: stats(initialLegalMoves),
		difficultyScore: stats(difficultyScore),
		completedTubesAtStart: stats(completedTubesAtStart),
		outlierLevels,
	}
}

function isTukeyOutlier(value: number, values: number[]): boolean {
	if (values.length < 5) return false
	const sorted = [...values].sort((a, b) => a - b)
	const lowerHalf = sorted.slice(0, Math.floor(sorted.length / 2))
	const upperHalf = sorted.slice(Math.ceil(sorted.length / 2))
	const iqr = median(upperHalf) - median(lowerHalf)
	return value < median(lowerHalf) - 1.5 * iqr || value > median(upperHalf) + 1.5 * iqr
}

function replaySolution(board: Board, moves: Move[]): { valid: boolean; finalBoard: Board } {
	let current = board
	for (const move of moves) {
		if (!canPour(current, move)) return { valid: false, finalBoard: current }
		const next = applyMove(current, move)
		if (next === current || !isValidBoard(next)) return { valid: false, finalBoard: current }
		current = next
	}
	return { valid: isSolved(current), finalBoard: current }
}

function verifyHint(board: Board): string | null {
	if (isSolved(board)) return null
	const move = getHint(board, PRODUCTION_SOLVER)
	if (!move) return 'no hint returned'
	if (!canPour(board, move)) return 'hint move is illegal'
	const next = applyMove(board, move)
	if (next === board || !isValidBoard(next)) return 'hint did not produce a valid board'
	const continuation = solve(next, PRODUCTION_SOLVER)
	if (!continuation.solved || continuation.cutoff) return 'hint result is not solver-solvable'
	return null
}

function verifyRepresentativeHints(levels: Map<number, Board>): { checked: number; failures: string[] } {
	const failures: string[] = []
	let checked = 0
	for (const levelNumber of REPRESENTATIVE_LEVELS) {
		let board = levels.get(levelNumber)
		if (!board) {
			failures.push(`level ${levelNumber}: missing board`)
			continue
		}
		const solution = solve(board, PRODUCTION_SOLVER)
		for (let step = 0; step < 4 && !isSolved(board); step += 1) {
			const failure = verifyHint(board)
			checked += 1
			if (failure) failures.push(`level ${levelNumber}, step ${step}: ${failure}`)
			const move = solution.moves[step]
			if (!move) break
			if (!canPour(board, move)) {
				failures.push(`level ${levelNumber}, step ${step}: production solution move became illegal`)
				break
			}
			board = applyMove(board, move)
		}
	}
	return { checked, failures }
}

function buildAuditReport() {
	const startedAt = Date.now()
	const levels: AuditLevel[] = []
	const boards = new Map<number, Board>()
	const exactDuplicates = new Map<string, number[]>()
	const equivalentDuplicates = new Map<string, number[]>()
	let totalSolverTimeMs = 0
	let illegalSolverPaths = 0
	let solverCutoffs = 0
	let unsolved = 0

	for (let levelNumber = 1; levelNumber <= CAMPAIGN_COUNT; levelNumber += 1) {
		const level = createCampaignLevel(levelNumber)
		const config = getCampaignLevelConfig(levelNumber)
		const result = solve(level.board, PRODUCTION_SOLVER)
		const replay = replaySolution(level.board, result.moves)
		const solverStatus = result.solved && !result.cutoff ? 'SOLVED' : 'UNSOLVED'
		totalSolverTimeMs += result.elapsedMs
		if (solverStatus === 'UNSOLVED') unsolved += 1
		if (result.cutoff) solverCutoffs += 1
		if (!replay.valid) illegalSolverPaths += 1
		boards.set(levelNumber, level.board)

		const exactKey = serializeBoard(level.board)
		const equivalenceKey = canonicalKey(level.board)
		exactDuplicates.set(exactKey, [...(exactDuplicates.get(exactKey) ?? []), levelNumber])
		equivalentDuplicates.set(equivalenceKey, [...(equivalentDuplicates.get(equivalenceKey) ?? []), levelNumber])
		levels.push({
			level: levelNumber,
			band: config.band,
			colorCount: level.metrics.colorCount,
			tubeCount: level.metrics.tubeCount,
			emptyTubeCount: level.metrics.emptyTubeCount,
			solutionMoveCount: result.moveCount,
			exploredStates: result.exploredStates,
			initialLegalMoveCount: level.metrics.initialLegalMoveCount,
			averageBranching: level.metrics.averageBranching,
			deadEndsEncountered: result.deadEndsEncountered,
			completedTubesAtStart: level.metrics.completedTubesAtStart,
			difficultyScore: level.metrics.difficultyScore,
			generatorTier: level.metrics.tier,
			solverStatus,
			cutoff: result.cutoff,
			replayValid: replay.valid,
			exactBoardKey: exactKey,
			equivalenceKey,
		})
	}

	const exactDuplicateGroups = [...exactDuplicates.values()].filter((group) => group.length > 1)
	const equivalentDuplicateGroups = [...equivalentDuplicates.values()].filter((group) => group.length > 1)
	const bands = ['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const
	const bandSummaries = Object.fromEntries(bands.map((band) => [band, summarizeBand(levels, band)])) as Record<DifficultyTier, BandSummary>
	const flaggedLevels = new Set<number>()
	const flags: Array<{ level: number; reasons: string[] }> = []

	for (const item of levels) {
		const reasons: string[] = []
		if (item.solverStatus !== 'SOLVED') reasons.push('solver did not prove solution')
		if (!item.replayValid) reasons.push('solver path replay failed')
		if (item.solutionMoveCount < minimumSolutionMoves(item.band)) reasons.push('below band minimum solution length')
		if (item.completedTubesAtStart > 1) reasons.push('excess completed tubes at start')
		if (isTukeyOutlier(item.solutionMoveCount, levels.filter((candidate) => candidate.band === item.band).map((candidate) => candidate.solutionMoveCount))) reasons.push('solution length outlier within band')
		if (isTukeyOutlier(item.exploredStates, levels.filter((candidate) => candidate.band === item.band).map((candidate) => candidate.exploredStates))) reasons.push('explored-state outlier within band')
		if (item.initialLegalMoveCount < 2) reasons.push('almost no initial legal choice')
		if (reasons.length > 0) {
			flaggedLevels.add(item.level)
			flags.push({ level: item.level, reasons })
		}
	}

	for (let index = 1; index < levels.length; index += 1) {
		const previous = levels[index - 1]!
		const current = levels[index]!
		if (previous.difficultyScore - current.difficultyScore >= 20) {
			flaggedLevels.add(current.level)
			flags.push({ level: current.level, reasons: [`backward difficulty step of ${round(previous.difficultyScore - current.difficultyScore)}`] })
		}
		if (current.difficultyScore - previous.difficultyScore >= 45) {
			flaggedLevels.add(current.level)
			flags.push({ level: current.level, reasons: [`difficulty wall of ${round(current.difficultyScore - previous.difficultyScore)}`] })
		}
	}

	const hintReport = verifyRepresentativeHints(boards)
	const levelOne = boards.get(1)
	const tutorialFirstMoves = levelOne ? getLegalMoves(levelOne) : []
	const tutorialFirstMoveOutcomes = tutorialFirstMoves.map((move) => {
		const next = applyMove(levelOne!, move)
		const result = solve(next, PRODUCTION_SOLVER)
		return { move, solved: result.solved, cutoff: result.cutoff }
	})
	const worst = [...levels].sort((left, right) => right.exploredStates - left.exploredStates)[0]
	const uniqueFlagReasons = new Map<number, Set<string>>()
	for (const flag of flags) {
		const reasons = uniqueFlagReasons.get(flag.level) ?? new Set<string>()
		for (const reason of flag.reasons) reasons.add(reason)
		uniqueFlagReasons.set(flag.level, reasons)
	}
	const normalizedFlags = [...uniqueFlagReasons.entries()].map(([level, reasons]) => ({ level, reasons: [...reasons] }))

	return {
		generatedAt: new Date().toISOString(),
		levelsChecked: levels.length,
		proof: {
			solved: levels.length - unsolved,
			unsolved,
			cutoffs: solverCutoffs,
			illegalSolverPaths,
			exactDuplicateGroups,
			equivalentDuplicateGroups,
		},
		bands: bandSummaries,
		flags: normalizedFlags,
		performance: {
			auditElapsedMs: Date.now() - startedAt,
			totalSolverTimeMs,
			worstLevel: worst?.level ?? null,
			worstExploredStates: worst?.exploredStates ?? 0,
		},
		hints: {
			levels: REPRESENTATIVE_LEVELS,
			checks: hintReport.checked,
			failures: hintReport.failures,
		},
		tutorial: {
			level: 1,
			colorCount: levels[0]?.colorCount ?? 0,
			tubeCount: levels[0]?.tubeCount ?? 0,
			solutionMoves: levels[0]?.solutionMoveCount ?? 0,
			initialLegalMoves: levels[0]?.initialLegalMoveCount ?? 0,
			completedTubesAtStart: levels[0]?.completedTubesAtStart ?? 0,
			firstMoveOutcomes: tutorialFirstMoveOutcomes,
		},
		levels,
	}
}

describe('campaign audit harness', () => {
	it('proves and reports the production campaign', () => {
		const report = buildAuditReport()

		expect(report.levelsChecked).toBe(CAMPAIGN_COUNT)
		expect(report.proof.solved).toBe(CAMPAIGN_COUNT)
		expect(report.proof.unsolved).toBe(0)
		expect(report.proof.cutoffs).toBe(0)
		expect(report.proof.illegalSolverPaths).toBe(0)
		expect(report.proof.exactDuplicateGroups).toEqual([])
		expect(report.proof.equivalentDuplicateGroups).toEqual([])
		expect(report.hints.failures).toEqual([])

		for (const band of ['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const) {
			expect(report.bands[band].levels).toBeGreaterThan(0)
		}

		console.log('CAMPAIGN_AUDIT', JSON.stringify({
			proof: report.proof,
			bands: report.bands,
			flags: report.flags,
			performance: report.performance,
			hints: report.hints,
		}))
	}, 120_000)
})
