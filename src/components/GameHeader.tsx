import { Pressable, StyleSheet, Text, View } from 'react-native'

import { spacing, uiColors } from '../theme'

interface GameHeaderProps {
	levelNumber: number
	difficultyLabel: string
	moveCount: number
	onOpenLevels: () => void
}

/**
 * Compact campaign header — level, difficulty, move count.
 */
export function GameHeader({
	levelNumber,
	difficultyLabel,
	moveCount,
	onOpenLevels,
}: GameHeaderProps) {
	return (
		<View style={styles.container} testID="game-header">
			<View style={styles.textBlock}>
				<Text style={styles.title}>Уровень {levelNumber}</Text>
				<Text style={styles.subtitle}>
					{difficultyLabel} · {moveCount}{' '}
					{pluralMoves(moveCount)}
				</Text>
			</View>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Выбор уровня"
				onPress={onOpenLevels}
				style={({ pressed }) => [styles.levelsButton, pressed && styles.pressed]}
			>
				<Text style={styles.levelsLabel}>Уровни</Text>
			</Pressable>
		</View>
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
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.sm,
		paddingBottom: spacing.xs,
		gap: spacing.sm,
	},
	textBlock: {
		flex: 1,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	subtitle: {
		marginTop: 2,
		fontSize: 13,
		color: uiColors.textSecondary,
	},
	levelsButton: {
		minHeight: 40,
		paddingHorizontal: spacing.md,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pressed: {
		backgroundColor: uiColors.controlPressed,
	},
	levelsLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: uiColors.textPrimary,
	},
})
