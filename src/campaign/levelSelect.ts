import { CAMPAIGN_LEVEL_COUNT } from './config'

/** Levels rendered per selector page / range. */
export const LEVEL_SELECT_PAGE_SIZE = 100

/**
 * Prefer the active session/current level for which page to open.
 * Falls back to highestUnlocked when current is missing/invalid.
 * Documented product choice for PH8B.
 */
export function resolveLevelSelectFocusLevel(
	currentLevel: number,
	highestUnlockedLevel: number,
): number {
	if (
		Number.isInteger(currentLevel) &&
		currentLevel >= 1 &&
		currentLevel <= CAMPAIGN_LEVEL_COUNT
	) {
		return currentLevel
	}
	if (
		Number.isInteger(highestUnlockedLevel) &&
		highestUnlockedLevel >= 1 &&
		highestUnlockedLevel <= CAMPAIGN_LEVEL_COUNT
	) {
		return highestUnlockedLevel
	}
	return 1
}

/** 0-based page index for a campaign level (100 levels per page). */
export function getLevelSelectPageIndex(levelNumber: number): number {
	const clamped = Math.min(
		CAMPAIGN_LEVEL_COUNT,
		Math.max(1, Math.floor(levelNumber)),
	)
	return Math.floor((clamped - 1) / LEVEL_SELECT_PAGE_SIZE)
}

export function getLevelSelectPageCount(): number {
	return Math.ceil(CAMPAIGN_LEVEL_COUNT / LEVEL_SELECT_PAGE_SIZE)
}

export function getLevelSelectPageBounds(pageIndex: number): {
	start: number
	end: number
} {
	const pageCount = getLevelSelectPageCount()
	const safeIndex = Math.min(pageCount - 1, Math.max(0, pageIndex))
	const start = safeIndex * LEVEL_SELECT_PAGE_SIZE + 1
	const end = Math.min(CAMPAIGN_LEVEL_COUNT, start + LEVEL_SELECT_PAGE_SIZE - 1)
	return { start, end }
}

/** Level numbers for one page — metadata only, no board generation. */
export function listLevelSelectPageLevels(pageIndex: number): number[] {
	const { start, end } = getLevelSelectPageBounds(pageIndex)
	return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export function listLevelSelectRanges(): {
	pageIndex: number
	start: number
	end: number
	label: string
}[] {
	const pageCount = getLevelSelectPageCount()
	return Array.from({ length: pageCount }, (_, pageIndex) => {
		const { start, end } = getLevelSelectPageBounds(pageIndex)
		return {
			pageIndex,
			start,
			end,
			label: `${start}–${end}`,
		}
	})
}
