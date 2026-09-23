import { useState } from 'react'
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useSampleGame } from '../hooks/useSampleGame'
import { uiColors } from '../theme'
import { AdBannerPlaceholder } from '../components/AdBannerPlaceholder'
import { GameControls } from '../components/GameControls'
import { GameHeader } from '../components/GameHeader'
import { TrainingHint } from '../components/TrainingHint'
import { TubeBoard } from '../components/TubeBoard'

/**
 * Phase 1 playable UI shell.
 *
 * Vertical stack (top → bottom), no absolute physical-bottom pinning:
 *   header + training hint
 *   → flexible game board (uses remaining height)
 *   → bottom controls
 *   → AdBannerPlaceholder
 *   → real device bottom safe-area inset
 */
export function GameScreen() {
	const insets = useSafeAreaInsets()
	const {
		board,
		selectedIndex,
		invalidFlashIndex,
		hasCompletedMove,
		hintMessage,
		handleTubePress,
		handleUndo,
		handleRestart,
		handleHintPress,
	} = useSampleGame()

	const [boardArea, setBoardArea] = useState({ width: 0, height: 0 })

	const handleBoardLayout = (event: LayoutChangeEvent) => {
		const { width, height } = event.nativeEvent.layout
		setBoardArea({ width, height })
	}

	return (
		<View
			style={[
				styles.root,
				{
					// Horizontal insets protect gesture / curved edges.
					paddingLeft: insets.left,
					paddingRight: insets.right,
					// Top inset keeps the header below status bar / cutout.
					paddingTop: insets.top,
				},
			]}
			testID="game-screen"
		>
			<GameHeader />
			<TrainingHint visible={!hasCompletedMove} />

			{/* Flexible middle: tubes size themselves from this measured area. */}
			<View style={styles.boardRegion} onLayout={handleBoardLayout}>
				{boardArea.width > 0 && boardArea.height > 0 ? (
					<TubeBoard
						board={board}
						selectedIndex={selectedIndex}
						invalidFlashIndex={invalidFlashIndex}
						onTubePress={handleTubePress}
						availableWidth={boardArea.width}
						availableHeight={boardArea.height}
					/>
				) : null}
			</View>

			{/* Temporary toast for hint / empty-undo feedback. */}
			{hintMessage ? (
				<View style={styles.toast} pointerEvents="none">
					<Text style={styles.toastText}>{hintMessage}</Text>
				</View>
			) : null}

			{/*
			  Bottom stack stays in document flow:
			  controls → banner → real Android bottom inset.
			  Do NOT position these with absolute bottom offsets.
			*/}
			<View style={styles.bottomStack} testID="bottom-stack">
				<GameControls
					onUndo={handleUndo}
					onHint={handleHintPress}
					onRestart={handleRestart}
				/>
				<AdBannerPlaceholder />
				{/* Real navigation / gesture inset — below the fake banner. */}
				<View
					style={{ height: insets.bottom, backgroundColor: uiColors.surfaceMuted }}
					testID="bottom-safe-area-spacer"
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
	boardRegion: {
		flex: 1,
		minHeight: 0,
	},
	bottomStack: {
		width: '100%',
		// Explicitly not position:'absolute' — critical for Android QA.
	},
	toast: {
		position: 'absolute',
		alignSelf: 'center',
		bottom: 140,
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: 'rgba(26, 43, 51, 0.88)',
	},
	toastText: {
		color: '#FFFFFF',
		fontSize: 13,
	},
})
