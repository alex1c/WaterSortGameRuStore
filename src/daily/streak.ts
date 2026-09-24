import {
	daysBetweenLocalDates,
	previousLocalDateKey,
	type LocalDateKey,
} from './date'
import type { PersistedDailyState } from './types'

/**
 * Idempotent Daily completion.
 * Same dateKey completed twice does not change streak or history.
 */
export function recordDailyCompletion(
	state: PersistedDailyState,
	dateKey: LocalDateKey,
): PersistedDailyState {
	const completed = new Set(state.completedDateKeys)
	if (completed.has(dateKey)) {
		return {
			...state,
			completedDateKeys: [...completed].sort(),
			session: state.session
				? { ...state.session, isSolved: true }
				: state.session,
		}
	}

	completed.add(dateKey)
	const completedDateKeys = [...completed].sort()

	let currentStreak = 1
	if (state.lastCompletedDateKey) {
		const gap = daysBetweenLocalDates(state.lastCompletedDateKey, dateKey)
		if (gap === 1) {
			currentStreak = state.currentStreak + 1
		} else if (gap === 0) {
			currentStreak = Math.max(1, state.currentStreak)
		} else {
			currentStreak = 1
		}
	}

	const bestStreak = Math.max(state.bestStreak, currentStreak)

	return {
		...state,
		completedDateKeys,
		currentStreak,
		bestStreak,
		lastCompletedDateKey: dateKey,
		session: state.session
			? { ...state.session, isSolved: true }
			: state.session,
	}
}

/**
 * Streak shown on Home/hub relative to `todayKey`.
 * Last completed yesterday or today → alive currentStreak.
 * Older gap → 0 until next completion.
 */
export function getActiveCurrentStreak(
	state: PersistedDailyState,
	todayKey: LocalDateKey,
): number {
	if (!state.lastCompletedDateKey || state.currentStreak <= 0) return 0
	const gap = daysBetweenLocalDates(state.lastCompletedDateKey, todayKey)
	if (gap === 0 || gap === 1) return state.currentStreak
	return 0
}

export function isDailyCompletedOn(
	state: PersistedDailyState,
	dateKey: LocalDateKey,
): boolean {
	return state.completedDateKeys.includes(dateKey)
}

/** Recompute longest consecutive run (for migration sanity). */
export function computeBestStreakFromKeys(keys: LocalDateKey[]): number {
	if (keys.length === 0) return 0
	const sorted = [...new Set(keys)].sort()
	let best = 1
	let run = 1
	for (let i = 1; i < sorted.length; i += 1) {
		const prev = sorted[i - 1]!
		const cur = sorted[i]!
		if (daysBetweenLocalDates(prev, cur) === 1) {
			run += 1
			best = Math.max(best, run)
		} else {
			run = 1
		}
	}
	return best
}

export function pruneCompletedDateKeys(
	keys: LocalDateKey[],
	todayKey: LocalDateKey,
	retainDays: number,
): LocalDateKey[] {
	// Keep enough history for best-streak: never drop below best-streak window.
	// Retain at least retainDays back from today, plus all keys needed for continuity.
	const cutoff = (() => {
		let cursor = todayKey
		for (let i = 0; i < retainDays; i += 1) {
			cursor = previousLocalDateKey(cursor)
		}
		return cursor
	})()
	const unique = [...new Set(keys)].sort()
	const recent = unique.filter((key) => key >= cutoff)
	// Always keep the contiguous streak chain ending at last completion.
	return recent.length > 0 ? recent : unique.slice(-retainDays)
}
