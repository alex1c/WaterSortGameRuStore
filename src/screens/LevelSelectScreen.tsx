import { useEffect, useMemo, useRef, useState } from 'react'
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	type LayoutChangeEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	getLevelSelectPageBounds,
	getLevelSelectPageCount,
	getLevelSelectPageIndex,
	isLevelCompleted,
	isLevelUnlocked,
	listLevelSelectPageLevels,
	listLevelSelectRanges,
	resolveLevelSelectFocusLevel,
} from '../campaign'
import { spacing, uiColors } from '../theme'
import { BannerSlot } from '../components/BannerSlot'

interface LevelSelectScreenProps {
	currentLevel: number
	highestUnlockedLevel: number
	campaignComplete: boolean
	onSelectLevel: (levelNumber: number) => void
	onClose: () => void
	onOpenFreePlay?: () => void
}

/**
 * Scalable 1000-level selector: one 100-level page at a time, range chips,
 * and auto-open on the page containing the active current level.
 *
 * Focus policy: prefer `currentLevel` (active session); fall back to
 * `highestUnlockedLevel` only when current is invalid.
 *
 * Does NOT call createCampaignLevel — grid uses progression metadata only.
 */
export function LevelSelectScreen({
	currentLevel,
	highestUnlockedLevel,
	campaignComplete,
	onSelectLevel,
	onClose,
	onOpenFreePlay,
}: LevelSelectScreenProps) {
	const insets = useSafeAreaInsets()
	const pageCount = getLevelSelectPageCount()
	const ranges = useMemo(() => listLevelSelectRanges(), [])
	const focusLevel = resolveLevelSelectFocusLevel(
		currentLevel,
		highestUnlockedLevel,
	)
	const [pageIndex, setPageIndex] = useState(() =>
		getLevelSelectPageIndex(focusLevel),
	)

	const gridScrollRef = useRef<ScrollView>(null)
	const rangeScrollRef = useRef<ScrollView>(null)
	const currentCellYRef = useRef<number | null>(null)
	const didScrollToCurrentRef = useRef(false)

	const { start, end } = getLevelSelectPageBounds(pageIndex)
	const levels = useMemo(
		() => listLevelSelectPageLevels(pageIndex),
		[pageIndex],
	)

	useEffect(() => {
		didScrollToCurrentRef.current = false
		currentCellYRef.current = null
	}, [pageIndex])

	useEffect(() => {
		// Keep the active range chip roughly centered when page changes.
		const chipWidth = 88
		const offset = Math.max(0, pageIndex * chipWidth - chipWidth)
		rangeScrollRef.current?.scrollTo({ x: offset, animated: true })
	}, [pageIndex])

	const handleCurrentCellLayout = (event: LayoutChangeEvent) => {
		currentCellYRef.current = event.nativeEvent.layout.y
		if (didScrollToCurrentRef.current) return
		if (focusLevel < start || focusLevel > end) return
		didScrollToCurrentRef.current = true
		const y = Math.max(0, event.nativeEvent.layout.y - 24)
		requestAnimationFrame(() => {
			gridScrollRef.current?.scrollTo({ y, animated: false })
		})
	}

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
					accessibilityLabel="Назад на главную"
					onPress={onClose}
					style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
					testID="level-select-back"
				>
					<Text style={styles.closeLabel}>Назад</Text>
				</Pressable>
			</View>

			<Text style={styles.subtitle} testID="level-select-subtitle">
				Открыто до {highestUnlockedLevel}
				{campaignComplete ? ' · Кампания пройдена' : ''}
			</Text>

			<ScrollView
				ref={rangeScrollRef}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.rangeRow}
				testID="level-select-ranges"
			>
				{ranges.map((range) => {
					const selected = range.pageIndex === pageIndex
					const rangeUnlocked = highestUnlockedLevel >= range.start
					return (
						<Pressable
							key={range.pageIndex}
							accessibilityRole="button"
							accessibilityState={{ selected }}
							accessibilityLabel={`Диапазон ${range.label}${selected ? ', выбран' : ''}${rangeUnlocked ? '' : ', ещё не открыт'}`}
							onPress={() => setPageIndex(range.pageIndex)}
							style={({ pressed }) => [
								styles.rangeChip,
								selected && styles.rangeChipSelected,
								!rangeUnlocked && styles.rangeChipLocked,
								pressed && styles.pressed,
							]}
							testID={`level-range-${range.start}-${range.end}`}
						>
							<Text
								style={[
									styles.rangeChipLabel,
									selected && styles.rangeChipLabelSelected,
								]}
							>
								{range.label}
							</Text>
						</Pressable>
					)
				})}
			</ScrollView>

			<View style={styles.pageRow}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Предыдущий диапазон"
					disabled={pageIndex <= 0}
					onPress={() => setPageIndex((value) => Math.max(0, value - 1))}
					style={({ pressed }) => [
						styles.pageButton,
						pageIndex <= 0 && styles.pageButtonDisabled,
						pressed && pageIndex > 0 && styles.pressed,
					]}
					testID="level-page-prev"
				>
					<Text style={styles.pageButtonLabel}>←</Text>
				</Pressable>
				<View style={styles.pageCenter} testID="level-page-label">
					<Text style={styles.pageRange}>
						{start}–{end}
					</Text>
					<Text style={styles.pageMeta}>
						{pageIndex + 1} / {pageCount}
					</Text>
				</View>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Следующий диапазон"
					disabled={pageIndex >= pageCount - 1}
					onPress={() =>
						setPageIndex((value) => Math.min(pageCount - 1, value + 1))
					}
					style={({ pressed }) => [
						styles.pageButton,
						pageIndex >= pageCount - 1 && styles.pageButtonDisabled,
						pressed && pageIndex < pageCount - 1 && styles.pressed,
					]}
					testID="level-page-next"
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
				ref={gridScrollRef}
				style={styles.scroll}
				contentContainerStyle={styles.grid}
				showsVerticalScrollIndicator={false}
				testID="level-select-grid"
			>
				{levels.map((level) => {
					const unlocked = isLevelUnlocked(level, highestUnlockedLevel)
					const completed = isLevelCompleted(
						level,
						highestUnlockedLevel,
						campaignComplete,
					)
					const isCurrent = level === currentLevel
					const stateLabel = completed
						? 'пройден'
						: isCurrent
							? 'текущий'
							: unlocked
								? 'открыт'
								: 'закрыт'
					return (
						<Pressable
							key={level}
							disabled={!unlocked}
							accessibilityRole="button"
							accessibilityState={{ disabled: !unlocked, selected: isCurrent }}
							accessibilityLabel={`Уровень ${level}, ${stateLabel}`}
							onPress={() => {
								if (!unlocked) return
								onSelectLevel(level)
							}}
							onLayout={isCurrent ? handleCurrentCellLayout : undefined}
							style={({ pressed }) => [
								styles.cell,
								completed && styles.cellCompleted,
								unlocked && !completed && styles.cellUnlocked,
								!unlocked && styles.cellLocked,
								isCurrent && styles.cellCurrent,
								pressed && unlocked && styles.pressed,
							]}
							testID={`level-cell-${level}`}
						>
							<Text
								style={[
									styles.cellLabel,
									!unlocked && styles.cellLabelLocked,
									completed && styles.cellLabelCompleted,
									isCurrent && styles.cellLabelCurrent,
								]}
							>
								{level}
							</Text>
							{completed ? <Text style={styles.check}>✓</Text> : null}
						</Pressable>
					)
				})}
			</ScrollView>

			{onOpenFreePlay ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Свободная игра"
					onPress={onOpenFreePlay}
					style={({ pressed }) => [
						styles.freePlayLink,
						pressed && styles.pressed,
					]}
					testID="levels-free-play-link"
				>
					<Text style={styles.freePlayLinkText}>
						Хотите другую сложность? Свободная игра →
					</Text>
				</Pressable>
			) : null}

			<View style={styles.bottomStack}>
				<BannerSlot placement="levels" testID="ad-banner-levels" />
				<View
					style={{ height: insets.bottom, backgroundColor: uiColors.surfaceMuted }}
				/>
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
	rangeRow: {
		paddingHorizontal: spacing.md,
		paddingBottom: spacing.sm,
		gap: spacing.sm,
		alignItems: 'center',
	},
	rangeChip: {
		minHeight: 36,
		paddingHorizontal: spacing.md,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	rangeChipSelected: {
		borderColor: uiColors.tubeSelected,
		backgroundColor: '#E8F2FF',
	},
	rangeChipLocked: {
		opacity: 0.72,
	},
	rangeChipLabel: {
		fontSize: 12,
		fontWeight: '700',
		color: uiColors.textSecondary,
	},
	rangeChipLabelSelected: {
		color: uiColors.tubeSelected,
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
	pageCenter: {
		minWidth: 110,
		alignItems: 'center',
	},
	pageRange: {
		fontSize: 16,
		fontWeight: '800',
		color: uiColors.textPrimary,
	},
	pageMeta: {
		marginTop: 2,
		fontSize: 11,
		fontWeight: '600',
		color: uiColors.textSecondary,
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
	cellLabelCurrent: {
		color: uiColors.tubeSelected,
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
	freePlayLink: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		alignItems: 'center',
	},
	freePlayLinkText: {
		fontSize: 13,
		fontWeight: '600',
		color: uiColors.tubeSelected,
		textAlign: 'center',
	},
	bottomStack: {
		width: '100%',
	},
})
