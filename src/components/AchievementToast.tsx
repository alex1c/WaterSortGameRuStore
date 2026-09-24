import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { AchievementId } from '../achievements'
import { getAchievementDefinition } from '../achievements'
import { spacing } from '../theme'

interface AchievementToastProps {
	achievementId: AchievementId | null
	onDone: () => void
}

/**
 * Non-blocking unlock toast. Auto-dismisses; never blocks gameplay.
 * Visibility is driven by the prop so we avoid setState-in-effect lint.
 */
export function AchievementToast({ achievementId, onDone }: AchievementToastProps) {
	useEffect(() => {
		if (!achievementId) return
		const timer = setTimeout(() => {
			onDone()
		}, 2600)
		return () => clearTimeout(timer)
	}, [achievementId, onDone])

	if (!achievementId) return null
	const definition = getAchievementDefinition(achievementId)
	if (!definition) return null

	return (
		<View style={styles.wrap} pointerEvents="none" testID="achievement-toast">
			<Text style={styles.eyebrow}>🏆 Достижение</Text>
			<Text style={styles.title}>{definition.title}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		position: 'absolute',
		alignSelf: 'center',
		top: 72,
		minWidth: 220,
		maxWidth: 320,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		borderRadius: 14,
		backgroundColor: 'rgba(23, 51, 58, 0.92)',
		alignItems: 'center',
		zIndex: 40,
	},
	eyebrow: {
		color: 'rgba(255,255,255,0.85)',
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 4,
	},
	title: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '800',
		textAlign: 'center',
	},
})
