import { showRewarded } from '../ads'

export type RewardedActionResult = 'granted' | 'dismissed_or_failed'

/**
 * Run a single rewarded request with exactly one grant path:
 * the verified SDK callback. The boolean return from showRewarded is
 * used only as a mirror of the guard — never as a second grant trigger.
 *
 * Callers must not grant rewards when this returns dismissed_or_failed.
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
