import {
	CAMPAIGN_LEVEL_COUNT,
	ORIGINAL_CAMPAIGN_MILESTONE,
	createCampaignLevel,
	getCampaignColorCount,
	getCampaignDifficultyBand,
	getCampaignLevelConfig,
	nextUnlockAfterClearing,
} from '../campaign'
import { serializeBoard } from '../game'
import { canonicalKey } from '../game/solver'
import { parsePersistedGameState } from '../storage/parse'
import { STORAGE_SCHEMA_VERSION } from '../storage/types'
import {
	ACHIEVEMENT_DEFINITIONS,
	getAchievementDefinition,
} from '../achievements'
import frozenFixture from './fixtures/campaign-levels-1-100.identity.json'

interface FrozenIdentity {
	level: number
	seed: string
	exactHash: string
	equivHash: string
	exact: string
}

describe('Phase 8A campaign extension', () => {
	it('keeps CAMPAIGN_LEVEL_COUNT at 1000 and rejects Level 1001', () => {
		expect(CAMPAIGN_LEVEL_COUNT).toBe(1000)
		expect(ORIGINAL_CAMPAIGN_MILESTONE).toBe(100)
		expect(() => getCampaignLevelConfig(1001)).toThrow(/1\.\.1000/)
	})

	it('preserves frozen Levels 1–100 identities exactly', () => {
		const fixture = frozenFixture as {
			count: number
			identities: FrozenIdentity[]
		}
		expect(fixture.count).toBe(100)
		expect(fixture.identities).toHaveLength(100)

		for (const expected of fixture.identities) {
			const level = createCampaignLevel(expected.level)
			const exact = serializeBoard(level.board)
			expect(String(level.seed)).toBe(expected.seed)
			expect(exact).toBe(expected.exact)
			expect(canonicalKey(level.board)).toBe(
				canonicalKey(JSON.parse(expected.exact)),
			)
		}
	}, 180_000)

	it('keeps Level 5 calibrated seed unchanged', () => {
		expect(getCampaignLevelConfig(5).seed).toBe(
			'watersort-campaign-v1-level-5-calibrated',
		)
		const fixture = frozenFixture as { identities: FrozenIdentity[] }
		const level5 = fixture.identities.find((item) => item.level === 5)!
		const live = createCampaignLevel(5)
		expect(serializeBoard(live.board)).toBe(level5.exact)
	}, 30_000)

	it('unlocks Level 101 after clearing Level 100', () => {
		expect(nextUnlockAfterClearing(100, 100)).toBe(101)
		expect(nextUnlockAfterClearing(999, 999)).toBe(1000)
		expect(nextUnlockAfterClearing(1000, 1000)).toBe(1000)
	})

	it('creates deterministic extended levels', () => {
		for (const levelNumber of [101, 250, 500, 750, 1000]) {
			const a = createCampaignLevel(levelNumber)
			const b = createCampaignLevel(levelNumber)
			expect(a.board).toEqual(b.board)
			expect(String(a.seed)).toBe(`watersort-campaign-v1-level-${levelNumber}`)
			expect(getCampaignColorCount(levelNumber)).toBe(11)
			expect(a.board.length).toBe(13)
		}
		expect(getCampaignDifficultyBand(101)).toBe('HARD')
		expect(getCampaignDifficultyBand(105)).toBe('MEDIUM')
	}, 120_000)

	it('migrates schema v3 campaignComplete=true without finishing 1000', () => {
		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: 3,
				currentLevel: 100,
				highestUnlockedLevel: 100,
				campaignComplete: true,
				tutorialCompleted: true,
				session: null,
				settings: {
					animationSpeed: 'normal',
					hapticsEnabled: true,
					soundsEnabled: true,
					colorMode: 'normal',
				},
				statistics: {
					levelsCompleted: 100,
					totalPours: 42,
					hintsUsed: 3,
					undosUsed: 1,
					restartsUsed: 0,
					levelsCompletedWithoutHint: 90,
					levelsCompletedWithoutUndo: 95,
					levelsCompletedWithoutRestart: 99,
					highestLevelCompleted: 100,
					completedByDifficulty: {
						BEGINNER: 10,
						EASY: 20,
						MEDIUM: 25,
						HARD: 25,
						EXPERT: 20,
					},
					completedLevelNumbers: Array.from({ length: 100 }, (_, i) => i + 1),
					withoutHintLevelNumbers: [],
					withoutUndoLevelNumbers: [],
					withoutRestartLevelNumbers: [],
				},
				achievements: {
					unlockedIds: ['sort_master'],
					notifiedIds: ['sort_master'],
				},
			}),
		)

		expect(parsed.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(parsed.campaignComplete).toBe(false)
		expect(parsed.highestUnlockedLevel).toBe(101)
		expect(parsed.statistics.levelsCompleted).toBe(100)
		expect(parsed.statistics.totalPours).toBe(42)
		expect(parsed.statistics.hintsUsed).toBe(3)
		expect(parsed.achievements.unlockedIds).toContain('sort_master')
		expect(parsed.achievements.unlockedIds).not.toContain('legend_1000')
	})

	it('preserves an existing mid-level session through v3→v4 migration', () => {
		const level = createCampaignLevel(12)
		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: 3,
				currentLevel: 12,
				highestUnlockedLevel: 26,
				campaignComplete: false,
				tutorialCompleted: true,
				session: {
					levelNumber: 12,
					seed: String(level.seed),
					campaignBand: level.campaignBand,
					initialBoard: level.board,
					currentBoard: level.board,
					moveHistory: [],
					moveCount: 0,
				},
			}),
		)
		expect(parsed.highestUnlockedLevel).toBe(26)
		expect(parsed.campaignComplete).toBe(false)
		expect(parsed.session?.levelNumber).toBe(12)
		expect(parsed.session?.currentBoard).toEqual(level.board)
		expect(parsed.statistics.levelsCompleted).toBe(25)
	}, 30_000)

	it('preserves sort_master=100 and adds 250/500/1000 progression', () => {
		expect(getAchievementDefinition('sort_master')?.target).toBe(100)
		expect(getAchievementDefinition('sort_master')?.description).toBe(
			'Пройдите 100 уровней',
		)
		expect(getAchievementDefinition('veteran_250')?.target).toBe(250)
		expect(getAchievementDefinition('master_500')?.target).toBe(500)
		expect(getAchievementDefinition('legend_1000')?.target).toBe(1000)
		expect(getAchievementDefinition('sorter')?.target).toBe(500)
		expect(getAchievementDefinition('sorter')?.description).toMatch(/переливани/)
		const ids = ACHIEVEMENT_DEFINITIONS.map((item) => item.id)
		expect(ids).toEqual(
			expect.arrayContaining([
				'first_order',
				'sort_master',
				'veteran_250',
				'master_500',
				'legend_1000',
				'sorter',
			]),
		)
		expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(18)
	})
})
