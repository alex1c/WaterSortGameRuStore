import {
	AD_UNIT_IDS,
	APP_OPEN_AUTOMATIC_DISPLAY_ENABLED,
	BANNER_UNIT_BY_PLACEMENT,
} from '../ads/config'
import {
	canShowInterstitial,
	createInterstitialPolicyState,
	INTERSTITIAL_POLICY,
	recordInterstitialShown,
	recordLevelCompleted,
} from '../ads/policy'
import { createRewardGrantGuard } from '../ads/rewardedPolicy'
import { buildAnalyticsEvent } from '../analytics/events'
import {
	ABOUT_APP_NAME,
	ABOUT_OTHER_APPS_URL,
	ABOUT_WEBSITE_URL,
} from '../about/config'

describe('Phase 6 production service contracts', () => {
	it('keeps deterministic banner mapping and disables automatic app-open display', () => {
		expect(BANNER_UNIT_BY_PLACEMENT).toEqual({
			game: 'R-M-20102113-1',
			levels: 'R-M-20102113-2',
			information: 'R-M-20102113-3',
		})
		expect(AD_UNIT_IDS.interstitial).toBe('R-M-20102113-4')
		expect(AD_UNIT_IDS.rewarded).toBe('R-M-20102113-5')
		expect(AD_UNIT_IDS.appOpen).toBe('R-M-20102113-6')
		expect(APP_OPEN_AUTOMATIC_DISPLAY_ENABLED).toBe(false)
	})

	it('blocks interstitials during tutorial and before the completion threshold', () => {
		let state = createInterstitialPolicyState()
		state = recordLevelCompleted(state, true)
		expect(
			canShowInterstitial(state, {
				isTutorial: true,
				naturalBoundary: true,
				now: 0,
			}),
		).toBe(false)

		for (let i = 0; i < INTERSTITIAL_POLICY.minimumCompletedLevels - 1; i += 1) {
			state = recordLevelCompleted(state, false)
		}
		expect(state.completedLevels).toBe(
			INTERSTITIAL_POLICY.minimumCompletedLevels - 1,
		)
		expect(
			canShowInterstitial(state, {
				isTutorial: false,
				naturalBoundary: true,
				now: 0,
			}),
		).toBe(false)
	})

	it('enforces cooldown and maximum one interstitial per session', () => {
		let state = createInterstitialPolicyState()
		state = { ...state, completedLevels: 5 }
		expect(
			canShowInterstitial(state, {
				isTutorial: false,
				naturalBoundary: true,
				now: 0,
			}),
		).toBe(true)

		state = { ...state, lastShownAt: 0, shownThisSession: false }
		expect(
			canShowInterstitial(state, {
				isTutorial: false,
				naturalBoundary: true,
				now: INTERSTITIAL_POLICY.minimumIntervalMs - 1,
			}),
		).toBe(false)
		expect(
			canShowInterstitial(state, {
				isTutorial: false,
				naturalBoundary: true,
				now: INTERSTITIAL_POLICY.minimumIntervalMs,
			}),
		).toBe(true)

		state = recordInterstitialShown(state, INTERSTITIAL_POLICY.minimumIntervalMs)
		expect(
			canShowInterstitial(state, {
				isTutorial: false,
				naturalBoundary: true,
				now: INTERSTITIAL_POLICY.minimumIntervalMs * 2,
			}),
		).toBe(false)
	})

	it('grants rewarded help only from the verified reward callback, once', () => {
		const grant = jest.fn()
		const guard = createRewardGrantGuard(grant)

		guard.onDismissed()
		expect(grant).not.toHaveBeenCalled()
		expect(guard.onVerifiedReward()).toBe(true)
		expect(guard.onVerifiedReward()).toBe(false)
		expect(grant).toHaveBeenCalledTimes(1)
	})

	it('strips board and private content from analytics event parameters', () => {
		const event = buildAnalyticsEvent('level_completed', {
			level_number: 7,
			difficulty: 'ADVANCED',
			move_count: 42,
			board: [['red', 'blue']],
			note: 'private text',
		})
		expect(event).toEqual({
			name: 'level_completed',
			parameters: {
				level_number: 7,
				difficulty: 'ADVANCED',
				move_count: 42,
			},
		})
	})

	it('keeps About identity and external URLs factual', () => {
		expect(ABOUT_APP_NAME).toBe('Water Sort — Сортировка воды')
		expect(ABOUT_WEBSITE_URL).toBe('https://forest-music.ru')
		expect(ABOUT_OTHER_APPS_URL).toBe(
			'https://www.rustore.ru/catalog/developer/pw0k858f',
		)
	})
})
