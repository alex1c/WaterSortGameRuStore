import { Pressable, StyleSheet, Text, View } from 'react-native'

import { spacing, uiColors } from '../theme'

interface GameHeaderProps {
	levelNumber: number
	difficultyLabel: string
	moveCount: number
	isTrainingActive?: boolean
	onOpenHome: () => void
	onOpenLevels: () => void
	onOpenSettings: () => void
}

/**
 * Compact header with explicit Home route (also used during Training).
 */
export function GameHeader({
	levelNumber,
	difficultyLabel,
	moveCount,
	isTrainingActive = false,
	onOpenHome,
	onOpenLevels,
	onOpenSettings,
}: GameHeaderProps) {
	return (
		<View style={styles.container} testID="game-header">
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={isTrainingActive ? 'На главную' : 'На главную'}
				onPress={onOpenHome}
				style={({ pressed }) => [
					styles.homeButton,
					isTrainingActive && styles.homeButtonTraining,
					pressed && styles.pressed,
				]}
				testID="game-home-button"
			>
				<Text style={styles.homeLabel}>
					{isTrainingActive ? '← На главную' : '←'}
				</Text>
			</Pressable>
			<View style={styles.textBlock}>
				<Text style={styles.title}>Уровень {levelNumber}</Text>
				<Text style={styles.subtitle}>
					{difficultyLabel} · {moveCount} {pluralMoves(moveCount)}
				</Text>
			</View>
			<View style={styles.actions}>
				{!isTrainingActive ? (
					<HeaderButton label="Уровни" onPress={onOpenLevels} />
				) : null}
				<HeaderButton
					label="☰"
					accessibilityLabel="Настройки"
					onPress={onOpenSettings}
					compact
				/>
			</View>
		</View>
	)
}

function HeaderButton({
	label,
	onPress,
	accessibilityLabel,
	compact = false,
}: {
	label: string
	onPress: () => void
	accessibilityLabel?: string
	compact?: boolean
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? label}
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				compact && styles.buttonCompact,
				pressed && styles.pressed,
			]}
		>
			<Text style={styles.buttonLabel}>{label}</Text>
		</Pressable>
	)
}

function pluralMoves(count: number): string {
	const mod10 = count % 10
	const mod100 = count % 100
	if (mod10 === 1 && mod100 !== 11) return 'ход'
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'хода'
	return 'ходов'
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.md,
		paddingTop: spacing.sm,
		paddingBottom: spacing.xs,
		gap: spacing.sm,
	},
	homeButton: {
		minHeight: 40,
		minWidth: 40,
		paddingHorizontal: spacing.sm,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	homeButtonTraining: {
		paddingHorizontal: spacing.md,
		borderColor: uiColors.tubeSelected,
	},
	homeLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	textBlock: {
		flex: 1,
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	subtitle: {
		marginTop: 2,
		fontSize: 12,
		color: uiColors.textSecondary,
	},
	actions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	button: {
		minHeight: 40,
		paddingHorizontal: spacing.md,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonCompact: {
		minWidth: 40,
		paddingHorizontal: spacing.sm,
	},
	pressed: {
		backgroundColor: uiColors.controlPressed,
	},
	buttonLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: uiColors.textPrimary,
	},
})
