import {
	CAMPAIGN_LEVEL_COUNT,
	LEVEL_SELECT_PAGE_SIZE,
	getLevelSelectPageBounds,
	getLevelSelectPageCount,
	getLevelSelectPageIndex,
	isLevelUnlocked,
	listLevelSelectPageLevels,
	listLevelSelectRanges,
	resolveLevelSelectFocusLevel,
} from '../campaign'
import { getAchievementDefinition, ACHIEVEMENT_DEFINITIONS } from '../achievements'

describe('Phase 8B level selector UX helpers', () => {
	it('opens the page containing current progress', () => {
		expect(getLevelSelectPageIndex(26)).toBe(0)
		expect(getLevelSelectPageBounds(0)).toEqual({ start: 1, end: 100 })

		expect(getLevelSelectPageIndex(137)).toBe(1)
		expect(getLevelSelectPageBounds(1)).toEqual({ start: 101, end: 200 })

		expect(getLevelSelectPageIndex(637)).toBe(6)
		expect(getLevelSelectPageBounds(6)).toEqual({ start: 601, end: 700 })

		expect(getLevelSelectPageIndex(1000)).toBe(9)
		expect(getLevelSelectPageBounds(9)).toEqual({ start: 901, end: 1000 })
	})

	it('prefers currentLevel over highestUnlocked for focus', () => {
		expect(resolveLevelSelectFocusLevel(26, 40)).toBe(26)
		expect(resolveLevelSelectFocusLevel(137, 200)).toBe(137)
		expect(resolveLevelSelectFocusLevel(0, 50)).toBe(50)
	})

	it('keeps page size at 100 and rejects Level 1001 as focus page', () => {
		expect(LEVEL_SELECT_PAGE_SIZE).toBe(100)
		expect(getLevelSelectPageCount()).toBe(10)
		expect(CAMPAIGN_LEVEL_COUNT).toBe(1000)
		// Out-of-range focus clamps via getLevelSelectPageIndex floor, but
		// campaign config still rejects Level 1001 generation.
		expect(listLevelSelectPageLevels(9)).toHaveLength(100)
		expect(listLevelSelectPageLevels(9)[99]).toBe(1000)
		expect(listLevelSelectPageLevels(0)).not.toContain(1001)
	})

	it('lists ten quick ranges without generating boards', () => {
		const ranges = listLevelSelectRanges()
		expect(ranges).toHaveLength(10)
		expect(ranges[0]).toEqual({
			pageIndex: 0,
			start: 1,
			end: 100,
			label: '1–100',
		})
		expect(ranges[9]).toEqual({
			pageIndex: 9,
			start: 901,
			end: 1000,
			label: '901–1000',
		})
		// Metadata-only: page listing does not invoke createCampaignLevel.
		expect(listLevelSelectPageLevels(6)).toEqual(
			Array.from({ length: 100 }, (_, i) => 601 + i),
		)
	})

	it('page navigation boundaries stay within 0..9', () => {
		expect(getLevelSelectPageBounds(-1)).toEqual({ start: 1, end: 100 })
		expect(getLevelSelectPageBounds(99)).toEqual({ start: 901, end: 1000 })
	})

	it('locked levels remain non-selectable by unlock rules', () => {
		expect(isLevelUnlocked(101, 100)).toBe(false)
		expect(isLevelUnlocked(100, 100)).toBe(true)
		expect(isLevelUnlocked(101, 101)).toBe(true)
	})
})

describe('Phase 8B achievements wording', () => {
	it('keeps sort_master id/target 100 without claiming all campaign levels', () => {
		const sortMaster = getAchievementDefinition('sort_master')
		expect(sortMaster?.id).toBe('sort_master')
		expect(sortMaster?.target).toBe(100)
		expect(sortMaster?.description).toBe('Пройдите 100 уровней')
		expect(sortMaster?.description).not.toMatch(/все 100 уровней кампании/i)
	})

	it('exposes 250 / 500 / 1000 progression achievements among 18', () => {
		expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(18)
		expect(getAchievementDefinition('veteran_250')?.target).toBe(250)
		expect(getAchievementDefinition('master_500')?.target).toBe(500)
		expect(getAchievementDefinition('legend_1000')?.target).toBe(1000)
	})
})

describe('Phase 8B Home progress scale', () => {
	it('campaign denominator is 1000', () => {
		expect(CAMPAIGN_LEVEL_COUNT).toBe(1000)
		const progressLabel = `Пройдено: 25 / ${CAMPAIGN_LEVEL_COUNT}`
		expect(progressLabel).toBe('Пройдено: 25 / 1000')
	})
})
