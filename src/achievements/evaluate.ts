import {
	ACHIEVEMENT_DEFINITIONS,
	createEmptyAchievementState,
	type AchievementId,
	type AchievementProgress,
	type AchievementState,
} from './definitions'
import type { GameStatistics } from '../statistics'

const VALID_IDS = new Set(ACHIEVEMENT_DEFINITIONS.map((item) => item.id))

export function parseAchievementState(value: unknown): AchievementState {
	if (!value || typeof value !== 'object') {
		return createEmptyAchievementState()
	}
	const record = value as Record<string, unknown>
	return {
		unlockedIds: asIdList(record.unlockedIds),
		notifiedIds: asIdList(record.notifiedIds),
	}
}

/**
 * Evaluate achievements against statistics.
 * Returns newly unlocked IDs that still need a toast (not yet notified).
 */
export function evaluateAchievements(
	stats: GameStatistics,
	state: AchievementState,
): { state: AchievementState; newlyUnlocked: AchievementId[] } {
	const unlocked = new Set(state.unlockedIds)
	const newlyUnlocked: AchievementId[] = []

	for (const definition of ACHIEVEMENT_DEFINITIONS) {
		if (unlocked.has(definition.id)) continue
		const current = definition.progressOf(stats)
		const target = definition.target ?? 1
		if (current >= target) {
			unlocked.add(definition.id)
			newlyUnlocked.push(definition.id)
		}
	}

	return {
		state: {
			unlockedIds: [...unlocked],
			notifiedIds: state.notifiedIds,
		},
		newlyUnlocked,
	}
}

/** Mark unlock toasts as shown so they do not repeat after restart. */
export function markAchievementsNotified(
	state: AchievementState,
	ids: AchievementId[],
): AchievementState {
	return {
		...state,
		notifiedIds: [...new Set([...state.notifiedIds, ...ids])],
	}
}

/** IDs that are unlocked but not yet toasted. */
export function pendingUnlockNotifications(
	state: AchievementState,
): AchievementId[] {
	const notified = new Set(state.notifiedIds)
	return state.unlockedIds.filter((id) => !notified.has(id))
}

export function listAchievementProgress(
	stats: GameStatistics,
	state: AchievementState,
): AchievementProgress[] {
	const unlocked = new Set(state.unlockedIds)
	return ACHIEVEMENT_DEFINITIONS.map((definition) => {
		const current = definition.progressOf(stats)
		const target = definition.target
		const met = target === null ? unlocked.has(definition.id) : current >= target
		return {
			id: definition.id,
			title: definition.title,
			description: definition.description,
			unlocked: unlocked.has(definition.id) || met,
			current,
			target,
		}
	})
}

/**
 * Reconstruct only reconstructible progression achievements from stats
 * that were themselves derived from reliable unlock evidence.
 */
export function reconstructAchievementsFromStats(
	stats: GameStatistics,
	existing?: AchievementState | null,
): AchievementState {
	const base = existing ?? createEmptyAchievementState()
	const unlocked = new Set(base.unlockedIds)
	for (const definition of ACHIEVEMENT_DEFINITIONS) {
		if (!definition.reconstructible) continue
		const target = definition.target ?? 1
		if (definition.progressOf(stats) >= target) {
			unlocked.add(definition.id)
		}
	}
	// Mark reconstructed unlocks as already notified — no spam on upgrade.
	return {
		unlockedIds: [...unlocked],
		notifiedIds: [...new Set([...base.notifiedIds, ...unlocked])],
	}
}

function asIdList(value: unknown): AchievementId[] {
	if (!Array.isArray(value)) return []
	return value.filter(
		(item): item is AchievementId =>
			typeof item === 'string' && VALID_IDS.has(item as AchievementId),
	)
}
