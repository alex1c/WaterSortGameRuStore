import { useMemo } from 'react'
import { LayoutChangeEvent, StyleSheet, View } from 'react-native'

import type { PourAnimation } from '../hooks/useCampaignGame'
import type { Board, Move } from '../game/types'
import type { PaletteMode } from '../theme'
import { spacing } from '../theme'
import { TubeView, type TubeHighlight } from './Tube'

interface TubeBoardProps {
	board: Board
	selectedIndex: number | null
	invalidFlashIndex: number | null
	hintMove: Move | null
	pourAnimation: PourAnimation | null
	colorMode: PaletteMode
	onTubePress: (index: number) => void
	availableWidth: number
	availableHeight: number
}

/**
 * Responsive multi-row tube layout sized from measured available space.
 */
export function TubeBoard({
	board,
	selectedIndex,
	invalidFlashIndex,
	hintMove,
	pourAnimation,
	colorMode,
	onTubePress,
	availableWidth,
	availableHeight,
}: TubeBoardProps) {
	const layout = useMemo(
		() => computeTubeLayout(board.length, availableWidth, availableHeight),
		[board.length, availableWidth, availableHeight],
	)

	const pourMeta = useMemo(() => {
		if (!pourAnimation) return null
		return {
			direction: (pourAnimation.to > pourAnimation.from ? 1 : -1) as 1 | -1,
			durationMs: pourAnimation.durationMs,
		}
	}, [pourAnimation])

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
								highlight={resolveHighlight(
									tubeIndex,
									selectedIndex,
									invalidFlashIndex,
									hintMove,
									pourAnimation,
								)}
								colorMode={colorMode}
								pourDirection={
									pourAnimation?.from === tubeIndex && pourMeta
										? pourMeta.direction
										: 0
								}
								pourDurationMs={
									pourAnimation?.from === tubeIndex && pourMeta
										? pourMeta.durationMs
										: 0
								}
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

function resolveHighlight(
	tubeIndex: number,
	selectedIndex: number | null,
	invalidFlashIndex: number | null,
	hintMove: Move | null,
	pourAnimation: PourAnimation | null,
): TubeHighlight {
	if (invalidFlashIndex === tubeIndex) return 'invalid'
	if (pourAnimation?.from === tubeIndex) return 'pour-source'
	if (pourAnimation?.to === tubeIndex) return 'pour-destination'
	if (selectedIndex === tubeIndex) return 'selected'
	if (hintMove?.from === tubeIndex) return 'hint-source'
	if (hintMove?.to === tubeIndex) return 'hint-destination'
	return 'none'
}

interface TubeLayout {
	rows: number[][]
	tubeWidth: number
	tubeHeight: number
	gap: number
	rowGap: number
}

export function computeTubeLayout(
	tubeCount: number,
	availableWidth: number,
	availableHeight: number,
): TubeLayout {
	const safeWidth = Math.max(availableWidth, 1)
	const safeHeight = Math.max(availableHeight, 1)
	const gap = spacing.sm
	const rowGap = spacing.md
	const horizontalPadding = spacing.md * 2
	const usableWidth = Math.max(safeWidth - horizontalPadding, 1)

	const MIN_TUBE_WIDTH = 44
	const MAX_TUBE_WIDTH = 72
	const MIN_TUBE_HEIGHT = 96
	const MAX_TUBE_HEIGHT = 200

	const maxColumns = Math.min(tubeCount, 7)
	let columns = Math.min(Math.max(Math.ceil(Math.sqrt(tubeCount)), 3), maxColumns)

	for (let candidate = maxColumns; candidate >= 3; candidate -= 1) {
		const width = Math.floor((usableWidth - gap * (candidate - 1)) / candidate)
		if (width >= MIN_TUBE_WIDTH) {
			columns = Math.min(candidate, tubeCount)
			break
		}
	}
	columns = Math.min(columns, tubeCount)

	const rowCount = Math.ceil(tubeCount / columns)
	const tubeWidth = Math.max(
		MIN_TUBE_WIDTH,
		Math.min(
			MAX_TUBE_WIDTH,
			Math.floor((usableWidth - gap * (columns - 1)) / columns),
		),
	)

	const usableHeight = Math.max(safeHeight - rowGap * (rowCount - 1) - spacing.sm, 1)
	const tubeHeight = Math.max(
		MIN_TUBE_HEIGHT,
		Math.min(MAX_TUBE_HEIGHT, Math.floor(usableHeight / rowCount) - spacing.xs),
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
		paddingHorizontal: spacing.md,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'center',
	},
})
