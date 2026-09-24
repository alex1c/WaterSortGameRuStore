import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BannerSlot } from '../components/BannerSlot'
import type { AchievementProgress } from '../achievements'
import { spacing, uiColors } from '../theme'

interface AchievementsScreenProps {
	items: AchievementProgress[]
	onClose: () => void
}

export function AchievementsScreen({ items, onClose }: AchievementsScreenProps) {
	const insets = useSafeAreaInsets()

	return (
		<View
			style={[
				styles.root,
				{
					paddingTop: insets.top,
					paddingLeft: insets.left,
					paddingRight: insets.right,
				},
			]}
			testID="achievements-screen"
		>
			<View style={styles.header}>
				<Text style={styles.title}>Достижения</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Назад"
					onPress={onClose}
					style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
				>
					<Text style={styles.backLabel}>Назад</Text>
				</Pressable>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				{items.map((item) => (
					<View
						key={item.id}
						style={[styles.card, item.unlocked ? styles.cardUnlocked : styles.cardLocked]}
					>
						<View style={styles.cardHeader}>
							<Text style={styles.cardTitle}>{item.title}</Text>
							{item.unlocked ? <Text style={styles.check}>✓</Text> : null}
						</View>
						<Text style={styles.cardBody}>{item.description}</Text>
						{item.target !== null ? (
							<Text style={styles.progress}>
								{Math.min(item.current, item.target)} / {item.target}
								{item.unlocked ? ' ✓' : ''}
							</Text>
						) : null}
					</View>
				))}
			</ScrollView>

			<View style={styles.bottomStack}>
				<BannerSlot placement="information" />
				<View
					style={{ height: insets.bottom, backgroundColor: uiColors.surfaceMuted }}
				/>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: uiColors.background },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.sm,
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	backButton: {
		minHeight: 40,
		paddingHorizontal: spacing.md,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	backLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: uiColors.textPrimary,
	},
	scroll: { flex: 1 },
	content: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.xl,
		gap: spacing.sm,
		paddingTop: spacing.sm,
	},
	card: {
		borderRadius: 14,
		borderWidth: 1,
		padding: spacing.md,
		gap: 4,
	},
	cardUnlocked: {
		backgroundColor: '#E5F6EE',
		borderColor: uiColors.completed,
	},
	cardLocked: {
		backgroundColor: uiColors.surface,
		borderColor: uiColors.border,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: uiColors.textPrimary,
		flex: 1,
		paddingRight: spacing.sm,
	},
	check: {
		fontSize: 16,
		fontWeight: '800',
		color: uiColors.completed,
	},
	cardBody: {
		fontSize: 13,
		color: uiColors.textSecondary,
		lineHeight: 18,
	},
	progress: {
		marginTop: 4,
		fontSize: 13,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	pressed: { opacity: 0.88 },
	bottomStack: { width: '100%' },
})
