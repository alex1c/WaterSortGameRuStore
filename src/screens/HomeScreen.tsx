import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BannerSlot } from '../components/BannerSlot'
import { APP_DISPLAY_NAME } from '../about/config'
import { CAMPAIGN_LEVEL_COUNT } from '../campaign'
import { spacing, uiColors } from '../theme'

interface HomeScreenProps {
	ready: boolean
	continueLevel: number
	continueDifficultyLabel: string
	levelsCompleted: number
	hasMidLevelSession: boolean
	dailyCompletedToday: boolean
	dailyActiveStreak: number
	onContinue: () => void
	onOpenLevels: () => void
	onOpenFreePlay: () => void
	onOpenDaily: () => void
	onOpenAchievements: () => void
	onOpenStatistics: () => void
	onOpenSettings: () => void
}

/**
 * Central navigation hub. Banner sits above the real bottom safe-area.
 */
export function HomeScreen({
	ready,
	continueLevel,
	continueDifficultyLabel,
	levelsCompleted,
	hasMidLevelSession,
	dailyCompletedToday,
	dailyActiveStreak,
	onContinue,
	onOpenLevels,
	onOpenFreePlay,
	onOpenDaily,
	onOpenAchievements,
	onOpenStatistics,
	onOpenSettings,
}: HomeScreenProps) {
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
			testID="home-screen"
		>
			<View style={styles.content}>
				<Text style={styles.brand}>{APP_DISPLAY_NAME}</Text>
				<Text style={styles.progress}>
					Пройдено: {levelsCompleted} / {CAMPAIGN_LEVEL_COUNT}
				</Text>

				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Продолжить"
					disabled={!ready}
					onPress={onContinue}
					style={({ pressed }) => [
						styles.primary,
						pressed && styles.pressed,
						!ready && styles.disabled,
					]}
				>
					<Text style={styles.primaryLabel}>Продолжить</Text>
					<Text style={styles.primaryMeta}>
						{hasMidLevelSession ? 'Сохранённая партия · ' : ''}
						Уровень {continueLevel} · {continueDifficultyLabel}
					</Text>
				</Pressable>

				<Pressable
					accessibilityRole="button"
					onPress={onOpenLevels}
					style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
				>
					<Text style={styles.secondaryLabel}>Уровни</Text>
				</Pressable>

				<Pressable
					accessibilityRole="button"
					onPress={onOpenFreePlay}
					style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
					testID="home-free-play"
				>
					<Text style={styles.secondaryLabel}>Свободная игра</Text>
					<Text style={styles.freePlayMeta}>
						Выберите сложность — вплоть до Эксперта
					</Text>
				</Pressable>

				<Pressable
					accessibilityRole="button"
					onPress={onOpenDaily}
					style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
					testID="home-daily"
				>
					<Text style={styles.secondaryLabel}>
						Головоломка дня{dailyCompletedToday ? ' ✓' : ''}
					</Text>
					{dailyActiveStreak > 0 ? (
						<Text style={styles.dailyMeta}>🔥 Серия: {dailyActiveStreak}</Text>
					) : null}
				</Pressable>

				<View style={styles.row}>
					<Pressable
						accessibilityRole="button"
						onPress={onOpenAchievements}
						style={({ pressed }) => [
							styles.half,
							pressed && styles.pressed,
						]}
					>
						<Text style={styles.secondaryLabel}>Достижения</Text>
					</Pressable>
					<Pressable
						accessibilityRole="button"
						onPress={onOpenStatistics}
						style={({ pressed }) => [
							styles.half,
							pressed && styles.pressed,
						]}
					>
						<Text style={styles.secondaryLabel}>Статистика</Text>
					</Pressable>
				</View>

				<Pressable
					accessibilityRole="button"
					onPress={onOpenSettings}
					style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
				>
					<Text style={styles.ghostLabel}>Настройки</Text>
				</Pressable>
			</View>

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
	root: {
		flex: 1,
		backgroundColor: uiColors.background,
	},
	content: {
		flex: 1,
		paddingHorizontal: spacing.xl,
		justifyContent: 'center',
		gap: spacing.md,
	},
	brand: {
		fontSize: 36,
		fontWeight: '800',
		color: uiColors.textPrimary,
		textAlign: 'center',
		marginBottom: spacing.sm,
	},
	progress: {
		textAlign: 'center',
		fontSize: 15,
		color: uiColors.textSecondary,
		marginBottom: spacing.md,
	},
	primary: {
		minHeight: 72,
		borderRadius: 16,
		backgroundColor: uiColors.tubeSelected,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
	},
	primaryLabel: {
		color: '#FFFFFF',
		fontSize: 20,
		fontWeight: '800',
	},
	primaryMeta: {
		marginTop: 4,
		color: 'rgba(255,255,255,0.9)',
		fontSize: 13,
		fontWeight: '600',
		textAlign: 'center',
	},
	secondary: {
		minHeight: 52,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: spacing.sm,
	},
	secondaryLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	freePlayMeta: {
		marginTop: 3,
		fontSize: 12,
		fontWeight: '500',
		color: uiColors.textSecondary,
		textAlign: 'center',
		paddingHorizontal: spacing.sm,
	},
	dailyMeta: {
		marginTop: 2,
		fontSize: 13,
		fontWeight: '600',
		color: uiColors.textSecondary,
	},
	row: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	half: {
		flex: 1,
		minHeight: 52,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ghost: {
		minHeight: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ghostLabel: {
		fontSize: 15,
		fontWeight: '600',
		color: uiColors.textSecondary,
	},
	pressed: {
		opacity: 0.88,
	},
	disabled: {
		opacity: 0.6,
	},
	bottomStack: {
		width: '100%',
	},
})
