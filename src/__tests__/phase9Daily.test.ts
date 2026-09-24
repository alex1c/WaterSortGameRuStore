import {
	buildDailyHistory,
	createDailyPuzzle,
	createDailySeed,
	createEmptyDailyState,
	daysBetweenLocalDates,
	formatLocalDateRu,
	getActiveCurrentStreak,
	getDailyDifficulty,
	localDateKey,
	nextLocalDateKey,
	parseDailyState,
	previousLocalDateKey,
	recordDailyCompletion,
	computeBestStreakFromKeys,
} from '../daily'
import { isSolved, serializeBoard, solve } from '../game'
import { parsePersistedGameState } from '../storage/parse'
import { STORAGE_SCHEMA_VERSION } from '../storage/types'
import {
	createEmptyStatistics,
	recordDailyStatsCompletion,
	recordPour,
} from '../statistics'
import { createCampaignLevel } from '../campaign'
import { createFreePlayPuzzle, createFreePlaySeed } from '../freePlay'
import { resolveBackTarget } from '../navigation/types'
import {
	createEmptyAchievementState,
	evaluateAchievements,
	getAchievementDefinition,
} from '../achievements'

const PRODUCTION_SOLVER = { maxStates: 250_000, maxDepth: 250, timeoutMs: 4_000 }

describe('Phase 9 Daily date core', () => {
	it('builds local date keys from injected dates (not UTC)', () => {
		const date = new Date(2026, 8, 24, 23, 30, 0, 0) // local Sep 24
		expect(localDateKey(date)).toBe('2026-09-24')
	})

	it('same local date → same seed; adjacent → different', () => {
		expect(createDailySeed('2026-09-24')).toBe(
			'watersort-daily-v1-2026-09-24',
		)
		expect(createDailySeed('2026-09-24')).toBe(createDailySeed('2026-09-24'))
		expect(createDailySeed('2026-09-24')).not.toBe(
			createDailySeed('2026-09-25'),
		)
	})

	it('previous/next and daysBetween at month and year boundaries', () => {
		expect(previousLocalDateKey('2026-03-01')).toBe('2026-02-28')
		expect(nextLocalDateKey('2026-02-28')).toBe('2026-03-01')
		expect(previousLocalDateKey('2025-01-01')).toBe('2024-12-31')
		expect(nextLocalDateKey('2024-12-31')).toBe('2025-01-01')
		expect(daysBetweenLocalDates('2026-09-22', '2026-09-24')).toBe(2)
		expect(daysBetweenLocalDates('2026-09-24', '2026-09-24')).toBe(0)
	})

	it('handles leap day', () => {
		expect(nextLocalDateKey('2024-02-28')).toBe('2024-02-29')
		expect(nextLocalDateKey('2024-02-29')).toBe('2024-03-01')
		expect(previousLocalDateKey('2024-03-01')).toBe('2024-02-29')
	})

	it('formats Russian UI dates without exposing ISO keys', () => {
		expect(formatLocalDateRu('2026-09-24')).toBe('24 сентября')
	})

	it('difficulty is deterministic from date key and not always BEGINNER/EXPERT', () => {
		const keys = [
			'2026-09-20',
			'2026-09-21',
			'2026-09-22',
			'2026-09-23',
			'2026-09-24',
			'2026-09-25',
			'2026-09-26',
		]
		const diffs = keys.map(getDailyDifficulty)
		expect(new Set(diffs).has('MEDIUM')).toBe(true)
		expect(new Set(diffs).has('HARD')).toBe(true)
		expect(new Set(diffs).has('EXPERT')).toBe(true)
		expect(diffs.every((d) => d === 'MEDIUM' || d === 'HARD' || d === 'EXPERT')).toBe(
			true,
		)
		expect(getDailyDifficulty('2026-09-24')).toBe(
			getDailyDifficulty('2026-09-24'),
		)
	})
})

describe('Phase 9 Daily generation', () => {
	it('same seed reproduces the same solver-confirmed board', () => {
		const seed = createDailySeed('2026-09-24')
		const difficulty = getDailyDifficulty('2026-09-24')
		const a = createDailyPuzzle(difficulty, seed)
		const b = createDailyPuzzle(difficulty, seed)
		expect(a.ok && b.ok).toBe(true)
		if (!a.ok || !b.ok) return
		expect(serializeBoard(a.level.board)).toBe(serializeBoard(b.level.board))
		expect(isSolved(a.level.board)).toBe(false)
		const solved = solve(a.level.board, PRODUCTION_SOLVER)
		expect(solved.solved).toBe(true)
	}, 60_000)
})

describe('Phase 9 Daily streak', () => {
	it('consecutive completions build streak 3', () => {
		let state = createEmptyDailyState()
		state = recordDailyCompletion(state, '2026-09-22')
		state = recordDailyCompletion(state, '2026-09-23')
		state = recordDailyCompletion(state, '2026-09-24')
		expect(state.currentStreak).toBe(3)
		expect(state.bestStreak).toBe(3)
		expect(state.completedDateKeys).toEqual([
			'2026-09-22',
			'2026-09-23',
			'2026-09-24',
		])
	})

	it('gap resets current streak to 1; best preserved', () => {
		let state = createEmptyDailyState()
		state = recordDailyCompletion(state, '2026-09-22')
		state = recordDailyCompletion(state, '2026-09-24')
		expect(state.currentStreak).toBe(1)
		expect(state.bestStreak).toBe(1)
	})

	it('same date twice is idempotent', () => {
		let state = createEmptyDailyState()
		state = recordDailyCompletion(state, '2026-09-24')
		const once = { ...state, completedDateKeys: [...state.completedDateKeys] }
		state = recordDailyCompletion(state, '2026-09-24')
		expect(state.currentStreak).toBe(once.currentStreak)
		expect(state.bestStreak).toBe(once.bestStreak)
		expect(state.completedDateKeys).toEqual(once.completedDateKeys)
	})

	it('last completed yesterday keeps streak extendable', () => {
		let state = createEmptyDailyState()
		state = recordDailyCompletion(state, '2026-09-23')
		expect(getActiveCurrentStreak(state, '2026-09-24')).toBe(1)
		expect(getActiveCurrentStreak(state, '2026-09-25')).toBe(0)
	})

	it('best streak never decreases when clock moves backward', () => {
		let state = createEmptyDailyState()
		state = recordDailyCompletion(state, '2026-09-20')
		state = recordDailyCompletion(state, '2026-09-21')
		state = recordDailyCompletion(state, '2026-09-22')
		expect(state.bestStreak).toBe(3)
		state = recordDailyCompletion(state, '2026-09-21')
		expect(state.bestStreak).toBe(3)
		expect(state.completedDateKeys.filter((k) => k === '2026-09-21')).toHaveLength(
			1,
		)
	})

	it('computeBestStreakFromKeys finds longest run', () => {
		expect(
			computeBestStreakFromKeys([
				'2026-09-01',
				'2026-09-02',
				'2026-09-05',
				'2026-09-06',
				'2026-09-07',
				'2026-09-08',
			]),
		).toBe(4)
	})

	it('history cells mark completed / today without inventing future misses', () => {
		const cells = buildDailyHistory(
			'2026-09-24',
			['2026-09-22', '2026-09-24'],
			5,
		)
		expect(cells).toHaveLength(5)
		expect(cells[cells.length - 1]?.isToday).toBe(true)
		expect(cells.find((c) => c.dateKey === '2026-09-22')?.completed).toBe(true)
		expect(cells.find((c) => c.dateKey === '2026-09-23')?.completed).toBe(false)
	})
})

describe('Phase 9 Daily persistence', () => {
	it('migrates v5 saves to v6 with empty Daily', () => {
		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: 5,
				currentLevel: 40,
				highestUnlockedLevel: 40,
				campaignComplete: false,
				tutorialCompleted: true,
				session: null,
				settings: {
					animationSpeed: 'normal',
					hapticsEnabled: true,
					soundsEnabled: true,
					colorMode: 'normal',
				},
				statistics: { levelsCompleted: 39, totalPours: 200, freePlayCompleted: 2 },
				achievements: { unlockedIds: [], notifiedIds: [] },
				freePlay: { seedCounter: 3, session: null },
			}),
		)
		expect(parsed.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(parsed.currentLevel).toBe(40)
		expect(parsed.freePlay.seedCounter).toBe(3)
		expect(parsed.daily.session).toBeNull()
		expect(parsed.daily.completedDateKeys).toEqual([])
		expect(parsed.statistics.dailyCompleted).toBe(0)
	})

	it('round-trips Daily session; unfinished yesterday is not today', () => {
		const difficulty = getDailyDifficulty('2026-09-24')
		const seed = createDailySeed('2026-09-24')
		const puzzle = createDailyPuzzle(difficulty, seed)
		expect(puzzle.ok).toBe(true)
		if (!puzzle.ok) return

		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: 6,
				currentLevel: 5,
				highestUnlockedLevel: 5,
				campaignComplete: false,
				tutorialCompleted: true,
				session: null,
				settings: {
					animationSpeed: 'normal',
					hapticsEnabled: true,
					soundsEnabled: true,
					colorMode: 'normal',
				},
				statistics: {},
				achievements: { unlockedIds: [], notifiedIds: [] },
				freePlay: { seedCounter: 0, session: null },
				daily: {
					completedDateKeys: [],
					currentStreak: 0,
					bestStreak: 0,
					lastCompletedDateKey: null,
					session: {
						dateKey: '2026-09-24',
						difficulty,
						seed,
						initialBoard: puzzle.level.board,
						currentBoard: puzzle.level.board,
						moveHistory: [],
						moveCount: 3,
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
		expect(parsed.daily.session?.dateKey).toBe('2026-09-24')
		expect(parsed.daily.session?.moveCount).toBe(3)
		expect(parsed.daily.session?.currentBoard).toEqual(puzzle.level.board)
		// Product rule: CTA for 2026-09-25 must ignore this session (dateKey mismatch).
		expect(parsed.daily.session?.dateKey).not.toBe('2026-09-25')
	}, 60_000)

	it('corrupt Daily does not destroy Campaign or Free Play', () => {
		const campaign = createCampaignLevel(8)
		const free = createFreePlayPuzzle('HARD', createFreePlaySeed(2, 'HARD'))
		expect(free.ok).toBe(true)
		if (!free.ok) return

		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: 6,
				currentLevel: 8,
				highestUnlockedLevel: 8,
				campaignComplete: false,
				tutorialCompleted: true,
				session: {
					levelNumber: 8,
					seed: campaign.seed,
					campaignBand: campaign.campaignBand,
					initialBoard: campaign.board,
					currentBoard: campaign.board,
					moveHistory: [],
					moveCount: 2,
				},
				settings: {
					animationSpeed: 'normal',
					hapticsEnabled: true,
					soundsEnabled: true,
					colorMode: 'normal',
				},
				statistics: { levelsCompleted: 7 },
				achievements: { unlockedIds: [], notifiedIds: [] },
				freePlay: {
					seedCounter: 2,
					session: {
						difficulty: 'HARD',
						seed: createFreePlaySeed(2, 'HARD'),
						initialBoard: free.level.board,
						currentBoard: free.level.board,
						moveHistory: [],
						moveCount: 4,
						attempt: {
							usedHint: false,
							usedUndo: false,
							usedRestart: false,
						},
						isSolved: false,
					},
				},
				daily: { completedDateKeys: 'bad', session: { difficulty: 'NOPE' } },
			}),
		)
		expect(parsed.session?.levelNumber).toBe(8)
		expect(parsed.freePlay.session?.moveCount).toBe(4)
		expect(parsed.daily.session).toBeNull()
		expect(parsed.daily.completedDateKeys).toEqual([])
	}, 60_000)

	it('isolates Campaign / Free Play / Daily boards in one save', () => {
		const campaign = createCampaignLevel(3)
		const free = createFreePlayPuzzle('EASY', createFreePlaySeed(1, 'EASY'))
		const dailyDiff = getDailyDifficulty('2026-01-15')
		const dailySeed = createDailySeed('2026-01-15')
		const daily = createDailyPuzzle(dailyDiff, dailySeed)
		expect(free.ok && daily.ok).toBe(true)
		if (!free.ok || !daily.ok) return

		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: 6,
				currentLevel: 3,
				highestUnlockedLevel: 3,
				campaignComplete: false,
				tutorialCompleted: true,
				session: {
					levelNumber: 3,
					seed: campaign.seed,
					campaignBand: campaign.campaignBand,
					initialBoard: campaign.board,
					currentBoard: campaign.board,
					moveHistory: [],
					moveCount: 1,
				},
				settings: {
					animationSpeed: 'normal',
					hapticsEnabled: true,
					soundsEnabled: true,
					colorMode: 'normal',
				},
				statistics: {},
				achievements: { unlockedIds: [], notifiedIds: [] },
				freePlay: {
					seedCounter: 1,
					session: {
						difficulty: 'EASY',
						seed: createFreePlaySeed(1, 'EASY'),
						initialBoard: free.level.board,
						currentBoard: free.level.board,
						moveHistory: [],
						moveCount: 2,
						attempt: {
							usedHint: false,
							usedUndo: false,
							usedRestart: false,
						},
						isSolved: false,
					},
				},
				daily: {
					completedDateKeys: [],
					currentStreak: 0,
					bestStreak: 0,
					lastCompletedDateKey: null,
					session: {
						dateKey: '2026-01-15',
						difficulty: dailyDiff,
						seed: dailySeed,
						initialBoard: daily.level.board,
						currentBoard: daily.level.board,
						moveHistory: [],
						moveCount: 5,
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

		expect(serializeBoard(parsed.session!.currentBoard)).toBe(
			serializeBoard(campaign.board),
		)
		expect(serializeBoard(parsed.freePlay.session!.currentBoard)).toBe(
			serializeBoard(free.level.board),
		)
		expect(serializeBoard(parsed.daily.session!.currentBoard)).toBe(
			serializeBoard(daily.level.board),
		)
		expect(serializeBoard(parsed.session!.currentBoard)).not.toBe(
			serializeBoard(parsed.daily.session!.currentBoard),
		)
	}, 90_000)
})

describe('Phase 9 Daily progression isolation', () => {
	it('Daily completion does not change campaign counters', () => {
		const before = createEmptyStatistics()
		before.levelsCompleted = 12
		before.highestLevelCompleted = 12
		before.completedLevelNumbers = Array.from({ length: 12 }, (_, i) => i + 1)

		const afterDaily = recordDailyCompletion(createEmptyDailyState(), '2026-09-24')
		const stats = recordDailyStatsCompletion(before, 'HARD', {
			wasFirstCompletion: true,
			currentStreak: afterDaily.currentStreak,
			bestStreak: afterDaily.bestStreak,
		})
		const poured = recordPour(stats)

		expect(poured.levelsCompleted).toBe(12)
		expect(poured.highestLevelCompleted).toBe(12)
		expect(poured.completedLevelNumbers).toHaveLength(12)
		expect(poured.dailyCompleted).toBe(1)
		expect(poured.totalPours).toBe(1)
		expect(poured.dailyCompletedByDifficulty.HARD).toBe(1)

		const again = recordDailyStatsCompletion(poured, 'HARD', {
			wasFirstCompletion: false,
			currentStreak: afterDaily.currentStreak,
			bestStreak: afterDaily.bestStreak,
		})
		expect(again.dailyCompleted).toBe(1)
	})

	it('Daily MEDIUM can unlock medium_depth without campaign levels', () => {
		let stats = createEmptyStatistics()
		stats = recordDailyStatsCompletion(stats, 'MEDIUM', {
			wasFirstCompletion: true,
			currentStreak: 1,
			bestStreak: 1,
		})
		const evaluated = evaluateAchievements(stats, createEmptyAchievementState())
		expect(evaluated.newlyUnlocked).toContain('medium_depth')
		const def = getAchievementDefinition('medium_depth')
		expect(def?.progressOf(stats)).toBe(1)
	})
})

describe('Phase 9 Daily navigation', () => {
	it('Daily hub → Home; Daily game/history → Daily hub', () => {
		expect(resolveBackTarget([{ name: 'home' }, { name: 'daily' }])).toBe(
			'home',
		)
		expect(
			resolveBackTarget([
				{ name: 'home' },
				{ name: 'daily' },
				{ name: 'daily_game' },
			]),
		).toBe('daily')
		expect(
			resolveBackTarget([
				{ name: 'home' },
				{ name: 'daily' },
				{ name: 'daily_history' },
			]),
		).toBe('daily')
	})
})

describe('Phase 9 Daily parse recovery', () => {
	it('rebuilds streak from completed keys when counters missing', () => {
		const parsed = parseDailyState({
			completedDateKeys: ['2026-09-22', '2026-09-23', '2026-09-24'],
			session: null,
		})
		expect(parsed.currentStreak).toBe(3)
		expect(parsed.bestStreak).toBe(3)
		expect(parsed.lastCompletedDateKey).toBe('2026-09-24')
	})
})
