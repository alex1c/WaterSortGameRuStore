import { resolveBackTarget, pushRoute, replaceStack } from '../navigation/types'
import {
	createEmptyStatistics,
	createFreshAttemptFlags,
	recordHintUsed,
	recordLevelCompletion,
	recordPour,
	recordRestartUsed,
	recordUndoUsed,
	reconstructStatisticsFromProgress,
} from '../statistics'
import {
	ACHIEVEMENT_DEFINITIONS,
	createEmptyAchievementState,
	evaluateAchievements,
	markAchievementsNotified,
	pendingUnlockNotifications,
	reconstructAchievementsFromStats,
} from '../achievements'
import { parsePersistedGameState } from '../storage/parse'
import { STORAGE_SCHEMA_VERSION } from '../storage/types'
import { createCampaignLevel } from '../campaign'
import { applyMove, getLegalMoves } from '../game'

describe('Phase 7 navigation back targets', () => {
	it('Training/Game Back → Home', () => {
		expect(resolveBackTarget([{ name: 'home' }, { name: 'game' }])).toBe('home')
		expect(resolveBackTarget([{ name: 'game' }])).toBe('home')
	})

	it('Levels / Statistics / Achievements / Settings Back → Home', () => {
		expect(resolveBackTarget([{ name: 'home' }, { name: 'levels' }])).toBe('home')
		expect(resolveBackTarget([{ name: 'home' }, { name: 'statistics' }])).toBe(
			'home',
		)
		expect(resolveBackTarget([{ name: 'home' }, { name: 'achievements' }])).toBe(
			'home',
		)
		expect(resolveBackTarget([{ name: 'home' }, { name: 'settings' }])).toBe('home')
		// Even when opened from Game, Back still returns Home (session stays in memory).
		expect(
			resolveBackTarget([
				{ name: 'home' },
				{ name: 'game' },
				{ name: 'levels' },
			]),
		).toBe('home')
		expect(
			resolveBackTarget([
				{ name: 'home' },
				{ name: 'game' },
				{ name: 'settings' },
			]),
		).toBe('home')
	})

	it('About Back → Settings when stacked under Settings', () => {
		expect(
			resolveBackTarget([
				{ name: 'home' },
				{ name: 'settings' },
				{ name: 'about' },
			]),
		).toBe('settings')
	})

	it('Home Back allows system exit', () => {
		expect(resolveBackTarget([{ name: 'home' }])).toBeNull()
		expect(resolveBackTarget([])).toBeNull()
	})

	it('pushRoute collapses duplicate top route', () => {
		const stack = pushRoute([{ name: 'home' }], { name: 'game' })
		expect(pushRoute(stack, { name: 'game' })).toEqual(stack)
		expect(replaceStack({ name: 'home' })).toEqual([{ name: 'home' }])
	})
})

describe('Phase 7 statistics', () => {
	it('counts completion once per level id', () => {
		let stats = createEmptyStatistics()
		const attempt = createFreshAttemptFlags()
		const first = recordLevelCompletion(stats, 3, 'BEGINNER', attempt)
		expect(first.wasFirstCompletion).toBe(true)
		expect(first.stats.levelsCompleted).toBe(1)
		const second = recordLevelCompletion(first.stats, 3, 'BEGINNER', attempt)
		expect(second.wasFirstCompletion).toBe(false)
		expect(second.stats.levelsCompleted).toBe(1)
	})

	it('tracks Hint / Undo / Restart attempt flags into without-* counters', () => {
		const clean = recordLevelCompletion(
			createEmptyStatistics(),
			1,
			'BEGINNER',
			createFreshAttemptFlags(),
		).stats
		expect(clean.levelsCompletedWithoutHint).toBe(1)
		expect(clean.levelsCompletedWithoutUndo).toBe(1)
		expect(clean.levelsCompletedWithoutRestart).toBe(1)

		const withHint = recordLevelCompletion(
			createEmptyStatistics(),
			2,
			'BEGINNER',
			{ usedHint: true, usedUndo: false, usedRestart: false },
		).stats
		expect(withHint.levelsCompletedWithoutHint).toBe(0)
		expect(withHint.levelsCompletedWithoutUndo).toBe(1)

		const withUndo = recordLevelCompletion(
			createEmptyStatistics(),
			3,
			'BEGINNER',
			{ usedHint: false, usedUndo: true, usedRestart: false },
		).stats
		expect(withUndo.levelsCompletedWithoutUndo).toBe(0)

		const withRestart = recordLevelCompletion(
			createEmptyStatistics(),
			4,
			'BEGINNER',
			{ usedHint: false, usedUndo: false, usedRestart: true },
		).stats
		expect(withRestart.levelsCompletedWithoutRestart).toBe(0)
	})

	it('lifetime counters increase on pour / hint / undo / restart', () => {
		let stats = createEmptyStatistics()
		stats = recordPour(stats)
		stats = recordPour(stats)
		stats = recordHintUsed(stats)
		stats = recordUndoUsed(stats)
		stats = recordRestartUsed(stats)
		expect(stats.totalPours).toBe(2)
		expect(stats.hintsUsed).toBe(1)
		expect(stats.undosUsed).toBe(1)
		expect(stats.restartsUsed).toBe(1)
	})

	it('reconstructing from unlock frontier fills progression only', () => {
		const reconstructed = reconstructStatisticsFromProgress(26, false, null)
		expect(reconstructed.levelsCompleted).toBe(25)
		expect(reconstructed.highestLevelCompleted).toBe(25)
		expect(reconstructed.totalPours).toBe(0)
		expect(reconstructed.hintsUsed).toBe(0)
		expect(reconstructed.undosUsed).toBe(0)
		expect(reconstructed.restartsUsed).toBe(0)
		expect(reconstructed.levelsCompletedWithoutHint).toBe(0)
		expect(reconstructed.completedByDifficulty.BEGINNER).toBe(10)
		expect(reconstructed.completedByDifficulty.EASY).toBe(15)
	})
})

describe('Phase 7 achievements', () => {
	it('defines 18 deterministic achievements', () => {
		expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(18)
	})

	it('unlocks progression thresholds from completed levels', () => {
		const stats = reconstructStatisticsFromProgress(26, false, null)
		const { newlyUnlocked, state } = evaluateAchievements(
			stats,
			createEmptyAchievementState(),
		)
		expect(newlyUnlocked).toEqual(
			expect.arrayContaining([
				'first_order',
				'warmup',
				'getting_into_it',
			]),
		)
		expect(newlyUnlocked).not.toContain('half_century')
		expect(state.unlockedIds).toEqual(
			expect.arrayContaining(['getting_into_it']),
		)
	})

	it('does not reconstruct without-hint achievements without evidence', () => {
		const stats = reconstructStatisticsFromProgress(26, false, null)
		const reconstructed = reconstructAchievementsFromStats(stats, null)
		expect(reconstructed.unlockedIds).toEqual(
			expect.arrayContaining([
				'first_order',
				'warmup',
				'getting_into_it',
			]),
		)
		expect(reconstructed.unlockedIds).not.toContain('independent')
		expect(reconstructed.unlockedIds).not.toContain('no_hints')
		expect(reconstructed.unlockedIds).not.toContain('sorter')
		// Reconstructed unlocks are marked notified to avoid toast spam on upgrade.
		expect(reconstructed.notifiedIds).toEqual(
			expect.arrayContaining(reconstructed.unlockedIds),
		)
	})

	it('does not re-queue unlock notifications after markAchievementsNotified', () => {
		const stats = reconstructStatisticsFromProgress(11, false, null)
		const evaluated = evaluateAchievements(stats, createEmptyAchievementState())
		expect(pendingUnlockNotifications(evaluated.state).length).toBeGreaterThan(0)
		const notified = markAchievementsNotified(
			evaluated.state,
			evaluated.newlyUnlocked,
		)
		expect(pendingUnlockNotifications(notified)).toEqual([])
	})
})

describe('Phase 7 persistence migration', () => {
	it('migrates schema v2 progress without inventing historical action stats', () => {
		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: 2,
				currentLevel: 18,
				highestUnlockedLevel: 26,
				campaignComplete: false,
				tutorialCompleted: true,
				session: null,
				settings: {
					animationSpeed: 'fast',
					hapticsEnabled: true,
					soundsEnabled: false,
					colorMode: 'normal',
				},
			}),
		)
		expect(parsed.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(parsed.highestUnlockedLevel).toBe(26)
		expect(parsed.currentLevel).toBe(18)
		expect(parsed.tutorialCompleted).toBe(true)
		expect(parsed.settings.animationSpeed).toBe('fast')
		expect(parsed.statistics.levelsCompleted).toBe(25)
		expect(parsed.statistics.totalPours).toBe(0)
		expect(parsed.statistics.hintsUsed).toBe(0)
		expect(parsed.achievements.unlockedIds).toEqual(
			expect.arrayContaining(['getting_into_it']),
		)
		expect(parsed.achievements.unlockedIds).not.toContain('independent')
		expect(pendingUnlockNotifications(parsed.achievements)).toEqual([])
	})

	it('preserves mid-level session boards across v3 parse', () => {
		const level = createCampaignLevel(5)
		const move = getLegalMoves(level.board)[0]!
		const currentBoard = applyMove(level.board, move)
		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: 3,
				currentLevel: 5,
				highestUnlockedLevel: 5,
				campaignComplete: false,
				tutorialCompleted: true,
				session: {
					levelNumber: 5,
					seed: String(level.seed),
					campaignBand: level.campaignBand,
					initialBoard: level.board,
					currentBoard,
					moveHistory: [level.board],
					moveCount: 1,
					attempt: { usedHint: true, usedUndo: false, usedRestart: false },
				},
			}),
		)
		expect(parsed.session?.moveCount).toBe(1)
		expect(parsed.session?.attempt?.usedHint).toBe(true)
		expect(parsed.session?.currentBoard).toEqual(currentBoard)
	})
})
