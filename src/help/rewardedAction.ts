import { showRewarded } from '../ads'

export type RewardedActionResult = 'granted' | 'dismissed_or_failed'

/**
 * Run a single rewarded request with exactly one grant path:
 * the verified SDK onRewarded callback inside showRewarded().
 *
 * The boolean returned by showRewarded mirrors whether a verified grant
 * occurred — it must never trigger a second grant here.
 *
 * showRewarded is required to settle on dismiss / fail / fail-safe so this
 * await cannot hang forever after a completed ad.
 */
export async function runVerifiedRewardedAction(
	onGrant: () => void,
): Promise<RewardedActionResult> {
	let grantedViaCallback = false
	await showRewarded(() => {
		// Duplicate SDK callbacks are ignored — grant at most once per show.
		if (grantedViaCallback) return
		grantedViaCallback = true
		onGrant()
	})
	return grantedViaCallback ? 'granted' : 'dismissed_or_failed'
}
