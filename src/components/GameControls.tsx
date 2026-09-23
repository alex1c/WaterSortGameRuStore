import { Pressable, StyleSheet, Text, View } from 'react-native'

import { spacing, uiColors } from '../theme'

interface GameControlsProps {
	onUndo: () => void
	onHint: () => void
	onRestart: () => void
}

/**
 * Bottom game actions. Must sit ABOVE AdBannerPlaceholder in the screen
 * flex stack (never absolutely pinned to the physical screen bottom).
 */
export function GameControls({ onUndo, onHint, onRestart }: GameControlsProps) {
	return (
		<View style={styles.row} testID="game-controls">
			<ControlButton label="Отмена" onPress={onUndo} />
			<ControlButton label="Подсказка" onPress={onHint} />
			<ControlButton label="Заново" onPress={onRestart} />
		</View>
	)
}

interface ControlButtonProps {
	label: string
	onPress: () => void
}

function ControlButton({ label, onPress }: ControlButtonProps) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				pressed && styles.buttonPressed,
			]}
		>
			<Text style={styles.buttonLabel}>{label}</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: spacing.sm,
		paddingHorizontal: spacing.md,
		paddingTop: spacing.sm,
		paddingBottom: spacing.sm,
		backgroundColor: uiColors.surfaceMuted,
	},
	button: {
		flex: 1,
		minHeight: 48,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.sm,
	},
	buttonPressed: {
		backgroundColor: uiColors.controlPressed,
	},
	buttonLabel: {
		color: uiColors.textPrimary,
		fontSize: 14,
		fontWeight: '600',
	},
})
