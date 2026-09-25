import {
	REWARDED_LIFECYCLE_FAILSAFE_MS,
	createRewardedLifecycleSession,
} from '../ads/rewardedLifecycle'

describe('PH10.2 rewarded lifecycle settlement', () => {
	beforeEach(() => {
		jest.useFakeTimers()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('grants once on reward then settles true on dismiss', async () => {
		let grants = 0
		const session = createRewardedLifecycleSession(() => {
			grants += 1
		})

		session.onRewarded()
		session.onRewarded()
		expect(grants).toBe(1)
		expect(session.hasSettled()).toBe(false)

		session.onAdDismissed()
		await expect(session.promise).resolves.toBe(true)
		expect(session.hasSettled()).toBe(true)
		expect(grants).toBe(1)
	})

	it('dismiss without reward settles false and never grants', async () => {
		let grants = 0
		const session = createRewardedLifecycleSession(() => {
			grants += 1
		})
		session.onAdDismissed()
		await expect(session.promise).resolves.toBe(false)
		expect(grants).toBe(0)
	})

	it('failed show settles false without grant', async () => {
		let grants = 0
		const session = createRewardedLifecycleSession(() => {
			grants += 1
		})
		session.onAdFailedToShow()
		await expect(session.promise).resolves.toBe(false)
		expect(grants).toBe(0)
	})

	it('duplicate dismiss / failed after reward settles once as granted', async () => {
		let grants = 0
		const session = createRewardedLifecycleSession(() => {
			grants += 1
		})
		session.onRewarded()
		session.onAdDismissed()
		session.onAdDismissed()
		session.onAdFailedToShow()
		session.onShowPromiseRejected()
		await expect(session.promise).resolves.toBe(true)
		expect(grants).toBe(1)
	})

	it('reward → dismiss → late show rejection stays single settlement', async () => {
		let grants = 0
		const session = createRewardedLifecycleSession(() => {
			grants += 1
		})
		session.onRewarded()
		session.onAdDismissed()
		await expect(session.promise).resolves.toBe(true)
		session.onShowPromiseRejected()
		expect(grants).toBe(1)
		expect(session.hasSettled()).toBe(true)
	})

	it('failure then late dismissal settles once as false', async () => {
		let grants = 0
		const session = createRewardedLifecycleSession(() => {
			grants += 1
		})
		session.onAdFailedToShow()
		session.onAdDismissed()
		await expect(session.promise).resolves.toBe(false)
		expect(grants).toBe(0)
	})

	it('show() rejection settles without grant', async () => {
		let grants = 0
		const session = createRewardedLifecycleSession(() => {
			grants += 1
		})
		session.onShowPromiseRejected()
		await expect(session.promise).resolves.toBe(false)
		expect(grants).toBe(0)
	})

	it('fail-safe settles without grant when no terminal callback arrives', async () => {
		let grants = 0
		const session = createRewardedLifecycleSession(
			() => {
				grants += 1
			},
			{ failSafeMs: REWARDED_LIFECYCLE_FAILSAFE_MS },
		)

		const pending = session.promise
		expect(session.hasSettled()).toBe(false)
		jest.advanceTimersByTime(REWARDED_LIFECYCLE_FAILSAFE_MS)
		await expect(pending).resolves.toBe(false)
		expect(grants).toBe(0)
		expect(session.hasSettled()).toBe(true)
	})

	it('fail-safe after verified reward settles true without double grant', async () => {
		let grants = 0
		const session = createRewardedLifecycleSession(
			() => {
				grants += 1
			},
			{ failSafeMs: 5_000 },
		)
		session.onRewarded()
		expect(grants).toBe(1)
		expect(session.hasSettled()).toBe(false)

		jest.advanceTimersByTime(5_000)
		await expect(session.promise).resolves.toBe(true)
		expect(grants).toBe(1)
	})

	it('fail-safe never grants by itself', async () => {
		let grants = 0
		const session = createRewardedLifecycleSession(
			() => {
				grants += 1
			},
			{ failSafeMs: 1_000 },
		)
		jest.advanceTimersByTime(1_000)
		await expect(session.promise).resolves.toBe(false)
		expect(grants).toBe(0)
	})
})
