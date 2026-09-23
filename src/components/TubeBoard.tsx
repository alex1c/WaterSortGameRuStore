import { useMemo } from 'react'
import { LayoutChangeEvent, StyleSheet, View } from 'react-native'

import type { Board } from '../game/types'
import { spacing } from '../theme'
import { TubeView } from './Tube'

interface TubeBoardProps {
	board: Board
	selectedIndex: number | null
	invalidFlashIndex: number | null
	onTubePress: (index: number) => void
	/** Remaining vertical space after header / controls / banner / insets. */
	availableWidth: number
	availableHeight: number
}

/**
 * Responsive multi-row tube layout.
 * Sizes tubes from available width/height instead of hard-coded device coords,
 * leaving room for future levels with more tubes.
 */
export function TubeBoard({
	board,
	selectedIndex,
	invalidFlashIndex,
	onTubePress,
	availableWidth,
	availableHeight,
}: TubeBoardProps) {
	const layout = useMemo(
		() => computeTubeLayout(board.length, availableWidth, availableHeight),
		[board.length, availableWidth, availableHeight],
	)

	return (
		<View style={styles.container} testID="tube-board">
			{layout.rows.map((row, rowIndex) => (
				<View
					key={`row-${rowIndex}`}
					style={[styles.row, { gap: layout.gap, marginBottom: layout.rowGap }]}
				>
					{row.map((tubeIndex) => {
						const layers = board[tubeIndex] ?? []
						return (
							<TubeView
								key={`tube-${tubeIndex}`}
								layers={layers}
								width={layout.tubeWidth}
								height={layout.tubeHeight}
								selected={selectedIndex === tubeIndex}
								invalidFlash={invalidFlashIndex === tubeIndex}
								onPress={() => onTubePress(tubeIndex)}
								accessibilityLabel={`Пробирка ${tubeIndex + 1}, слоёв ${layers.length}`}
							/>
						)
					})}
				</View>
			))}
		</View>
	)
}

interface TubeLayout {
	rows: number[][]
	tubeWidth: number
	tubeHeight: number
	gap: number
	rowGap: number
}

/**
 * Pick a column count that fits width, then size tubes to remaining height.
 * Prefers 5 columns on wide phones so 10-tube boards become two neat rows.
 */
function computeTubeLayout(
	tubeCount: number,
	availableWidth: number,
	availableHeight: number,
): TubeLayout {
	const safeWidth = Math.max(availableWidth, 1)
	const safeHeight = Math.max(availableHeight, 1)
	const gap = spacing.sm
	const rowGap = spacing.md
	const horizontalPadding = spacing.lg * 2

	const preferredColumns = Math.min(5, Math.max(4, Math.ceil(tubeCount / 2)))
	const columns = Math.min(preferredColumns, tubeCount)
	const rowCount = Math.ceil(tubeCount / columns)

	const usableWidth = Math.max(safeWidth - horizontalPadding, 1)
	const tubeWidth = Math.min(
		72,
		Math.floor((usableWidth - gap * (columns - 1)) / columns),
	)

	const usableHeight = Math.max(safeHeight - rowGap * (rowCount - 1) - spacing.md, 1)
	const tubeHeight = Math.min(
		200,
		Math.max(110, Math.floor(usableHeight / rowCount) - spacing.sm),
	)

	const rows: number[][] = []
	for (let i = 0; i < tubeCount; i += columns) {
		const row: number[] = []
		for (let c = 0; c < columns && i + c < tubeCount; c += 1) {
			row.push(i + c)
		}
		rows.push(row)
	}

	return { rows, tubeWidth, tubeHeight, gap, rowGap }
}

/**
 * Optional helper for parents that measure via onLayout.
 * Exported for tests / future adaptive wrappers.
 */
export function measureBoardArea(event: LayoutChangeEvent): {
	width: number
	height: number
} {
	const { width, height } = event.nativeEvent.layout
	return { width, height }
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.lg,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'center',
	},
})
