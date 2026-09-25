import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { spacing, uiColors } from '../theme'

interface FreePlayDiscoveryModalProps {
	visible: boolean
	onTry: () => void
	onLater: () => void
}

/**
 * One-time educational prompt after early Campaign progress.
 * Does not interrupt Tutorial and never mentions ads.
 */
export function FreePlayDiscoveryModal({
	visible,
	onTry,
	onLater,
}: FreePlayDiscoveryModalProps) {
	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onLater}
		>
			<View style={styles.backdrop} testID="free-play-discovery-modal">
				<View style={styles.card}>
					<Text style={styles.title}>Хотите посложнее?</Text>
					<Text style={styles.body}>
						В свободной игре можно сразу выбрать Средний, Сложный или Эксперт.
					</Text>
					<Pressable
						accessibilityRole="button"
						onPress={onTry}
						style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
						testID="free-play-discovery-try"
					>
						<Text style={styles.primaryLabel}>Попробовать</Text>
					</Pressable>
					<Pressable
						accessibilityRole="button"
						onPress={onLater}
						style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
						testID="free-play-discovery-later"
					>
						<Text style={styles.secondaryLabel}>Позже</Text>
					</Pressable>
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
		paddingHorizontal: spacing.lg,
	},
	card: {
		width: '100%',
		maxWidth: 360,
		backgroundColor: uiColors.surface,
		borderRadius: 14,
		padding: spacing.md,
		gap: spacing.sm,
	},
	title: {
		color: uiColors.textPrimary,
		fontSize: 18,
		fontWeight: '700',
	},
	body: {
		color: uiColors.textSecondary,
		fontSize: 14,
		lineHeight: 20,
		marginBottom: spacing.xs,
	},
	primary: {
		backgroundColor: uiColors.tubeSelected,
		borderRadius: 10,
		minHeight: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryLabel: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '700',
	},
	secondary: {
		minHeight: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryLabel: {
		color: uiColors.textSecondary,
		fontSize: 14,
		fontWeight: '600',
	},
	pressed: {
		opacity: 0.88,
	},
})
