export const ANALYTICS_EVENT_NAMES = [
	'app_started',
	'tutorial_started',
	'tutorial_completed',
	'level_started',
	'level_completed',
	'level_restarted',
	'hint_used',
	'undo_used',
	'level_selected',
	'settings_changed',
	'campaign_completed',
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number]

const ALLOWED_PARAMETERS: Record<AnalyticsEventName, readonly string[]> = {
	app_started: [],
	tutorial_started: ['level_number'],
	tutorial_completed: ['level_number', 'move_count'],
	level_started: ['level_number', 'difficulty'],
	level_completed: ['level_number', 'difficulty', 'move_count'],
	level_restarted: ['level_number'],
	hint_used: ['level_number', 'difficulty'],
	undo_used: ['level_number'],
	level_selected: ['level_number'],
	settings_changed: [
		'animation_speed',
		'color_mode',
		'haptics_enabled',
		'sounds_enabled',
	],
	campaign_completed: ['level_number'],
}

export type AnalyticsParameter = string | number | boolean

export interface AnalyticsEvent {
	name: AnalyticsEventName
	parameters: Record<string, AnalyticsParameter>
}

/**
 * Keeps the analytics contract intentionally small and strips unknown values.
 * In particular, board/session objects and user-entered text can never be sent
 * through the gameplay event adapter.
 */
export function buildAnalyticsEvent(
	name: AnalyticsEventName,
	parameters: Record<string, unknown> = {},
): AnalyticsEvent {
	const allowed = new Set(ALLOWED_PARAMETERS[name])
	const safeParameters: Record<string, AnalyticsParameter> = {}

	for (const [key, value] of Object.entries(parameters)) {
		if (!allowed.has(key)) continue
		if (
			typeof value !== 'string' &&
			typeof value !== 'number' &&
			typeof value !== 'boolean'
		) {
			continue
		}
		safeParameters[key] = value
	}

	return { name, parameters: safeParameters }
}
