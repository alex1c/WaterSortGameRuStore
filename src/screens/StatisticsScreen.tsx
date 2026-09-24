import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BannerSlot } from '../components/BannerSlot'
import { CAMPAIGN_LEVEL_COUNT, getDifficultyLabelRu } from '../campaign'
import type { GameStatistics } from '../statistics'
import { spacing, uiColors } from '../theme'

interface StatisticsScreenProps {
	statistics: GameStatistics
	onClose: () => void
}

export function StatisticsScreen({ statistics, onClose }: StatisticsScreenProps) {
	const insets = useSafeAreaInsets()
	const s = statistics

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
			testID="statistics-screen"
		>
			<View style={styles.header}>
				<Text style={styles.title}>Статистика</Text>
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
				<StatRow
					label="Пройдено уровней"
					value={`${s.levelsCompleted} / ${CAMPAIGN_LEVEL_COUNT}`}
				/>
				<StatRow label="Всего переливаний" value={String(s.totalPours)} />
				<StatRow label="Без подсказок" value={String(s.levelsCompletedWithoutHint)} />
				<StatRow label="Без отмен" value={String(s.levelsCompletedWithoutUndo)} />
				<StatRow
					label="Без перезапуска"
					value={String(s.levelsCompletedWithoutRestart)}
				/>
				<StatRow label="Подсказок использовано" value={String(s.hintsUsed)} />
				<StatRow label="Отмен использовано" value={String(s.undosUsed)} />
				<StatRow label="Перезапусков" value={String(s.restartsUsed)} />

				<Text style={styles.section}>По сложности</Text>
				{(
					['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const
				).map((band) => (
					<StatRow
						key={band}
						label={getDifficultyLabelRu(band)}
						value={String(s.completedByDifficulty[band])}
					/>
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

function StatRow({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.row}>
			<Text style={styles.rowLabel}>{label}</Text>
			<Text style={styles.rowValue}>{value}</Text>
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
	},
	section: {
		marginTop: spacing.lg,
		marginBottom: spacing.xs,
		fontSize: 13,
		fontWeight: '700',
		color: uiColors.textSecondary,
		textTransform: 'uppercase',
	},
	row: {
		minHeight: 44,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: uiColors.border,
		paddingVertical: 8,
	},
	rowLabel: {
		flex: 1,
		fontSize: 15,
		color: uiColors.textPrimary,
		paddingRight: spacing.md,
	},
	rowValue: {
		fontSize: 15,
		fontWeight: '700',
		color: uiColors.textSecondary,
	},
	pressed: { opacity: 0.88 },
	bottomStack: { width: '100%' },
})
