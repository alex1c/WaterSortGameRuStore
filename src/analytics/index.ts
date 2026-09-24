import AppMetrica from '@appmetrica/react-native-analytics'

import {
	buildAnalyticsEvent,
	type AnalyticsEventName,
} from './events'

const APPMETRICA_API_KEY = 'a459f762-34ef-4582-8810-19ccfb11b697'
let initialized = false

/** Initializes AppMetrica once; analytics failures are deliberately isolated. */
export function initializeAnalytics(): void {
	if (initialized) return
	initialized = true

	try {
		AppMetrica.activate({
			apiKey: APPMETRICA_API_KEY,
			appOpenTrackingEnabled: false,
			advIdentifiersTracking: false,
			logs: __DEV__,
		})
	} catch {
		// Analytics must never block rendering or gameplay.
	}
}

export function trackEvent(
	name: AnalyticsEventName,
	parameters: Record<string, unknown> = {},
): void {
	try {
		const event = buildAnalyticsEvent(name, parameters)
		AppMetrica.reportEvent(event.name, event.parameters)
	} catch {
		// Native analytics availability is optional at runtime.
	}
}

export { buildAnalyticsEvent, ANALYTICS_EVENT_NAMES } from './events'
export type {
	AnalyticsEvent,
	AnalyticsEventName,
	AnalyticsParameter,
} from './events'
