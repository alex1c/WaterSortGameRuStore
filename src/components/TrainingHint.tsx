import { StyleSheet, Text, View } from 'react-native'

import { spacing, uiColors } from '../theme'

interface TrainingHintProps {
	/** Hide after the player completes the first successful pour. */
	visible: boolean
}

/**
 * Lightweight onboarding line for ForestMusic training prep.
 * Full tutorial flow is intentionally deferred to a later phase.
 */
export function TrainingHint({ visible }: TrainingHintProps) {
	if (!visible) {
		return null
	}

	return (
		<View style={styles.container} testID="training-hint">
			<Text style={styles.text}>
				Выберите пробирку, затем укажите, куда перелить воду
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		marginHorizontal: spacing.lg,
		marginBottom: spacing.sm,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		borderRadius: 8,
		backgroundColor: uiColors.hintBackground,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: uiColors.border,
	},
	text: {
		fontSize: 13,
		lineHeight: 18,
		color: uiColors.textSecondary,
		textAlign: 'center',
	},
})
