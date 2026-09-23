import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	CAMPAIGN_LEVEL_COUNT,
	isLevelCompleted,
	isLevelUnlocked,
} from '../campaign'
import { spacing, uiColors } from '../theme'
import { AdBannerPlaceholder } from '../components/AdBannerPlaceholder'

interface LevelSelectScreenProps {
	currentLevel: number
	highestUnlockedLevel: number
	campaignComplete: boolean
	onSelectLevel: (levelNumber: number) => void
	onClose: () => void
}

/**
 * Compact 1–100 campaign grid. Unlocked / completed / locked are distinct;
 * locked levels cannot be opened.
 */
export function LevelSelectScreen({
	currentLevel,
	highestUnlockedLevel,
	campaignComplete,
	onSelectLevel,
	onClose,
}: LevelSelectScreenProps) {
	const insets = useSafeAreaInsets()
	const levels = Array.from({ length: CAMPAIGN_LEVEL_COUNT }, (_, i) => i + 1)

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
			testID="level-select-screen"
		>
			<View style={styles.header}>
				<Text style={styles.title}>Уровни</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Закрыть"
					onPress={onClose}
					style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
				>
					<Text style={styles.closeLabel}>Назад</Text>
				</Pressable>
			</View>
			<Text style={styles.subtitle}>
				Открыто до {highestUnlockedLevel}
				{campaignComplete ? ' · Кампания пройдена' : ''}
			</Text>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.grid}
				showsVerticalScrollIndicator={false}
			>
				{levels.map((level) => {
					const unlocked = isLevelUnlocked(level, highestUnlockedLevel)
					const completed = isLevelCompleted(
						level,
						highestUnlockedLevel,
						campaignComplete,
					)
					const isCurrent = level === currentLevel
					return (
						<Pressable
							key={level}
							disabled={!unlocked}
							accessibilityRole="button"
							accessibilityState={{ disabled: !unlocked, selected: isCurrent }}
							accessibilityLabel={`Уровень ${level}`}
							onPress={() => onSelectLevel(level)}
							style={({ pressed }) => [
								styles.cell,
								completed && styles.cellCompleted,
								unlocked && !completed && styles.cellUnlocked,
								!unlocked && styles.cellLocked,
								isCurrent && styles.cellCurrent,
								pressed && unlocked && styles.pressed,
							]}
						>
							<Text
								style={[
									styles.cellLabel,
									!unlocked && styles.cellLabelLocked,
								]}
							>
								{level}
							</Text>
						</Pressable>
					)
				})}
			</ScrollView>

			{/* Preserve ForestMusic bottom stack on this screen too. */}
			<View style={styles.bottomStack}>
				<AdBannerPlaceholder />
				<View style={{ height: insets.bottom, backgroundColor: uiColors.surfaceMuted }} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: uiColors.background,
	},
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
	closeButton: {
		minHeight: 40,
		paddingHorizontal: spacing.md,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	closeLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: uiColors.textPrimary,
	},
	subtitle: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.sm,
		marginTop: 4,
		fontSize: 13,
		color: uiColors.textSecondary,
	},
	scroll: {
		flex: 1,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: spacing.md,
		paddingBottom: spacing.lg,
		gap: spacing.sm,
	},
	cell: {
		width: '18%',
		aspectRatio: 1,
		minWidth: 52,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
	},
	cellUnlocked: {
		backgroundColor: uiColors.surface,
		borderColor: uiColors.unlocked,
	},
	cellCompleted: {
		backgroundColor: '#E5F6EE',
		borderColor: uiColors.completed,
	},
	cellLocked: {
		backgroundColor: '#E8EEF1',
		borderColor: uiColors.locked,
	},
	cellCurrent: {
		borderWidth: 2,
		borderColor: uiColors.tubeSelected,
	},
	cellLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	cellLabelLocked: {
		color: uiColors.locked,
	},
	pressed: {
		opacity: 0.85,
	},
	bottomStack: {
		width: '100%',
	},
})
