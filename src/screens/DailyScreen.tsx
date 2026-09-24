import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BannerSlot } from '../components/BannerSlot'
import { spacing, uiColors } from '../theme'

interface DailyScreenProps {
	todayLabel: string
	difficultyLabel: string
	activeStreak: number
	bestStreak: number
	completedToday: boolean
	hasInProgressSession: boolean
	inProgressMoveCount: number
	onPlay: () => void
	onContinue: () => void
	onReplay: () => void
	onOpenHistory: () => void
	onClose: () => void
}

/**
 * Daily Puzzle hub — date, difficulty, streak, primary play action.
 */
export function DailyScreen({
	todayLabel,
	difficultyLabel,
	activeStreak,
	bestStreak,
	completedToday,
	hasInProgressSession,
	inProgressMoveCount,
	onPlay,
	onContinue,
	onReplay,
	onOpenHistory,
	onClose,
}: DailyScreenProps) {
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
			testID="daily-screen"
		>
			<View style={styles.header}>
				<Text style={styles.title}>Головоломка дня</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Назад на главную"
					onPress={onClose}
					style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
				>
					<Text style={styles.backLabel}>Назад</Text>
				</Pressable>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.sectionLabel}>Сегодня</Text>
				<Text style={styles.dateValue}>{todayLabel}</Text>
				<Text style={styles.meta}>Сложность: {difficultyLabel}</Text>

				<View style={styles.streakCard}>
					<Text style={styles.streakValue}>
						🔥 {activeStreak} {pluralDays(activeStreak)}
					</Text>
					<Text style={styles.streakBest}>
						Лучший результат: {bestStreak} {pluralDays(bestStreak)}
					</Text>
				</View>

				{hasInProgressSession ? (
					<Pressable
						accessibilityRole="button"
						onPress={onContinue}
						style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
						testID="daily-continue"
					>
						<Text style={styles.primaryLabel}>Продолжить</Text>
						<Text style={styles.primaryMeta}>
							{inProgressMoveCount} {pluralMoves(inProgressMoveCount)}
						</Text>
					</Pressable>
				) : completedToday ? (
					<Pressable
						accessibilityRole="button"
						onPress={onReplay}
						style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
						testID="daily-replay"
					>
						<Text style={styles.primaryLabel}>Сыграть ещё раз</Text>
					</Pressable>
				) : (
					<Pressable
						accessibilityRole="button"
						onPress={onPlay}
						style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
						testID="daily-play"
					>
						<Text style={styles.primaryLabel}>Играть</Text>
					</Pressable>
				)}

				<Pressable
					accessibilityRole="button"
					onPress={onOpenHistory}
					style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
					testID="daily-history"
				>
					<Text style={styles.secondaryLabel}>История · 30 дней</Text>
				</Pressable>

				<Text style={styles.note}>
					Дата головоломки дня — локальный календарь устройства.
				</Text>
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

export function pluralDays(count: number): string {
	const mod10 = count % 10
	const mod100 = count % 100
	if (mod10 === 1 && mod100 !== 11) return 'день'
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня'
	return 'дней'
}

function pluralMoves(count: number): string {
	const mod10 = count % 10
	const mod100 = count % 100
	if (mod10 === 1 && mod100 !== 11) return 'ход'
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'хода'
	return 'ходов'
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
	content: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.lg,
		paddingBottom: spacing.xl,
		gap: spacing.md,
	},
	sectionLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: uiColors.textSecondary,
		textTransform: 'uppercase',
	},
	dateValue: {
		fontSize: 28,
		fontWeight: '800',
		color: uiColors.textPrimary,
	},
	meta: {
		fontSize: 16,
		fontWeight: '600',
		color: uiColors.textSecondary,
		marginBottom: spacing.sm,
	},
	streakCard: {
		paddingVertical: spacing.md,
		gap: 4,
	},
	streakValue: {
		fontSize: 20,
		fontWeight: '800',
		color: uiColors.textPrimary,
	},
	streakBest: {
		fontSize: 14,
		color: uiColors.textSecondary,
		fontWeight: '600',
	},
	primary: {
		minHeight: 72,
		borderRadius: 16,
		backgroundColor: uiColors.tubeSelected,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.lg,
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
	},
	secondary: {
		minHeight: 52,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	note: {
		marginTop: spacing.sm,
		fontSize: 12,
		color: uiColors.textSecondary,
		lineHeight: 18,
	},
	pressed: { opacity: 0.88 },
	bottomStack: { width: '100%' },
})
