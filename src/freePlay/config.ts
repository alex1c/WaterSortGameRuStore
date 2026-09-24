import type { DifficultyTier } from '../game/generator'

/** Free Play UI difficulties map 1:1 to production DifficultyTier. */
export type FreePlayDifficulty = DifficultyTier

export const FREE_PLAY_DIFFICULTIES: readonly FreePlayDifficulty[] = [
	'BEGINNER',
	'EASY',
	'MEDIUM',
	'HARD',
	'EXPERT',
] as const

/** Color counts aligned with tested campaign/engine scale. */
export const FREE_PLAY_COLOR_COUNT: Record<FreePlayDifficulty, number> = {
	BEGINNER: 3,
	EASY: 5,
	MEDIUM: 7,
	HARD: 9,
	EXPERT: 11,
}

export const FREE_PLAY_EMPTY_TUBE_COUNT = 2

export const FREE_PLAY_MAX_ATTEMPTS: Record<FreePlayDifficulty, number> = {
	BEGINNER: 120,
	EASY: 120,
	MEDIUM: 140,
	HARD: 160,
	EXPERT: 200,
}

export interface FreePlayDifficultyChoice {
	id: FreePlayDifficulty
	title: string
	description: string
}

/** Concise truthful copy for the Free Play chooser. */
export const FREE_PLAY_DIFFICULTY_CHOICES: readonly FreePlayDifficultyChoice[] = [
	{
		id: 'BEGINNER',
		title: 'Новичок',
		description: 'Небольшое поле, простые раскладки',
	},
	{
		id: 'EASY',
		title: 'Легко',
		description: 'Спокойная головоломка',
	},
	{
		id: 'MEDIUM',
		title: 'Средне',
		description: 'Нужно планировать несколько ходов',
	},
	{
		id: 'HARD',
		title: 'Сложно',
		description: 'Много цветов и ложных вариантов',
	},
	{
		id: 'EXPERT',
		title: 'Эксперт',
		description: 'Максимальная сложность',
	},
]
