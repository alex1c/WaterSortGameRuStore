import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BannerSlot } from '../components/BannerSlot'
import type { DailyHistoryCell } from '../daily'
import { spacing, uiColors } from '../theme'

interface DailyHistoryScreenProps {
	cells: DailyHistoryCell[]
	onClose: () => void
}

/**
 * Compact last-30 local calendar days — informational only.
 * Future dates are never shown; today is marked distinctly.
 */
export function DailyHistoryScreen({ cells, onClose }: DailyHistoryScreenProps) {
	const insets = useSafeAreaInsets()
	// Newest first for scanning recent progress.
	const newestFirst = [...cells].reverse()

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
			testID="daily-history-screen"
		>
			<View style={styles.header}>
				<Text style={styles.title}>История</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Назад"
					onPress={onClose}
					style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
				>
					<Text style={styles.backLabel}>Назад</Text>
				</Pressable>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.legend}>✓ решено · — пропущено · сегодня выделено</Text>
				<View style={styles.grid}>
					{newestFirst.map((cell) => (
						<View
							key={cell.dateKey}
							style={[
								styles.cell,
								cell.isToday && styles.cellToday,
								cell.completed && styles.cellDone,
							]}
							accessibilityLabel={`${cell.dateKey}${cell.completed ? ' решено' : ' не решено'}${cell.isToday ? ', сегодня' : ''}`}
						>
							<Text
								style={[
									styles.cellDay,
									cell.isToday && styles.cellDayToday,
								]}
							>
								{cell.dayOfMonth}
							</Text>
							<Text style={styles.cellMark}>
								{cell.completed ? '✓' : '—'}
							</Text>
						</View>
					))}
				</View>
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
	content: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.md,
		paddingBottom: spacing.xl,
	},
	legend: {
		fontSize: 13,
		color: uiColors.textSecondary,
		marginBottom: spacing.md,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	cell: {
		width: '18%',
		minWidth: 56,
		aspectRatio: 1,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 6,
	},
	cellToday: {
		borderColor: uiColors.tubeSelected,
		borderWidth: 2,
	},
	cellDone: {
		backgroundColor: 'rgba(46, 125, 107, 0.12)',
	},
	cellDay: {
		fontSize: 16,
		fontWeight: '800',
		color: uiColors.textPrimary,
	},
	cellDayToday: {
		color: uiColors.tubeSelected,
	},
	cellMark: {
		marginTop: 2,
		fontSize: 14,
		fontWeight: '700',
		color: uiColors.textSecondary,
	},
	pressed: { opacity: 0.88 },
	bottomStack: { width: '100%' },
})
