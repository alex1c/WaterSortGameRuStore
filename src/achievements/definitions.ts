import type { GameStatistics } from '../statistics'

export type AchievementId =
	| 'first_order'
	| 'warmup'
	| 'getting_into_it'
	| 'half_century'
	| 'sort_master'
	| 'independent'
	| 'own_head'
	| 'no_hints'
	| 'confident_move'
	| 'no_undos'
	| 'first_try'
	| 'medium_depth'
	| 'hard_task'
	| 'expert'
	| 'sorter'

export interface AchievementDefinition {
	id: AchievementId
	title: string
	description: string
	/** Target for progress bars; null = binary unlock. */
	target: number | null
	/** How to read current progress from statistics. */
	progressOf: (stats: GameStatistics) => number
	/** Progression achievements may be reconstructed from unlock frontier. */
	reconstructible: boolean
}

/**
 * Deterministic achievement catalog (~15). Thresholds match real playtest pace.
 */
export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
	{
		id: 'first_order',
		title: 'Первый порядок',
		description: 'Пройдите 1 уровень',
		target: 1,
		progressOf: (s) => s.levelsCompleted,
		reconstructible: true,
	},
	{
		id: 'warmup',
		title: 'Разминка',
		description: 'Пройдите 10 уровней',
		target: 10,
		progressOf: (s) => s.levelsCompleted,
		reconstructible: true,
	},
	{
		id: 'getting_into_it',
		title: 'Втянулся',
		description: 'Пройдите 25 уровней',
		target: 25,
		progressOf: (s) => s.levelsCompleted,
		reconstructible: true,
	},
	{
		id: 'half_century',
		title: 'Полсотни',
		description: 'Пройдите 50 уровней',
		target: 50,
		progressOf: (s) => s.levelsCompleted,
		reconstructible: true,
	},
	{
		id: 'sort_master',
		title: 'Мастер сортировки',
		description: 'Пройдите все 100 уровней кампании',
		target: 100,
		progressOf: (s) => s.levelsCompleted,
		reconstructible: true,
	},
	{
		id: 'independent',
		title: 'Самостоятельно',
		description: 'Пройдите 5 уровней без подсказок',
		target: 5,
		progressOf: (s) => s.levelsCompletedWithoutHint,
		reconstructible: false,
	},
	{
		id: 'own_head',
		title: 'Своя голова',
		description: 'Пройдите 10 уровней без подсказок',
		target: 10,
		progressOf: (s) => s.levelsCompletedWithoutHint,
		reconstructible: false,
	},
	{
		id: 'no_hints',
		title: 'Без подсказок',
		description: 'Пройдите 25 уровней без подсказок',
		target: 25,
		progressOf: (s) => s.levelsCompletedWithoutHint,
		reconstructible: false,
	},
	{
		id: 'confident_move',
		title: 'Уверенный ход',
		description: 'Пройдите 5 уровней без отмен',
		target: 5,
		progressOf: (s) => s.levelsCompletedWithoutUndo,
		reconstructible: false,
	},
	{
		id: 'no_undos',
		title: 'Без отмен',
		description: 'Пройдите 20 уровней без отмен',
		target: 20,
		progressOf: (s) => s.levelsCompletedWithoutUndo,
		reconstructible: false,
	},
	{
		id: 'first_try',
		title: 'С первой попытки',
		description: 'Пройдите 5 уровней без перезапуска',
		target: 5,
		progressOf: (s) => s.levelsCompletedWithoutRestart,
		reconstructible: false,
	},
	{
		id: 'medium_depth',
		title: 'Средняя глубина',
		description: 'Пройдите уровень сложности «Средне»',
		target: 1,
		progressOf: (s) => s.completedByDifficulty.MEDIUM,
		reconstructible: true,
	},
	{
		id: 'hard_task',
		title: 'Сложная задача',
		description: 'Пройдите уровень сложности «Сложно»',
		target: 1,
		progressOf: (s) => s.completedByDifficulty.HARD,
		reconstructible: true,
	},
	{
		id: 'expert',
		title: 'Эксперт',
		description: 'Пройдите уровень сложности «Эксперт»',
		target: 1,
		progressOf: (s) => s.completedByDifficulty.EXPERT,
		reconstructible: true,
	},
	{
		id: 'sorter',
		title: 'Сортировщик',
		description: 'Сделайте 500 переливаний',
		target: 500,
		progressOf: (s) => s.totalPours,
		reconstructible: false,
	},
] as const

export interface AchievementProgress {
	id: AchievementId
	title: string
	description: string
	unlocked: boolean
	current: number
	target: number | null
}

export interface AchievementState {
	unlockedIds: AchievementId[]
	/** Already shown unlock toast — never re-notify after restart. */
	notifiedIds: AchievementId[]
}

export function createEmptyAchievementState(): AchievementState {
	return { unlockedIds: [], notifiedIds: [] }
}

export function getAchievementDefinition(
	id: AchievementId,
): AchievementDefinition | undefined {
	return ACHIEVEMENT_DEFINITIONS.find((item) => item.id === id)
}
