import { StyleSheet, Text, View } from 'react-native'

import type { TrainingStep } from '../hooks/useCampaignGame'
import { spacing, uiColors } from '../theme'

interface TrainingHintProps {
	step: TrainingStep
}

/**
 * In-game Level 1 coaching lines. Not a multi-screen onboarding flow.
 */
export function TrainingHint({ step }: TrainingHintProps) {
	const text = messageForStep(step)
	if (!text) {
		return null
	}

	return (
		<View style={styles.container} testID="training-hint">
			<Text style={styles.text}>{text}</Text>
		</View>
	)
}

function messageForStep(step: TrainingStep): string | null {
	switch (step) {
		case 'pick-source':
			return 'Выберите пробирку'
		case 'pick-destination':
			return 'Теперь выберите, куда перелить воду'
		case 'encourage':
			return 'Отлично! Соберите каждый цвет в отдельной пробирке'
		case 'done':
			return null
		default: {
			const _exhaustive: never = step
			return _exhaustive
		}
	}
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
