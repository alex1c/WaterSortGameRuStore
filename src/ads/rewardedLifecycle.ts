import { createRewardGrantGuard } from './rewardedPolicy'

/**
 * Conservative upper bound for a full rewarded lifecycle (load → watch → close).
 * Used only when native dismiss/fail callbacks never arrive — never grants a reward.
 */
export const REWARDED_LIFECYCLE_FAILSAFE_MS = 90_000

export interface RewardedLifecycleSession {
	/** Verified SDK reward callback — grants at most once. Does not settle. */
	onRewarded: () => void
	/** Native ad closed — settles the session. */
	onAdDismissed: () => void
	/** Native show failure — settles the session. */
	onAdFailedToShow: () => void
	/**
	 * show() Promise rejection. Settles as a failed presentation.
	 * show() resolution is intentionally ignored: Yandex docs only promise
	 * reject-on-error; resolve timing is not a reliable dismiss signal.
	 */
	onShowPromiseRejected: () => void
	/** Resolves true iff a verified reward was granted for this session. */
	promise: Promise<boolean>
	hasSettled: () => boolean
	hasGranted: () => boolean
}

export interface RewardedLifecycleOptions {
	failSafeMs?: number
	setTimeoutFn?: typeof setTimeout
	clearTimeoutFn?: typeof clearTimeout
}

/**
 * Explicit rewarded completion model for Yandex Mobile Ads 8.x.
 *
 * Grant path: onRewarded only (via createRewardGrantGuard).
 * Settlement path: onAdDismissed | onAdFailedToShow | show() reject | fail-safe.
 *
 * Settlement is idempotent. Fail-safe never grants and never revokes a prior grant.
 */
export function createRewardedLifecycleSession(
	onVerifiedReward: () => void,
	options: RewardedLifecycleOptions = {},
): RewardedLifecycleSession {
	const failSafeMs = Math.max(0, options.failSafeMs ?? REWARDED_LIFECYCLE_FAILSAFE_MS)
	const schedule = options.setTimeoutFn ?? setTimeout
	const clear = options.clearTimeoutFn ?? clearTimeout

	const guard = createRewardGrantGuard(onVerifiedReward)
	let settled = false
	let failSafeHandle: ReturnType<typeof setTimeout> | null = null

	let resolvePromise: (granted: boolean) => void = () => undefined
	const promise = new Promise<boolean>((resolve) => {
		resolvePromise = resolve
	})

	const settle = () => {
		if (settled) return
		settled = true
		if (failSafeHandle !== null) {
			clear(failSafeHandle as never)
			failSafeHandle = null
		}
		resolvePromise(guard.hasGranted())
	}

	failSafeHandle = schedule(() => {
		// Preserve any verified grant; never invent one on timeout.
		settle()
	}, failSafeMs)

	return {
		onRewarded: () => {
			guard.onVerifiedReward()
		},
		onAdDismissed: () => {
			settle()
		},
		onAdFailedToShow: () => {
			settle()
		},
		onShowPromiseRejected: () => {
			settle()
		},
		promise,
		hasSettled: () => settled,
		hasGranted: () => guard.hasGranted(),
	}
}
