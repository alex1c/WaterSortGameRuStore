import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	CAMPAIGN_LEVEL_COUNT,
	isLevelCompleted,
	isLevelUnlocked,
} from '../campaign'
import { spacing, uiColors } from '../theme'
import { BannerSlot } from '../components/BannerSlot'

/** Temporary PH8A page size — full virtualized selector is PH8B. */
const LEVEL_PAGE_SIZE = 100

interface LevelSelectScreenProps {
	currentLevel: number
	highestUnlockedLevel: number
	campaignComplete: boolean
	onSelectLevel: (levelNumber: number) => void
	onClose: () => void
}

/**
 * Minimal compatibility selector for the 1000-level campaign.
 * Renders one 100-level page at a time to avoid mounting 1000 cells.
 * Proper virtualization / range UX is deferred to PH8B.
 */
export function LevelSelectScreen({
	currentLevel,
	highestUnlockedLevel,
	campaignComplete,
	onSelectLevel,
	onClose,
}: LevelSelectScreenProps) {
	const insets = useSafeAreaInsets()
	const pageCount = Math.ceil(CAMPAIGN_LEVEL_COUNT / LEVEL_PAGE_SIZE)
	const initialPage = Math.min(
		pageCount - 1,
		Math.max(0, Math.floor((currentLevel - 1) / LEVEL_PAGE_SIZE)),
	)
	const [pageIndex, setPageIndex] = useState(initialPage)

	const { start, end, levels } = useMemo(() => {
		const pageStart = pageIndex * LEVEL_PAGE_SIZE + 1
		const pageEnd = Math.min(CAMPAIGN_LEVEL_COUNT, pageStart + LEVEL_PAGE_SIZE - 1)
		return {
			start: pageStart,
			end: pageEnd,
			levels: Array.from(
				{ length: pageEnd - pageStart + 1 },
				(_, i) => pageStart + i,
			),
		}
	}, [pageIndex])

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
				Открыто до {highestUnlockedLevel} · {start}–{end} / {CAMPAIGN_LEVEL_COUNT}
				{campaignComplete ? ' · Кампания пройдена' : ''}
			</Text>

			<View style={styles.pageRow}>
				<Pressable
					accessibilityRole="button"
					disabled={pageIndex <= 0}
					onPress={() => setPageIndex((value) => Math.max(0, value - 1))}
					style={({ pressed }) => [
						styles.pageButton,
						pageIndex <= 0 && styles.pageButtonDisabled,
						pressed && pageIndex > 0 && styles.pressed,
					]}
				>
					<Text style={styles.pageButtonLabel}>←</Text>
				</Pressable>
				<Text style={styles.pageLabel}>
					{pageIndex + 1} / {pageCount}
				</Text>
				<Pressable
					accessibilityRole="button"
					disabled={pageIndex >= pageCount - 1}
					onPress={() =>
						setPageIndex((value) => Math.min(pageCount - 1, value + 1))
					}
					style={({ pressed }) => [
						styles.pageButton,
						pageIndex >= pageCount - 1 && styles.pageButtonDisabled,
						pressed && pageIndex < pageCount - 1 && styles.pressed,
					]}
				>
					<Text style={styles.pageButtonLabel}>→</Text>
				</Pressable>
			</View>

			<View style={styles.legend}>
				<LegendDot color={uiColors.completed} label="Пройден" />
				<LegendDot color={uiColors.tubeSelected} label="Текущий" />
				<LegendDot color={uiColors.unlocked} label="Открыт" />
				<LegendDot color={uiColors.locked} label="Закрыт" />
			</View>

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
									completed && styles.cellLabelCompleted,
								]}
							>
								{level}
							</Text>
							{completed ? <Text style={styles.check}>✓</Text> : null}
						</Pressable>
					)
				})}
			</ScrollView>

			<View style={styles.bottomStack}>
				<BannerSlot placement="levels" testID="ad-banner-levels" />
				<View style={{ height: insets.bottom, backgroundColor: uiColors.surfaceMuted }} />
			</View>
		</View>
	)
}

function LegendDot({ color, label }: { color: string; label: string }) {
	return (
		<View style={styles.legendItem}>
			<View style={[styles.legendSwatch, { backgroundColor: color }]} />
			<Text style={styles.legendLabel}>{label}</Text>
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
		paddingBottom: spacing.xs,
		marginTop: 4,
		fontSize: 13,
		color: uiColors.textSecondary,
	},
	pageRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.md,
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.sm,
	},
	pageButton: {
		minHeight: 40,
		minWidth: 44,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pageButtonDisabled: {
		opacity: 0.4,
	},
	pageButtonLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	pageLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: uiColors.textSecondary,
		minWidth: 56,
		textAlign: 'center',
	},
	legend: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.md,
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.sm,
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	legendSwatch: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	legendLabel: {
		fontSize: 11,
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
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
	},
	cellUnlocked: {
		backgroundColor: uiColors.surface,
		borderColor: '#B7D4F5',
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
		shadowColor: uiColors.tubeSelected,
		shadowOpacity: 0.25,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 1 },
		elevation: 3,
	},
	cellLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	cellLabelLocked: {
		color: uiColors.locked,
	},
	cellLabelCompleted: {
		color: uiColors.completed,
	},
	check: {
		position: 'absolute',
		top: 4,
		right: 6,
		fontSize: 10,
		color: uiColors.completed,
		fontWeight: '800',
	},
	pressed: {
		opacity: 0.85,
	},
	bottomStack: {
		width: '100%',
	},
})
