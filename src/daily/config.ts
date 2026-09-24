import type { DifficultyTier } from '../game/generator'
import type { LocalDateKey } from './date'

/** Daily uses Medium / Hard / Expert only. */
export type DailyDifficulty = Extract<
	DifficultyTier,
	'MEDIUM' | 'HARD' | 'EXPERT'
>

export const DAILY_SEED_PREFIX = 'watersort-daily-v1'

export const DAILY_EMPTY_TUBE_COUNT = 2

export const DAILY_COLOR_COUNT: Record<DailyDifficulty, number> = {
	MEDIUM: 7,
	HARD: 9,
	EXPERT: 11,
}

export const DAILY_MAX_ATTEMPTS: Record<DailyDifficulty, number> = {
	MEDIUM: 140,
	HARD: 160,
	EXPERT: 200,
}

/**
 * Deterministic weekly rhythm from local date key:
 * MEDIUM, HARD, EXPERT, HARD, MEDIUM, EXPERT, HARD
 */
const DIFFICULTY_RHYTHM: readonly DailyDifficulty[] = [
	'MEDIUM',
	'HARD',
	'EXPERT',
	'HARD',
	'MEDIUM',
	'EXPERT',
	'HARD',
]

export function createDailySeed(dateKey: LocalDateKey): string {
	return `${DAILY_SEED_PREFIX}-${dateKey}`
}

export function getDailyDifficulty(dateKey: LocalDateKey): DailyDifficulty {
	const date = new Date(
		Number(dateKey.slice(0, 4)),
		Number(dateKey.slice(5, 7)) - 1,
		Number(dateKey.slice(8, 10)),
		12,
		0,
		0,
		0,
	)
	// getDay(): 0 Sunday … 6 Saturday — stable local weekday.
	const index = date.getDay() % DIFFICULTY_RHYTHM.length
	return DIFFICULTY_RHYTHM[index]!
}
