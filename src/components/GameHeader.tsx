import { StyleSheet, Text, View } from 'react-native'

import { SAMPLE_LEVEL_TITLE } from '../game/sampleBoard'
import { spacing, uiColors } from '../theme'

/**
 * Compact header — brand + level line without wasting vertical space.
 */
export function GameHeader() {
	return (
		<View style={styles.container} testID="game-header">
			<Text style={styles.title}>Water Sort</Text>
			<Text style={styles.subtitle}>{SAMPLE_LEVEL_TITLE}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.sm,
		paddingBottom: spacing.xs,
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
})
