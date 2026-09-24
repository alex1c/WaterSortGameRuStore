import {
	createFreePlayPuzzle,
	createFreePlaySeed,
	FREE_PLAY_COLOR_COUNT,
	FREE_PLAY_EMPTY_TUBE_COUNT,
} from '../freePlay'
import { isSolved, serializeBoard, solve } from '../game'
import { parsePersistedGameState } from '../storage/parse'
import { STORAGE_SCHEMA_VERSION } from '../storage/types'
import {
	createEmptyStatistics,
	recordFreePlayCompletion,
	recordPour,
} from '../statistics'
import {
	createEmptyAchievementState,
	evaluateAchievements,
	getAchievementDefinition,
} from '../achievements'
import { createCampaignLevel } from '../campaign'
import { resolveBackTarget } from '../navigation/types'

const PRODUCTION_SOLVER = { maxStates: 250_000, maxDepth: 250, timeoutMs: 4_000 }

describe('Phase 8C Free Play generation', () => {
	it.each([
		['BEGINNER', 3],
		['EASY', 5],
		['MEDIUM', 7],
		['HARD', 9],
		['EXPERT', 11],
	] as const)(
		'%s generates a solver-confirmed puzzle with %i colors',
		(difficulty, colors) => {
			expect(FREE_PLAY_COLOR_COUNT[difficulty]).toBe(colors)
			const seed = createFreePlaySeed(1, difficulty)
			const result = createFreePlayPuzzle(difficulty, seed)
			expect(result.ok).toBe(true)
			if (!result.ok) return
			expect(result.level.metrics.colorCount).toBe(colors)
			expect(result.level.metrics.emptyTubeCount).toBe(
				FREE_PLAY_EMPTY_TUBE_COUNT,
			)
			expect(isSolved(result.level.board)).toBe(false)
			const solved = solve(result.level.board, PRODUCTION_SOLVER)
			expect(solved.solved).toBe(true)
			expect(solved.cutoff).toBe(false)
		},
		60_000,
	)

	it('same seed reproduces the same initial board', () => {
		const seed = createFreePlaySeed(42, 'MEDIUM')
		const a = createFreePlayPuzzle('MEDIUM', seed)
		const b = createFreePlayPuzzle('MEDIUM', seed)
		expect(a.ok && b.ok).toBe(true)
		if (!a.ok || !b.ok) return
		expect(serializeBoard(a.level.board)).toBe(serializeBoard(b.level.board))
	}, 30_000)

	it('different seeds can produce different puzzles', () => {
		const a = createFreePlayPuzzle('HARD', createFreePlaySeed(1, 'HARD'))
		const b = createFreePlayPuzzle('HARD', createFreePlaySeed(2, 'HARD'))
		expect(a.ok && b.ok).toBe(true)
		if (!a.ok || !b.ok) return
		expect(serializeBoard(a.level.board)).not.toBe(serializeBoard(b.level.board))
	}, 30_000)
})

describe('Phase 8C Free Play persistence', () => {
	it('migrates v4 saves to v5 with empty Free Play', () => {
		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: 4,
				currentLevel: 27,
				highestUnlockedLevel: 27,
				campaignComplete: false,
				tutorialCompleted: true,
				session: null,
				settings: {
					animationSpeed: 'normal',
					hapticsEnabled: true,
					soundsEnabled: true,
					colorMode: 'normal',
				},
				statistics: { levelsCompleted: 26, totalPours: 100 },
				achievements: { unlockedIds: [], notifiedIds: [] },
			}),
		)
		expect(parsed.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(parsed.currentLevel).toBe(27)
		expect(parsed.statistics.levelsCompleted).toBe(26)
		expect(parsed.freePlay.session).toBeNull()
		expect(parsed.freePlay.seedCounter).toBe(0)
	})

	it('round-trips Free Play session without touching Campaign boards', () => {
		const campaign = createCampaignLevel(12)
		const free = createFreePlayPuzzle('EXPERT', createFreePlaySeed(7, 'EXPERT'))
		expect(free.ok).toBe(true)
		if (!free.ok) return

		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: 5,
				currentLevel: 12,
				highestUnlockedLevel: 26,
				campaignComplete: false,
				tutorialCompleted: true,
				session: {
					levelNumber: 12,
					seed: String(campaign.seed),
					campaignBand: campaign.campaignBand,
					initialBoard: campaign.board,
					currentBoard: campaign.board,
					moveHistory: [],
					moveCount: 0,
				},
				settings: {
					animationSpeed: 'normal',
					hapticsEnabled: true,
					soundsEnabled: true,
					colorMode: 'normal',
				},
				statistics: createEmptyStatistics(),
				achievements: createEmptyAchievementState(),
				freePlay: {
					seedCounter: 7,
					session: {
						difficulty: 'EXPERT',
						seed: createFreePlaySeed(7, 'EXPERT'),
						initialBoard: free.level.board,
						currentBoard: free.level.board,
						moveHistory: [],
						moveCount: 10,
						attempt: {
							usedHint: false,
							usedUndo: false,
							usedRestart: false,
						},
						isSolved: false,
					},
				},
			}),
		)

		expect(parsed.session?.levelNumber).toBe(12)
		expect(parsed.session?.currentBoard).toEqual(campaign.board)
		expect(parsed.freePlay.session?.difficulty).toBe('EXPERT')
		expect(parsed.freePlay.session?.moveCount).toBe(10)
		expect(parsed.freePlay.session?.currentBoard).toEqual(free.level.board)
		expect(parsed.freePlay.session?.currentBoard).not.toEqual(campaign.board)
	}, 30_000)

	it('discards corrupt Free Play without destroying Campaign', () => {
		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: 5,
				currentLevel: 5,
				highestUnlockedLevel: 5,
				campaignComplete: false,
				tutorialCompleted: true,
				session: null,
				settings: {
					animationSpeed: 'fast',
					hapticsEnabled: false,
					soundsEnabled: true,
					colorMode: 'normal',
				},
				statistics: { levelsCompleted: 4 },
				achievements: { unlockedIds: [], notifiedIds: [] },
				freePlay: { seedCounter: 'bad', session: { difficulty: 'NOPE' } },
			}),
		)
		expect(parsed.currentLevel).toBe(5)
		expect(parsed.settings.animationSpeed).toBe('fast')
		expect(parsed.freePlay.session).toBeNull()
		expect(parsed.freePlay.seedCounter).toBe(0)
	})
})

describe('Phase 8C Free Play statistics and achievements', () => {
	it('counts Free Play pours without campaign level progress', () => {
		let stats = createEmptyStatistics()
		stats = recordPour(stats)
		stats = recordFreePlayCompletion(stats, 'EXPERT')
		expect(stats.totalPours).toBe(1)
		expect(stats.freePlayCompleted).toBe(1)
		expect(stats.freePlayCompletedByDifficulty.EXPERT).toBe(1)
		expect(stats.levelsCompleted).toBe(0)
		expect(stats.completedByDifficulty.EXPERT).toBe(0)
	})

	it('Free Play Expert can unlock expert without campaign milestones', () => {
		let stats = createEmptyStatistics()
		stats = recordFreePlayCompletion(stats, 'EXPERT')
		const evaluated = evaluateAchievements(stats, createEmptyAchievementState())
		expect(evaluated.newlyUnlocked).toContain('expert')
		expect(evaluated.newlyUnlocked).not.toContain('first_order')
		expect(evaluated.newlyUnlocked).not.toContain('sort_master')
		expect(evaluated.newlyUnlocked).not.toContain('veteran_250')
		expect(getAchievementDefinition('sort_master')?.progressOf(stats)).toBe(0)
		expect(getAchievementDefinition('legend_1000')?.progressOf(stats)).toBe(0)
	})
})

describe('Phase 8C Free Play navigation', () => {
	it('Free Play routes return Home on Back', () => {
		expect(
			resolveBackTarget([{ name: 'home' }, { name: 'free_play' }]),
		).toBe('home')
		expect(
			resolveBackTarget([{ name: 'home' }, { name: 'free_play_game' }]),
		).toBe('home')
	})
})
