import {
	dateFromLocalDateKey,
	listRecentLocalDateKeys,
	type LocalDateKey,
} from './date'

/**
 * Compact last-N-days history cell for Daily hub UI.
 * Derived from today + completed keys — not persisted as rows.
 */
export interface DailyHistoryCell {
	dateKey: string
	dayOfMonth: number
	completed: boolean
	isToday: boolean
}

export function buildDailyHistory(
	todayKey: LocalDateKey,
	completedKeys: readonly LocalDateKey[],
	days = 30,
): DailyHistoryCell[] {
	const completed = new Set(completedKeys)
	return listRecentLocalDateKeys(todayKey, days).map((key) => {
		const date = dateFromLocalDateKey(key)
		return {
			dateKey: key,
			dayOfMonth: date.getDate(),
			completed: completed.has(key),
			isToday: key === todayKey,
		}
	})
}
