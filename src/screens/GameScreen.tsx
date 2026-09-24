import { useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	LayoutChangeEvent,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BannerSlot } from '../components/BannerSlot'
import { GameControls } from '../components/GameControls'
import { GameHeader } from '../components/GameHeader'
import { TrainingHint } from '../components/TrainingHint'
import { TubeBoard } from '../components/TubeBoard'
import { WinModal } from '../components/WinModal'
import { useSharedCampaignGame } from '../hooks/CampaignGameContext'
import { uiColors } from '../theme'

interface GameScreenProps {
	onOpenLevels: () => void
	onOpenSettings: () => void
}

/**
 * Campaign gameplay screen with polished tubes and pour feedback.
 *
 * Vertical stack (top → bottom):
 *   header + training hint
 *   → flexible game board
 *   → bottom controls
 *   → AdBannerPlaceholder (50px)
 *   → real device bottom safe-area inset
 */
export function GameScreen({ onOpenLevels, onOpenSettings }: GameScreenProps) {
	const insets = useSafeAreaInsets()
	const game = useSharedCampaignGame()
	const [boardArea, setBoardArea] = useState({ width: 0, height: 0 })

	const handleBoardLayout = (event: LayoutChangeEvent) => {
		const { width, height } = event.nativeEvent.layout
		setBoardArea({ width, height })
	}

	const requestRestart = () => {
		if (!game.shouldConfirmRestart()) {
			game.handleRestart()
			return
		}
		Alert.alert('Начать заново?', 'Текущий прогресс уровня будет сброшен.', [
			{ text: 'Отмена', style: 'cancel' },
			{ text: 'Заново', style: 'destructive', onPress: () => game.handleRestart() },
		])
	}

	if (!game.ready) {
		return (
			<View style={[styles.root, styles.loading, { paddingTop: insets.top }]}>
				<ActivityIndicator color={uiColors.tubeSelected} />
				<Text style={styles.loadingText}>Загрузка уровня…</Text>
			</View>
		)
	}

	return (
		<View
			style={[
				styles.root,
				{
					paddingLeft: insets.left,
					paddingRight: insets.right,
					paddingTop: insets.top,
				},
			]}
			testID="game-screen"
		>
			<GameHeader
				levelNumber={game.levelNumber}
				difficultyLabel={game.difficultyLabel}
				moveCount={game.moveCount}
				onOpenLevels={onOpenLevels}
				onOpenSettings={onOpenSettings}
			/>
			<TrainingHint step={game.trainingStep} />

			<View style={styles.boardRegion}>
				{game.hintMessage ? (
					<View style={styles.hintBanner} pointerEvents="none">
						<Text style={styles.hintBannerText}>{game.hintMessage}</Text>
					</View>
				) : null}
				<View style={styles.boardContent} onLayout={handleBoardLayout}>
					{boardArea.width > 0 && boardArea.height > 0 ? (
						<TubeBoard
							board={game.currentBoard}
							selectedIndex={game.selectedTube}
							invalidFlashIndex={game.invalidFlashIndex}
							hintMove={game.hintMove}
							pourAnimation={game.pourAnimation}
							colorMode={game.settings.colorMode}
							onTubePress={game.handleTubePress}
							availableWidth={boardArea.width}
							availableHeight={boardArea.height}
						/>
					) : null}
				</View>
			</View>

			{game.toastMessage ? (
				<View style={styles.toast} pointerEvents="none">
					<Text style={styles.toastText}>{game.toastMessage}</Text>
				</View>
			) : null}

			<View style={styles.bottomStack} testID="bottom-stack">
				<GameControls
					onUndo={game.handleUndo}
					onHint={game.handleHint}
					onRestart={requestRestart}
					canUndo={game.canUndo}
				/>
				<BannerSlot placement="game" testID="ad-banner-game" />
				<View
					style={{ height: insets.bottom, backgroundColor: uiColors.surfaceMuted }}
					testID="bottom-safe-area-spacer"
				/>
			</View>

			<WinModal
				visible={game.isLevelSolved && !game.showCampaignFinished}
				levelNumber={game.levelNumber}
				moveCount={game.moveCount}
				difficultyLabel={game.difficultyLabel}
				isFinalCampaignLevel={game.levelNumber >= 100}
				onNext={game.handleNextLevel}
				onReplay={game.handleReplayLevel}
			/>

			{game.showCampaignFinished ? (
				<View style={styles.campaignDone} testID="campaign-finished">
					<Text style={styles.campaignDoneTitle}>Первые 100 уровней пройдены</Text>
					<Text style={styles.campaignDoneBody}>
						Можно переигрывать уровни из меню «Уровни».
					</Text>
				</View>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: uiColors.background,
	},
	loading: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
	},
	loadingText: {
		color: uiColors.textSecondary,
		fontSize: 14,
	},
	boardRegion: {
		flex: 1,
		minHeight: 0,
	},
	boardContent: {
		flex: 1,
		minHeight: 0,
	},
	bottomStack: {
		width: '100%',
	},
	hintBanner: {
		alignSelf: 'center',
		marginBottom: 8,
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 8,
		backgroundColor: 'rgba(232, 163, 23, 0.94)',
	},
	hintBannerText: {
		color: '#1A2B33',
		fontSize: 13,
		fontWeight: '600',
	},
	toast: {
		position: 'absolute',
		alignSelf: 'center',
		top: '42%',
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: 'rgba(26, 43, 51, 0.88)',
	},
	toastText: {
		color: '#FFFFFF',
		fontSize: 13,
	},
	campaignDone: {
		...StyleSheet.absoluteFill,
		backgroundColor: uiColors.overlay,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	campaignDoneTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#FFFFFF',
		textAlign: 'center',
		marginBottom: 8,
	},
	campaignDoneBody: {
		fontSize: 14,
		color: '#E8F4F8',
		textAlign: 'center',
	},
})
