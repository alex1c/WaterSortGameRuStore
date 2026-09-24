import { useCallback, useEffect, useState } from 'react'
import { BackHandler } from 'react-native'

import {
	pushRoute,
	replaceStack,
	resolveBackTarget,
	type AppRoute,
	type AppRouteName,
} from './types'

/**
 * Stack navigation with deliberate Android Back handling.
 * Home is the only route that allows the system to exit the app.
 */
export function useAppNavigation(initial: AppRouteName = 'home') {
	const [stack, setStack] = useState<AppRoute[]>([{ name: initial }])
	const current = stack[stack.length - 1]?.name ?? 'home'

	const navigate = useCallback((name: AppRouteName) => {
		setStack((prev) => pushRoute(prev, { name }))
	}, [])

	const goHome = useCallback(() => {
		setStack(replaceStack({ name: 'home' }))
	}, [])

	const goBack = useCallback((): boolean => {
		const target = resolveBackTarget(stack)
		if (target === null) {
			// Home root — allow system exit.
			return false
		}
		if (target === 'home') {
			setStack(replaceStack({ name: 'home' }))
			return true
		}
		if (target === 'daily') {
			// Daily game/history → Daily hub (keep Home under it when possible).
			setStack((prev) => {
				const trimmed = prev.filter(
					(route) =>
						route.name !== 'daily_game' && route.name !== 'daily_history',
				)
				if (trimmed.some((route) => route.name === 'daily')) {
					return trimmed
				}
				const withoutTop = trimmed.length > 0 ? trimmed : [{ name: 'home' as const }]
				return pushRoute(withoutTop, { name: 'daily' })
			})
			return true
		}
		// ABOUT → Settings: trim to the previous route.
		setStack((prev) => {
			if (prev.length <= 1) return replaceStack({ name: 'home' })
			return prev.slice(0, -1)
		})
		return true
	}, [stack])

	useEffect(() => {
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
			return goBack()
		})
		return () => subscription.remove()
	}, [goBack])

	return {
		current,
		stack,
		navigate,
		goHome,
		goBack,
	}
}

export type { AppRoute, AppRouteName }
export { resolveBackTarget, pushRoute, popRoute, replaceStack } from './types'
