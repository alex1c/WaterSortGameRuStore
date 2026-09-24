import {
	InterstitialAdLoader,
	MobileAds,
	RewardedAdLoader,
	type InterstitialAd,
	type RewardedAd,
} from 'yandex-mobile-ads'

import { AD_UNIT_IDS } from './config'
import {
	canShowInterstitial,
	createInterstitialPolicyState,
	recordInterstitialShown,
	recordLevelCompleted,
} from './policy'
import { createRewardGrantGuard } from './rewardedPolicy'

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
		interstitialShowing
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
 * Rewarded is intentionally not exposed in the UI in Phase 6. Callers must
 * supply the user-requested reward action; only onAdRewarded can invoke it.
 */
export async function showRewarded(
	onRewardGranted: () => void,
): Promise<boolean> {
	if (rewardedLoading) return false
	rewardedLoading = true
	let ad: RewardedAd | null = null
	try {
		const loader = await RewardedAdLoader.create()
		ad = await loader.loadAd({ adUnitId: AD_UNIT_IDS.rewarded })
		const guard = createRewardGrantGuard(onRewardGranted)
		ad.onRewarded = () => {
			guard.onVerifiedReward()
		}
		ad.onAdDismissed = () => {
			guard.onDismissed()
		}
		ad.onAdFailedToShow = () => {
			guard.onDismissed()
		}
		await ad.show()
		return guard.hasGranted()
	} catch {
		return false
	} finally {
		rewardedLoading = false
	}
}
