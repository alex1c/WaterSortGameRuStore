export interface RewardGrantGuard {
	onVerifiedReward: () => boolean
	onDismissed: () => void
	hasGranted: () => boolean
}

/**
 * A reward can only be granted from the SDK's verified reward callback.
 * Dismissal, load errors, and failed-to-show paths intentionally do nothing.
 */
export function createRewardGrantGuard(onGrant: () => void): RewardGrantGuard {
	let granted = false

	return {
		onVerifiedReward: () => {
			if (granted) return false
			granted = true
			onGrant()
			return true
		},
		onDismissed: () => undefined,
		hasGranted: () => granted,
	}
}
