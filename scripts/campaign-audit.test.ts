import {
	applyMove,
	canPour,
	countColors,
	isSolved,
	isValidBoard,
	serializeBoard,
	solve,
	TUBE_CAPACITY,
	type Board,
	type DifficultyTier,
	type Move,
} from '../src/game'
import {
	CAMPAIGN_LEVEL_COUNT,
	createCampaignLevel,
	getCampaignLevelConfig,
} from '../src/campaign'
import { canonicalKey } from '../src/game/solver'

const PRODUCTION_SOLVER = { maxStates: 250_000, maxDepth: 250, timeoutMs: 4_000 }
const REPRESENTATIVE_LEVELS = [101, 250, 500, 750, 1000]
const GROUPS: Array<{ name: string; from: number; to: number }> = [
	{ name: '1–100', from: 1, to: 100 },
	{ name: '101–200', from: 101, to: 200 },
	{ name: '201–500', from: 201, to: 500 },
	{ name: '501–1000', from: 501, to: 1000 },
]

interface AuditLevel {
	level: number
	band: DifficultyTier
	colorCount: number
	tubeCount: number
	solutionMoveCount: number
	exploredStates: number
	solverStatus: 'SOLVED' | 'UNSOLVED'
	cutoff: boolean
	replayValid: boolean
	colorMultiplicityValid: boolean
	exactBoardKey: string
	equivalenceKey: string
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
		mean:
			values.length === 0
				? 0
				: values.reduce((sum, value) => sum + value, 0) / values.length,
		max: values.length === 0 ? 0 : Math.max(...values),
	}
}

function round(value: number): number {
	return Math.round(value * 100) / 100
}

function replaySolution(board: Board, moves: Move[]): boolean {
	let current = board
	for (const move of moves) {
		if (!canPour(current, move)) return false
		const next = applyMove(current, move)
		if (next === current || !isValidBoard(next)) return false
		current = next
	}
	return isSolved(current)
}

function hasValidColorMultiplicity(board: Board): boolean {
	const counts = countColors(board)
	for (const count of counts.values()) {
		if (count !== TUBE_CAPACITY) return false
	}
	return true
}

function summarizeGroup(levels: AuditLevel[], from: number, to: number) {
	const selected = levels.filter((item) => item.level >= from && item.level <= to)
	const bands: Record<string, number> = {}
	for (const item of selected) {
		bands[item.band] = (bands[item.band] ?? 0) + 1
	}
	const colors = selected.map((item) => item.colorCount)
	const tubes = selected.map((item) => item.tubeCount)
	const moves = selected.map((item) => item.solutionMoveCount)
	const explored = selected.map((item) => item.exploredStates)
	return {
		levels: selected.length,
		difficultyDistribution: bands,
		colors: { min: Math.min(...colors), max: Math.max(...colors) },
		tubes: { min: Math.min(...tubes), max: Math.max(...tubes) },
		solutionMoves: {
			min: stats(moves).min,
			median: round(stats(moves).median),
			mean: round(stats(moves).mean),
			max: stats(moves).max,
		},
		exploredStates: {
			min: stats(explored).min,
			median: round(stats(explored).median),
			mean: round(stats(explored).mean),
			max: stats(explored).max,
		},
	}
}

function buildAuditReport() {
	const startedAt = Date.now()
	const levels: AuditLevel[] = []
	const exactDuplicates = new Map<string, number[]>()
	const equivalentDuplicates = new Map<string, number[]>()
	let solverCutoffs = 0
	let unsolved = 0
	let illegalSolverPaths = 0
	let invalidMultiplicity = 0
	const representative: Array<{
		level: number
		band: DifficultyTier
		solutionMoves: number
		exploredStates: number
		elapsedMs: number
	}> = []

	for (let levelNumber = 1; levelNumber <= CAMPAIGN_LEVEL_COUNT; levelNumber += 1) {
		const level = createCampaignLevel(levelNumber)
		const config = getCampaignLevelConfig(levelNumber)
		expect(isSolved(level.board)).toBe(false)
		expect(isValidBoard(level.board)).toBe(true)

		const result = solve(level.board, PRODUCTION_SOLVER)
		const replayValid = replaySolution(level.board, result.moves)
		const colorMultiplicityValid = hasValidColorMultiplicity(level.board)
		const solverStatus =
			result.solved && !result.cutoff ? 'SOLVED' : 'UNSOLVED'
		if (solverStatus === 'UNSOLVED') unsolved += 1
		if (result.cutoff) solverCutoffs += 1
		if (!replayValid) illegalSolverPaths += 1
		if (!colorMultiplicityValid) invalidMultiplicity += 1

		const exactKey = serializeBoard(level.board)
		const equivalenceKey = canonicalKey(level.board)
		exactDuplicates.set(exactKey, [
			...(exactDuplicates.get(exactKey) ?? []),
			levelNumber,
		])
		equivalentDuplicates.set(equivalenceKey, [
			...(equivalentDuplicates.get(equivalenceKey) ?? []),
			levelNumber,
		])

		levels.push({
			level: levelNumber,
			band: config.band,
			colorCount: level.metrics.colorCount,
			tubeCount: level.metrics.tubeCount,
			solutionMoveCount: result.moveCount,
			exploredStates: result.exploredStates,
			solverStatus,
			cutoff: result.cutoff,
			replayValid,
			colorMultiplicityValid,
			exactBoardKey: exactKey,
			equivalenceKey,
		})

		if (REPRESENTATIVE_LEVELS.includes(levelNumber)) {
			representative.push({
				level: levelNumber,
				band: config.band,
				solutionMoves: result.moveCount,
				exploredStates: result.exploredStates,
				elapsedMs: result.elapsedMs,
			})
		}
	}

	const exactDuplicateGroups = [...exactDuplicates.values()].filter(
		(group) => group.length > 1,
	)
	const equivalentDuplicateGroups = [...equivalentDuplicates.values()].filter(
		(group) => group.length > 1,
	)
	const worst = [...levels].sort(
		(left, right) => right.exploredStates - left.exploredStates,
	)[0]

	return {
		levelsChecked: levels.length,
		proof: {
			solved: levels.length - unsolved,
			unsolved,
			cutoffs: solverCutoffs,
			illegalSolverPaths,
			invalidMultiplicity,
			exactDuplicateGroups,
			equivalentDuplicateGroups,
		},
		groups: Object.fromEntries(
			GROUPS.map((group) => [
				group.name,
				summarizeGroup(levels, group.from, group.to),
			]),
		),
		representative,
		performance: {
			auditElapsedMs: Date.now() - startedAt,
			worstLevel: worst?.level ?? null,
			worstExploredStates: worst?.exploredStates ?? 0,
		},
	}
}

describe('campaign 1000-level audit harness', () => {
	it('proves Levels 1–1000 with group stats', () => {
		const report = buildAuditReport()

		expect(report.levelsChecked).toBe(CAMPAIGN_LEVEL_COUNT)
		expect(report.proof.solved).toBe(CAMPAIGN_LEVEL_COUNT)
		expect(report.proof.unsolved).toBe(0)
		expect(report.proof.cutoffs).toBe(0)
		expect(report.proof.illegalSolverPaths).toBe(0)
		expect(report.proof.invalidMultiplicity).toBe(0)
		expect(report.proof.exactDuplicateGroups).toEqual([])
		// Equivalent duplicates among 101+ vs older levels are reported but
		// must be fixed via newer-level seed overrides before shipping.
		expect(report.proof.equivalentDuplicateGroups).toEqual([])

		console.log(
			'CAMPAIGN_AUDIT_1000',
			JSON.stringify({
				proof: report.proof,
				groups: report.groups,
				representative: report.representative,
				performance: report.performance,
			}),
		)
	}, 900_000)
})
