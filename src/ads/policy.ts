export const INTERSTITIAL_POLICY = {
	minimumCompletedLevels: 5,
	minimumIntervalMs: 5 * 60 * 1000,
	maximumPerSession: 1,
} as const

export interface InterstitialPolicyState {
	completedLevels: number
	lastShownAt: number | null
	shownThisSession: boolean
}

export interface InterstitialEligibilityRequest {
	isTutorial: boolean
	naturalBoundary: boolean
	now: number
}

export function createInterstitialPolicyState(): InterstitialPolicyState {
	return {
		completedLevels: 0,
		lastShownAt: null,
		shownThisSession: false,
	}
}

export function canShowInterstitial(
	state: InterstitialPolicyState,
	request: InterstitialEligibilityRequest,
): boolean {
	if (request.isTutorial || !request.naturalBoundary) return false
	if (state.completedLevels < INTERSTITIAL_POLICY.minimumCompletedLevels) {
		return false
	}
	if (state.shownThisSession) return false
	if (
		state.lastShownAt !== null &&
		request.now - state.lastShownAt < INTERSTITIAL_POLICY.minimumIntervalMs
	) {
		return false
	}
	return true
}

export function recordLevelCompleted(
	state: InterstitialPolicyState,
	isTutorial: boolean,
): InterstitialPolicyState {
	return {
		...state,
		completedLevels: state.completedLevels + (isTutorial ? 0 : 1),
	}
}

export function recordInterstitialShown(
	state: InterstitialPolicyState,
	now: number,
): InterstitialPolicyState {
	return {
		...state,
		lastShownAt: now,
		shownThisSession: true,
	}
}
