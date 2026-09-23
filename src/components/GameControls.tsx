import { Pressable, StyleSheet, Text, View } from 'react-native'

import { spacing, uiColors } from '../theme'

interface GameControlsProps {
	onUndo: () => void
	onHint: () => void
	onRestart: () => void
	canUndo: boolean
}

/**
 * Bottom game actions. Must sit ABOVE AdBannerPlaceholder in the screen
 * flex stack (never absolutely pinned to the physical screen bottom).
 */
export function GameControls({
	onUndo,
	onHint,
	onRestart,
	canUndo,
}: GameControlsProps) {
	return (
		<View style={styles.row} testID="game-controls">
			<ControlButton label="Отмена" onPress={onUndo} disabled={!canUndo} />
			<ControlButton label="Подсказка" onPress={onHint} />
			<ControlButton label="Заново" onPress={onRestart} />
		</View>
	)
}

interface ControlButtonProps {
	label: string
	onPress: () => void
	disabled?: boolean
}

function ControlButton({ label, onPress, disabled = false }: ControlButtonProps) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				disabled && styles.buttonDisabled,
				pressed && !disabled && styles.buttonPressed,
			]}
		>
			<Text style={[styles.buttonLabel, disabled && styles.buttonLabelDisabled]}>
				{label}
			</Text>
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
	buttonDisabled: {
		borderColor: uiColors.controlDisabled,
		backgroundColor: '#EEF3F5',
	},
	buttonLabel: {
		color: uiColors.textPrimary,
		fontSize: 14,
		fontWeight: '600',
	},
	buttonLabelDisabled: {
		color: uiColors.controlDisabled,
	},
})
