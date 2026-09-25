import { useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	LayoutChangeEvent,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BannerSlot } from '../components/BannerSlot'
import { AchievementToast } from '../components/AchievementToast'
import { GameControls } from '../components/GameControls'
import { HelpSheet } from '../components/HelpSheet'
import { TubeBoard } from '../components/TubeBoard'
import { useSharedCampaignGame } from '../hooks/CampaignGameContext'
import { spacing, uiColors } from '../theme'

interface FreePlayGameScreenProps {
	onOpenHome: () => void
	onOpenSettings: () => void
	onChooseDifficulty: () => void
}

/**
 * Free Play game screen — reuses Campaign visuals without a level number.
 */
export function FreePlayGameScreen({
	onOpenHome,
	onOpenSettings,
	onChooseDifficulty,
}: FreePlayGameScreenProps) {
	const insets = useSafeAreaInsets()
	const game = useSharedCampaignGame()
	const freePlay = game.freePlay
	const [boardArea, setBoardArea] = useState({ width: 0, height: 0 })

	const handleBoardLayout = (event: LayoutChangeEvent) => {
		const { width, height } = event.nativeEvent.layout
		setBoardArea({ width, height })
	}

	const requestRestart = () => {
		if (!freePlay.shouldConfirmRestart()) {
			freePlay.handleRestart()
			return
		}
		Alert.alert('Начать заново?', 'Текущий прогресс головоломки будет сброшен.', [
			{ text: 'Отмена', style: 'cancel' },
			{
				text: 'Заново',
				style: 'destructive',
				onPress: () => freePlay.handleRestart(),
			},
		])
	}

	if (freePlay.status === 'generating') {
		return (
			<View style={[styles.root, styles.loading, { paddingTop: insets.top }]}>
				<ActivityIndicator color={uiColors.tubeSelected} />
				<Text style={styles.loadingText}>Создаём головоломку…</Text>
			</View>
		)
	}

	if (freePlay.status === 'failed') {
		return (
			<View style={[styles.root, styles.loading, { paddingTop: insets.top }]}>
				<Text style={styles.failTitle}>
					Не удалось создать головоломку. Попробуйте ещё раз.
				</Text>
				<Pressable
					accessibilityRole="button"
					onPress={() => {
						if (freePlay.difficulty) {
							freePlay.startNewPuzzle(freePlay.difficulty)
						} else {
							onChooseDifficulty()
						}
					}}
					style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
				>
					<Text style={styles.retryLabel}>Повторить</Text>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					onPress={onOpenHome}
					style={({ pressed }) => [styles.homeLink, pressed && styles.pressed]}
				>
					<Text style={styles.homeLinkLabel}>На главную</Text>
				</Pressable>
			</View>
		)
	}

	if (freePlay.status !== 'ready' || freePlay.currentBoard.length === 0) {
		return (
			<View style={[styles.root, styles.loading, { paddingTop: insets.top }]}>
				<ActivityIndicator color={uiColors.tubeSelected} />
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
			testID="free-play-game-screen"
		>
			<View style={styles.header}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="На главную"
					onPress={onOpenHome}
					style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}
				>
					<Text style={styles.homeButtonLabel}>←</Text>
				</Pressable>
				<View style={styles.headerText}>
					<Text style={styles.headerTitle}>Свободная игра</Text>
					<Text style={styles.headerMeta}>
						{freePlay.difficultyLabel} · {freePlay.moveCount}{' '}
						{pluralMoves(freePlay.moveCount)}
					</Text>
				</View>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Настройки"
					onPress={onOpenSettings}
					style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
				>
					<Text style={styles.menuLabel}>☰</Text>
				</Pressable>
			</View>

			<View style={styles.boardRegion}>
				{freePlay.hintMessage ? (
					<View style={styles.hintBanner} pointerEvents="none">
						<Text style={styles.hintBannerText}>{freePlay.hintMessage}</Text>
					</View>
				) : null}
				<View style={styles.boardContent} onLayout={handleBoardLayout}>
					{boardArea.width > 0 && boardArea.height > 0 ? (
						<TubeBoard
							board={freePlay.currentBoard}
							selectedIndex={freePlay.selectedTube}
							invalidFlashIndex={freePlay.invalidFlashIndex}
							hintMove={freePlay.hintMove}
							pourAnimation={freePlay.pourAnimation}
							colorMode={game.settings.colorMode}
							onTubePress={freePlay.handleTubePress}
							availableWidth={boardArea.width}
							availableHeight={boardArea.height}
						/>
					) : null}
				</View>
			</View>

			{freePlay.toastMessage ? (
				<View style={styles.toast} pointerEvents="none">
					<Text style={styles.toastText}>{freePlay.toastMessage}</Text>
				</View>
			) : null}

			<View style={styles.bottomStack}>
				<GameControls
					onUndo={freePlay.handleUndo}
					onHint={freePlay.handleHint}
					onRestart={requestRestart}
					onHelp={freePlay.openHelpSheet}
					canUndo={freePlay.canUndo}
					showHelpEntry
				/>
				<BannerSlot placement="game" testID="ad-banner-game" />
				<View
					style={{ height: insets.bottom, backgroundColor: uiColors.surfaceMuted }}
				/>
			</View>

			<HelpSheet
				visible={freePlay.helpSheetVisible}
				dialog={freePlay.helpDialog}
				help={freePlay.help}
				isSolved={freePlay.isSolved}
				hintSearching={freePlay.hintSearching}
				rewardLoading={freePlay.rewardLoading}
				onClose={freePlay.closeHelpSheet}
				onRequestHint={freePlay.handleHint}
				onRequestExtraTube={freePlay.requestExtraTubeOffer}
				onConfirmHintPack={freePlay.confirmHintPack}
				onConfirmExtraTube={freePlay.confirmExtraTube}
				onCancelDialog={freePlay.cancelHelpDialog}
			/>

			<Modal visible={freePlay.isSolved} transparent animationType="fade">
				<View style={styles.winBackdrop} testID="free-play-win-modal">
					<View style={styles.winCard}>
						<Text style={styles.winTitle}>Головоломка решена!</Text>
						<Text style={styles.winMeta}>Ходов: {freePlay.moveCount}</Text>
						<Text style={styles.winMeta}>
							Сложность: {freePlay.difficultyLabel}
						</Text>
						<Pressable
							accessibilityRole="button"
							onPress={() => freePlay.startAnotherSameDifficulty()}
							style={({ pressed }) => [styles.winPrimary, pressed && styles.pressed]}
						>
							<Text style={styles.winPrimaryLabel}>Новая головоломка</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							onPress={onChooseDifficulty}
							style={({ pressed }) => [
								styles.winSecondary,
								pressed && styles.pressed,
							]}
						>
							<Text style={styles.winSecondaryLabel}>Выбрать сложность</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							onPress={onOpenHome}
							style={({ pressed }) => [
								styles.winSecondary,
								pressed && styles.pressed,
							]}
						>
							<Text style={styles.winSecondaryLabel}>На главную</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							onPress={() => freePlay.handleRestart()}
							style={({ pressed }) => [styles.winGhost, pressed && styles.pressed]}
						>
							<Text style={styles.winGhostLabel}>Повторить</Text>
						</Pressable>
					</View>
				</View>
			</Modal>

			<AchievementToast
				achievementId={freePlay.pendingAchievementToast}
				onDone={freePlay.acknowledgeAchievementToast}
			/>
		</View>
	)
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
	loading: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: spacing.lg,
	},
	loadingText: { color: uiColors.textSecondary, fontSize: 14 },
	failTitle: {
		color: uiColors.textPrimary,
		fontSize: 16,
		fontWeight: '600',
		textAlign: 'center',
		marginBottom: spacing.md,
	},
	retryButton: {
		minHeight: 48,
		minWidth: 160,
		borderRadius: 12,
		backgroundColor: uiColors.tubeSelected,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.lg,
	},
	retryLabel: { color: '#FFF', fontWeight: '700', fontSize: 15 },
	homeLink: { marginTop: spacing.md, padding: spacing.sm },
	homeLinkLabel: { color: uiColors.textSecondary, fontWeight: '600' },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: spacing.md,
		paddingTop: spacing.sm,
		paddingBottom: spacing.xs,
		gap: spacing.sm,
	},
	homeButton: {
		minHeight: 40,
		minWidth: 40,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	homeButtonLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	headerText: { flex: 1 },
	headerTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	headerMeta: {
		marginTop: 2,
		fontSize: 12,
		color: uiColors.textSecondary,
	},
	menuButton: {
		minHeight: 40,
		minWidth: 40,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	menuLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	boardRegion: { flex: 1, minHeight: 0 },
	boardContent: { flex: 1, minHeight: 0 },
	bottomStack: { width: '100%' },
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
	toastText: { color: '#FFFFFF', fontSize: 13 },
	winBackdrop: {
		flex: 1,
		backgroundColor: uiColors.overlay,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.xl,
	},
	winCard: {
		width: '100%',
		maxWidth: 360,
		borderRadius: 18,
		backgroundColor: uiColors.surface,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.xl,
		gap: spacing.sm,
	},
	winTitle: {
		fontSize: 22,
		fontWeight: '700',
		color: uiColors.textPrimary,
		textAlign: 'center',
	},
	winMeta: {
		fontSize: 15,
		color: uiColors.textSecondary,
		textAlign: 'center',
	},
	winPrimary: {
		marginTop: spacing.md,
		minHeight: 48,
		borderRadius: 12,
		backgroundColor: uiColors.tubeSelected,
		alignItems: 'center',
		justifyContent: 'center',
	},
	winPrimaryLabel: { color: '#FFF', fontSize: 16, fontWeight: '700' },
	winSecondary: {
		minHeight: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		alignItems: 'center',
		justifyContent: 'center',
	},
	winSecondaryLabel: {
		color: uiColors.textPrimary,
		fontSize: 15,
		fontWeight: '600',
	},
	winGhost: {
		minHeight: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	winGhostLabel: {
		color: uiColors.textSecondary,
		fontSize: 14,
		fontWeight: '600',
	},
	pressed: { opacity: 0.88 },
})
