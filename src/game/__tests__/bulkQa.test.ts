import { runBulkGenerationQa } from '../generator'

describe('bulk generation QA harness', () => {
	it('runs representative deterministic tier batches', () => {
		const startedAt = Date.now()
		const report = runBulkGenerationQa([
			{ colorCount: 3, emptyTubeCount: 2, targetDifficulty: 'BEGINNER', maxAttempts: 20, solver: { maxStates: 50_000, maxDepth: 150, timeoutMs: 1_000 } },
			{ colorCount: 5, emptyTubeCount: 2, targetDifficulty: 'EASY', maxAttempts: 20, solver: { maxStates: 50_000, maxDepth: 150, timeoutMs: 1_000 } },
			{ colorCount: 7, emptyTubeCount: 2, targetDifficulty: 'MEDIUM', maxAttempts: 20, solver: { maxStates: 50_000, maxDepth: 150, timeoutMs: 1_000 } },
			{ colorCount: 9, emptyTubeCount: 2, targetDifficulty: 'HARD', maxAttempts: 20, solver: { maxStates: 50_000, maxDepth: 150, timeoutMs: 1_000 } },
			{ colorCount: 11, emptyTubeCount: 2, targetDifficulty: 'EXPERT', maxAttempts: 20, solver: { maxStates: 50_000, maxDepth: 150, timeoutMs: 1_000 } },
		], 20)

		console.log('BULK_QA', JSON.stringify({
			elapsedMs: Date.now() - startedAt,
			attempted: report.candidateAttempts,
			accepted: report.acceptedLevels,
			rejected: report.rejectedCandidates,
			cutoffs: report.solverCutoffs,
			duplicates: report.duplicateStates,
			meanMoves: report.meanSolutionLength,
			medianMoves: report.medianSolutionLength,
			meanStates: report.meanExploredStates,
			medianStates: report.medianExploredStates,
			worstStates: report.worstExploredStates,
		}))
		expect(report.acceptedLevels).toBe(100)
		expect(report.solverCutoffs).toBe(0)
		expect(report.duplicateStates).toBe(0)
	})
})
