import { generateLevelDetailed, type GenerationConfig } from './generator'
import type { DifficultyMetrics, DifficultyTier } from './difficulty'
import { serializeBoard } from '../core/serialize'

export interface BulkQaReport {
	seedsPerConfiguration: number
	configurations: number
	candidateAttempts: number
	acceptedLevels: number
	rejectedCandidates: number
	solverCutoffs: number
	duplicateStates: number
	meanSolutionLength: number
	medianSolutionLength: number
	meanExploredStates: number
	medianExploredStates: number
	worstExploredStates: number
	byTier: Partial<Record<DifficultyTier, number>>
	metrics: DifficultyMetrics[]
}

/** Run deterministic generation batches and collect engineering QA metrics. */
export function runBulkGenerationQa(
	configs: readonly Omit<GenerationConfig, 'seed'>[],
	seedsPerConfiguration = 20,
): BulkQaReport {
	const metrics: DifficultyMetrics[] = []
	let candidateAttempts = 0
	let acceptedLevels = 0
	let rejectedCandidates = 0
	let solverCutoffs = 0
	let duplicateStates = 0
	const seenStates = new Set<string>()

	for (const config of configs) {
		for (let seedIndex = 0; seedIndex < seedsPerConfiguration; seedIndex += 1) {
			const report = generateLevelDetailed({ ...config, seed: `${config.targetDifficulty ?? 'level'}-${seedIndex}` })
			candidateAttempts += report.candidateAttempts
			rejectedCandidates += report.rejectedCandidates
			solverCutoffs += report.solverCutoffs
			if (report.level) {
				const key = serializeBoard(report.level.board)
				if (seenStates.has(key)) {
					duplicateStates += 1
					rejectedCandidates += 1
					continue
				}
				seenStates.add(key)
				acceptedLevels += 1
				metrics.push(report.level.metrics)
			}
		}
	}

	const solutionLengths = metrics.map((item) => item.solutionMoveCount)
	const exploredStates = metrics.map((item) => item.exploredStates)
	return {
		seedsPerConfiguration,
		configurations: configs.length,
		candidateAttempts,
		acceptedLevels,
		rejectedCandidates,
		solverCutoffs,
		duplicateStates,
		meanSolutionLength: mean(solutionLengths),
		medianSolutionLength: median(solutionLengths),
		meanExploredStates: mean(exploredStates),
		medianExploredStates: median(exploredStates),
		worstExploredStates: exploredStates.length === 0 ? 0 : Math.max(...exploredStates),
		byTier: metrics.reduce<Partial<Record<DifficultyTier, number>>>((counts, item) => {
			counts[item.tier] = (counts[item.tier] ?? 0) + 1
			return counts
		}, {}),
		metrics,
	}
}

function mean(values: number[]): number {
	return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

function median(values: number[]): number {
	if (values.length === 0) return 0
	const sorted = [...values].sort((a, b) => a - b)
	const middle = Math.floor(sorted.length / 2)
	return sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : (sorted[middle] ?? 0)
}
