import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

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
 * Clean level-complete sheet. No advertising inside the dialog.
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
	return (
		<Modal visible={visible} transparent animationType="fade">
			<View style={styles.backdrop} testID="win-modal">
				<View style={styles.card}>
					<Text style={styles.title}>Уровень пройден!</Text>
					<Text style={styles.meta}>Ходов: {moveCount}</Text>
					<Text style={styles.meta}>Сложность: {difficultyLabel}</Text>
					{isFinalCampaignLevel ? (
						<Text style={styles.finalNote}>Первые 100 уровней пройдены</Text>
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
				</View>
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
		borderRadius: 16,
		backgroundColor: uiColors.surface,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.xl,
		gap: spacing.sm,
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
