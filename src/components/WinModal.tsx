import { useEffect, useState } from 'react'
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { spacing, uiColors } from '../theme'

interface WinModalProps {
	visible: boolean
	levelNumber: number
	moveCount: number
	difficultyLabel: string
	isFinalCampaignLevel: boolean
	onNext: () => void
	onReplay: () => void
}

/**
 * Clean level-complete sheet with a short restrained celebration.
 * No advertising, loot, or currency.
 */
export function WinModal({
	visible,
	levelNumber,
	moveCount,
	difficultyLabel,
	isFinalCampaignLevel,
	onNext,
	onReplay,
}: WinModalProps) {
	const [pop] = useState(() => new Animated.Value(0.92))
	const [glow] = useState(() => new Animated.Value(0))

	useEffect(() => {
		if (!visible) return
		pop.setValue(0.92)
		glow.setValue(0)
		Animated.parallel([
			Animated.spring(pop, {
				toValue: 1,
				friction: 6,
				tension: 120,
				useNativeDriver: true,
			}),
			Animated.timing(glow, {
				toValue: 1,
				duration: 420,
				useNativeDriver: true,
			}),
		]).start()
	}, [visible, pop, glow])

	return (
		<Modal visible={visible} transparent animationType="fade">
			<View style={styles.backdrop} testID="win-modal">
				<Animated.View
					style={[
						styles.card,
						{
							transform: [{ scale: pop }],
							opacity: glow.interpolate({
								inputRange: [0, 1],
								outputRange: [0.85, 1],
							}),
						},
					]}
				>
					<Text style={styles.emoji}>✓</Text>
					<Text style={styles.title}>Уровень пройден!</Text>
					<Text style={styles.meta}>Ходов: {moveCount}</Text>
					<Text style={styles.meta}>Сложность: {difficultyLabel}</Text>
					{isFinalCampaignLevel ? (
						<Text style={styles.finalNote}>1000 уровней пройдено!</Text>
					) : null}

					<Pressable
						accessibilityRole="button"
						onPress={onNext}
						style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
					>
						<Text style={styles.primaryLabel}>
							{isFinalCampaignLevel ? 'Готово' : 'Следующий уровень'}
						</Text>
					</Pressable>

					<Pressable
						accessibilityRole="button"
						onPress={onReplay}
						style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
					>
						<Text style={styles.secondaryLabel}>Повторить</Text>
					</Pressable>

					{!isFinalCampaignLevel ? (
						<Text style={styles.levelNote}>Уровень {levelNumber}</Text>
					) : null}
				</Animated.View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: uiColors.overlay,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.xl,
	},
	card: {
		width: '100%',
		maxWidth: 360,
		borderRadius: 18,
		backgroundColor: uiColors.surface,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.xl,
		gap: spacing.sm,
	},
	emoji: {
		alignSelf: 'center',
		width: 44,
		height: 44,
		borderRadius: 22,
		overflow: 'hidden',
		textAlign: 'center',
		lineHeight: 44,
		fontSize: 22,
		fontWeight: '800',
		color: '#FFFFFF',
		backgroundColor: uiColors.winAccent,
		marginBottom: spacing.xs,
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		color: uiColors.textPrimary,
		textAlign: 'center',
		marginBottom: spacing.xs,
	},
	meta: {
		fontSize: 15,
		color: uiColors.textSecondary,
		textAlign: 'center',
	},
	finalNote: {
		marginTop: spacing.sm,
		fontSize: 14,
		fontWeight: '600',
		color: uiColors.completed,
		textAlign: 'center',
	},
	primary: {
		marginTop: spacing.md,
		minHeight: 48,
		borderRadius: 12,
		backgroundColor: uiColors.tubeSelected,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryLabel: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '700',
	},
	secondary: {
		minHeight: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryLabel: {
		color: uiColors.textPrimary,
		fontSize: 15,
		fontWeight: '600',
	},
	pressed: {
		opacity: 0.88,
	},
	levelNote: {
		marginTop: spacing.xs,
		fontSize: 12,
		color: uiColors.textSecondary,
		textAlign: 'center',
	},
})
