import {
	InterstitialAdLoader,
	MobileAds,
	RewardedAdLoader,
	type InterstitialAd,
} from 'yandex-mobile-ads'

import { AD_UNIT_IDS } from './config'
import {
	canShowInterstitial,
	createInterstitialPolicyState,
	recordInterstitialShown,
	recordLevelCompleted,
} from './policy'
import { createRewardedLifecycleSession } from './rewardedLifecycle'

let adsInitialized = false
let interstitialLoader: InterstitialAdLoader | null = null
let loadedInterstitial: InterstitialAd | null = null
let interstitialLoading = false
let interstitialShowing = false
let interstitialPolicy = createInterstitialPolicyState()
let rewardedLoading = false

export function initializeAds(): void {
	if (adsInitialized) return
	adsInitialized = true
	try {
		const result = MobileAds.initialize()
		if (result && typeof result.catch === 'function') {
			void result.catch(() => undefined)
		}
	} catch {
		// A missing/failed ad service must never block the game.
	}
}

export async function preloadInterstitial(): Promise<void> {
	if (interstitialLoading || loadedInterstitial) return
	interstitialLoading = true
	try {
		interstitialLoader ??= await InterstitialAdLoader.create()
		loadedInterstitial = await interstitialLoader.loadAd({
			adUnitId: AD_UNIT_IDS.interstitial,
		})
	} catch {
		loadedInterstitial = null
	} finally {
		interstitialLoading = false
	}
}

/**
 * Records a completed level and shows only a cached ad at the solved-level
 * boundary. A load/show failure resolves silently and never blocks Next Level.
 */
export async function maybeShowInterstitialAfterLevelCompleted(options: {
	isTutorial: boolean
	now?: number
}): Promise<boolean> {
	const now = options.now ?? Date.now()
	interstitialPolicy = recordLevelCompleted(
		interstitialPolicy,
		options.isTutorial,
	)

	if (
		!canShowInterstitial(interstitialPolicy, {
			isTutorial: options.isTutorial,
			naturalBoundary: true,
			now,
		}) ||
		!loadedInterstitial ||
		interstitialShowing ||
		// Avoid stacking interstitial on top of an in-flight rewarded (hint/extra tube).
		rewardedLoading
	) {
		void preloadInterstitial()
		return false
	}

	const ad = loadedInterstitial
	loadedInterstitial = null
	interstitialShowing = true
	interstitialPolicy = recordInterstitialShown(interstitialPolicy, now)
	try {
		await ad.show()
		return true
	} catch {
		return false
	} finally {
		interstitialShowing = false
		void preloadInterstitial()
	}
}

/**
 * Rewarded ads unlock voluntary help: hint packs and an extra empty tube.
 *
 * Settlement must NOT depend solely on ad.show() resolving. Yandex RewardedAd.show()
 * is documented to reject on error; on Android it may never resolve after dismiss.
 * UI completion waits for onAdDismissed / onAdFailedToShow / show() reject / fail-safe.
 *
 * Verified onRewarded remains the only grant path.
 */
export async function showRewarded(
	onRewardGranted: () => void,
): Promise<boolean> {
	if (rewardedLoading) return false
	rewardedLoading = true
	try {
		const loader = await RewardedAdLoader.create()
		const ad = await loader.loadAd({ adUnitId: AD_UNIT_IDS.rewarded })
		const session = createRewardedLifecycleSession(onRewardGranted)

		ad.onRewarded = () => {
			session.onRewarded()
		}
		ad.onAdDismissed = () => {
			session.onAdDismissed()
		}
		ad.onAdFailedToShow = () => {
			session.onAdFailedToShow()
		}

		// Fire show without awaiting its resolve — settle via native terminal events.
		void ad.show().then(
			() => undefined,
			() => {
				session.onShowPromiseRejected()
			},
		)

		return await session.promise
	} catch {
		return false
	} finally {
		rewardedLoading = false
	}
}
