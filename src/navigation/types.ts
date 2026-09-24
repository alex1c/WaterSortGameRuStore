/**
 * Lightweight in-app navigation routes.
 * Home is the stack root; Android Back pops toward Home.
 */
export type AppRouteName =
	| 'home'
	| 'game'
	| 'levels'
	| 'statistics'
	| 'achievements'
	| 'settings'
	| 'about'
	| 'free_play'
	| 'free_play_game'
	| 'daily'
	| 'daily_game'
	| 'daily_history'

export type AppRoute = { name: AppRouteName }

/**
 * Deliberate Android Back targets (not a generic pop).
 *
 * Most hub routes → Home
 * ABOUT → previous (Settings) when present
 * DAILY_GAME / DAILY_HISTORY → Daily hub (preserve today's session)
 * FREE_PLAY / FREE_PLAY_GAME → Home (preserve Free Play session)
 * HOME → null (system exit)
 */
export function resolveBackTarget(stack: AppRoute[]): AppRouteName | null {
	if (stack.length === 0) return null
	const top = stack[stack.length - 1]
	if (!top || top.name === 'home') return null

	if (top.name === 'about') {
		const previous = stack[stack.length - 2]
		return previous?.name ?? 'home'
	}

	if (top.name === 'daily_game' || top.name === 'daily_history') {
		return 'daily'
	}

	return 'home'
}

/** Push a route, collapsing duplicates of the same name at the top. */
export function pushRoute(stack: AppRoute[], route: AppRoute): AppRoute[] {
	const top = stack[stack.length - 1]
	if (top?.name === route.name) return stack
	return [...stack, route]
}

export function popRoute(stack: AppRoute[]): AppRoute[] {
	if (stack.length <= 1) return [{ name: 'home' }]
	return stack.slice(0, -1)
}

export function replaceStack(route: AppRoute): AppRoute[] {
	return [route]
}
