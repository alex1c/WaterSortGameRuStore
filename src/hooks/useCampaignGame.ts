import { useCallback, useEffect, useRef, useState } from 'react'

import {
	createCampaignLevel,
	getDifficultyLabelRu,
	nextUnlockAfterClearing,
	type CampaignDifficultyBand,
} from '../campaign'
import {
	hapticInvalid,
	hapticPour,
	hapticSelection,
	hapticSuccess,
	playPourSound,
	playWinSound,
	setSoundsEnabled,
} from '../feedback'
import {
	applyMove,
	canPour,
	cloneBoard,
	getHint,
	isSolved,
	type Board,
	type Move,
} from '../game'
import {
	DEFAULT_GAME_SETTINGS,
	getPourAnimationMs,
	type AnimationSpeed,
	type GameSettings,
} from '../settings'
import {
	STORAGE_SCHEMA_VERSION,
	createDefaultPersistedState,
	loadPersistedGameState,
	savePersistedGameState,
} from '../storage'
import { isPersistedSessionCompatible } from '../storage/sessionCompatibility'
import type { PaletteMode } from '../theme'
import { maybeShowInterstitialAfterLevelCompleted } from '../ads'
import { trackEvent } from '../analytics'

export type TrainingStep = 'pick-source' | 'pick-destination' | 'encourage' | 'done'

/** Cosmetic pour signal — never mutates Water Sort rules by itself. */
export interface PourAnimation {
	from: number
	to: number
	/** 0..1 progress for tube tilt / highlight. */
	startedAt: number
	durationMs: number
}

export interface CampaignGameController {
	ready: boolean
	levelNumber: number
	difficultyBand: CampaignDifficultyBand
	difficultyLabel: string
	initialBoard: Board
	currentBoard: Board
	moveCount: number
	moveHistoryLength: number
	selectedTube: number | null
	hintMove: Move | null
	hintMessage: string | null
	invalidFlashIndex: number | null
	pourAnimation: PourAnimation | null
	isLevelSolved: boolean
	showCampaignFinished: boolean
	campaignComplete: boolean
	tutorialCompleted: boolean
	trainingStep: TrainingStep
	highestUnlockedLevel: number
	canUndo: boolean
	toastMessage: string | null
	settings: GameSettings
	updateSettings: (patch: Partial<GameSettings>) => void
	replayTutorial: () => void
	handleTubePress: (index: number) => void
	handleUndo: () => void
	handleRestart: () => void
	shouldConfirmRestart: () => boolean
	handleHint: () => void
	handleNextLevel: () => void
	handleReplayLevel: () => void
	openLevel: (levelNumber: number) => void
	dismissCampaignFinished: () => void
}

/**
 * Campaign gameplay controller: production engine + persistence + UX chrome.
 * Pure Water Sort rules live only in src/game — this hook never reimplements them.
 */
export function useCampaignGame(): CampaignGameController {
	const [ready, setReady] = useState(false)
	const [highestUnlockedLevel, setHighestUnlockedLevel] = useState(1)
	const [campaignComplete, setCampaignComplete] = useState(false)
	const [tutorialCompleted, setTutorialCompleted] = useState(false)
	const [showCampaignFinished, setShowCampaignFinished] = useState(false)
	const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_GAME_SETTINGS })

	const [levelNumber, setLevelNumber] = useState(1)
	const [difficultyBand, setDifficultyBand] = useState<CampaignDifficultyBand>('BEGINNER')
	const [seed, setSeed] = useState('watersort-campaign-v1-level-1')
	const [initialBoard, setInitialBoard] = useState<Board>([])
	const [currentBoard, setCurrentBoard] = useState<Board>([])
	const [moveHistory, setMoveHistory] = useState<Board[]>([])
	const [moveCount, setMoveCount] = useState(0)
	const [selectedTube, setSelectedTube] = useState<number | null>(null)
	const [hintMove, setHintMove] = useState<Move | null>(null)
	const [hintMessage, setHintMessage] = useState<string | null>(null)
	const [invalidFlashIndex, setInvalidFlashIndex] = useState<number | null>(null)
	const [pourAnimation, setPourAnimation] = useState<PourAnimation | null>(null)
	const [trainingStep, setTrainingStep] = useState<TrainingStep>('done')
	const [toastMessage, setToastMessage] = useState<string | null>(null)
	const [isLevelSolved, setIsLevelSolved] = useState(false)

	const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const pourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const persistEnabledRef = useRef(false)
	const tutorialCompletedRef = useRef(false)
	const highestUnlockedRef = useRef(1)
	const campaignCompleteRef = useRef(false)
	const settingsRef = useRef<GameSettings>({ ...DEFAULT_GAME_SETTINGS })
	const animatingRef = useRef(false)

	const showToast = useCallback((message: string) => {
		if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
		setToastMessage(message)
		toastTimerRef.current = setTimeout(() => {
			setToastMessage(null)
			toastTimerRef.current = null
		}, 2200)
	}, [])

	const flashInvalid = useCallback((tubeIndex: number) => {
		void hapticInvalid(settingsRef.current.hapticsEnabled)
		if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
		setInvalidFlashIndex(tubeIndex)
		flashTimerRef.current = setTimeout(() => {
			setInvalidFlashIndex(null)
			flashTimerRef.current = null
		}, 220)
	}, [])

	const clearPourAnimation = useCallback(() => {
		if (pourTimerRef.current) {
			clearTimeout(pourTimerRef.current)
			pourTimerRef.current = null
		}
		animatingRef.current = false
		setPourAnimation(null)
	}, [])

	const startPourAnimation = useCallback(
		(from: number, to: number, speed: AnimationSpeed) => {
			const { total } = getPourAnimationMs(speed)
			if (total <= 0) {
				clearPourAnimation()
				return
			}
			animatingRef.current = true
			setPourAnimation({
				from,
				to,
				startedAt: Date.now(),
				durationMs: total,
			})
			if (pourTimerRef.current) clearTimeout(pourTimerRef.current)
			pourTimerRef.current = setTimeout(() => {
				animatingRef.current = false
				setPourAnimation(null)
				pourTimerRef.current = null
			}, total)
		},
		[clearPourAnimation],
	)

	const hydrateLevel = useCallback(
		(
			level: ReturnType<typeof createCampaignLevel>,
			options?: {
				currentBoard?: Board
				moveHistory?: Board[]
				moveCount?: number
				tutorialDone?: boolean
			},
		) => {
			const start = cloneBoard(level.board)
			const board = options?.currentBoard ? cloneBoard(options.currentBoard) : cloneBoard(start)
			const moves = options?.moveCount ?? 0
			const tutorialDone = options?.tutorialDone ?? tutorialCompletedRef.current

			clearPourAnimation()
			setLevelNumber(level.levelNumber)
			setDifficultyBand(level.campaignBand)
			setSeed(String(level.seed))
			setInitialBoard(start)
			setCurrentBoard(board)
			setMoveHistory(options?.moveHistory ? options.moveHistory.map(cloneBoard) : [])
			setMoveCount(moves)
			setSelectedTube(null)
			setHintMove(null)
			setHintMessage(null)
			setIsLevelSolved(isSolved(board))
			setShowCampaignFinished(false)

			if (level.levelNumber === 1 && !tutorialDone) {
				setTrainingStep(moves > 0 ? 'encourage' : 'pick-source')
				if (moves === 0) trackEvent('tutorial_started', { level_number: 1 })
			} else {
				setTrainingStep('done')
			}
			trackEvent('level_started', {
				level_number: level.levelNumber,
				difficulty: level.campaignBand,
			})
		},
		[clearPourAnimation],
	)

	useEffect(() => {
		let cancelled = false
		;(async () => {
			const saved = await loadPersistedGameState()
			if (cancelled) return

			highestUnlockedRef.current = saved.highestUnlockedLevel
			campaignCompleteRef.current = saved.campaignComplete
			tutorialCompletedRef.current = saved.tutorialCompleted
			settingsRef.current = saved.settings
			setHighestUnlockedLevel(saved.highestUnlockedLevel)
			setCampaignComplete(saved.campaignComplete)
			setTutorialCompleted(saved.tutorialCompleted)
			setSettings(saved.settings)
			setSoundsEnabled(saved.settings.soundsEnabled)

			const level = createCampaignLevel(saved.currentLevel)
			if (
				saved.session &&
				saved.session.levelNumber === saved.currentLevel &&
				isPersistedSessionCompatible(saved.session, level)
			) {
				hydrateLevel(level, {
					currentBoard: saved.session.currentBoard,
					moveHistory: saved.session.moveHistory,
					moveCount: saved.session.moveCount,
					tutorialDone: saved.tutorialCompleted,
				})
			} else {
				hydrateLevel(level, { tutorialDone: saved.tutorialCompleted })
			}

			setReady(true)
			persistEnabledRef.current = true
		})()
		return () => {
			cancelled = true
		}
	}, [hydrateLevel])

	useEffect(() => {
		if (!ready || !persistEnabledRef.current || initialBoard.length === 0) {
			return
		}
		void savePersistedGameState({
			schemaVersion: STORAGE_SCHEMA_VERSION,
			currentLevel: levelNumber,
			highestUnlockedLevel: highestUnlockedRef.current,
			campaignComplete: campaignCompleteRef.current,
			tutorialCompleted: tutorialCompletedRef.current,
			settings: settingsRef.current,
			session: {
				levelNumber,
				seed,
				campaignBand: difficultyBand,
				initialBoard: cloneBoard(initialBoard),
				currentBoard: cloneBoard(currentBoard),
				moveHistory: moveHistory.map(cloneBoard),
				moveCount,
			},
		})
	}, [
		ready,
		levelNumber,
		seed,
		difficultyBand,
		initialBoard,
		currentBoard,
		moveHistory,
		moveCount,
		highestUnlockedLevel,
		campaignComplete,
		tutorialCompleted,
		settings,
	])

	const updateSettings = useCallback((patch: Partial<GameSettings>) => {
		const next = { ...settingsRef.current, ...patch }
		settingsRef.current = next
		setSettings(next)
		trackEvent('settings_changed', patch)
		if (patch.soundsEnabled !== undefined) {
			setSoundsEnabled(patch.soundsEnabled)
		}
	}, [])

	const replayTutorial = useCallback(() => {
		// Only clears tutorial completion — keeps unlocks, session, and settings.
		tutorialCompletedRef.current = false
		setTutorialCompleted(false)
		const level = createCampaignLevel(1)
		hydrateLevel(level, { tutorialDone: false })
	}, [hydrateLevel])

	const handleTubePress = useCallback(
		(index: number) => {
			if (isLevelSolved || animatingRef.current) return

			if (selectedTube === null) {
				const tube = currentBoard[index]
				if (!tube || tube.length === 0) {
					flashInvalid(index)
					return
				}
				void hapticSelection(settingsRef.current.hapticsEnabled)
				setSelectedTube(index)
				setHintMove(null)
				setHintMessage(null)
				if (trainingStep === 'pick-source') {
					setTrainingStep('pick-destination')
				}
				return
			}

			if (selectedTube === index) {
				setSelectedTube(null)
				if (trainingStep === 'pick-destination') {
					setTrainingStep('pick-source')
				}
				return
			}

			const move: Move = { from: selectedTube, to: index }
			if (!canPour(currentBoard, move)) {
				flashInvalid(index)
				setSelectedTube(null)
				return
			}

			// Authoritative state update first — animation is cosmetic only.
			const previous = cloneBoard(currentBoard)
			const nextBoard = applyMove(currentBoard, move)
			setMoveHistory((history) => [...history, previous])
			setCurrentBoard(nextBoard)
			setMoveCount((count) => count + 1)
			setSelectedTube(null)
			setHintMove(null)
			setHintMessage(null)

			void hapticPour(settingsRef.current.hapticsEnabled)
			void playPourSound()
			startPourAnimation(move.from, move.to, settingsRef.current.animationSpeed)

			if (trainingStep === 'pick-destination' || trainingStep === 'pick-source') {
				setTrainingStep('encourage')
			}

			if (isSolved(nextBoard)) {
				setIsLevelSolved(true)
				trackEvent('level_completed', {
					level_number: levelNumber,
					difficulty: difficultyBand,
					move_count: moveCount + 1,
				})
				void maybeShowInterstitialAfterLevelCompleted({
					isTutorial: levelNumber === 1,
				})
				void hapticSuccess(settingsRef.current.hapticsEnabled)
				void playWinSound()
				const unlocked = nextUnlockAfterClearing(
					levelNumber,
					highestUnlockedRef.current,
				)
				highestUnlockedRef.current = unlocked
				setHighestUnlockedLevel(unlocked)

				if (levelNumber === 1) {
					trackEvent('tutorial_completed', {
						level_number: 1,
						move_count: moveCount + 1,
					})
					tutorialCompletedRef.current = true
					setTutorialCompleted(true)
					setTrainingStep('done')
				}
				if (levelNumber === 100) {
					trackEvent('campaign_completed', { level_number: 100 })
					campaignCompleteRef.current = true
					setCampaignComplete(true)
				}
			}
		},
		[
			currentBoard,
			difficultyBand,
			flashInvalid,
			isLevelSolved,
			levelNumber,
			moveCount,
			selectedTube,
			startPourAnimation,
			trainingStep,
		],
	)

	const handleUndo = useCallback(() => {
		if (animatingRef.current) {
			clearPourAnimation()
		}
		if (moveHistory.length === 0) {
			showToast('Нечего отменять')
			return
		}
		const history = [...moveHistory]
		const previous = history.pop()
		if (!previous) return
		trackEvent('undo_used', { level_number: levelNumber })
		setMoveHistory(history)
		setCurrentBoard(previous)
		setMoveCount((count) => Math.max(0, count - 1))
		setSelectedTube(null)
		setHintMove(null)
		setHintMessage(null)
		setIsLevelSolved(false)
	}, [clearPourAnimation, levelNumber, moveHistory, showToast])

	const handleRestart = useCallback(() => {
		if (moveCount > 0) {
			trackEvent('level_restarted', { level_number: levelNumber })
		}
		clearPourAnimation()
		setCurrentBoard(cloneBoard(initialBoard))
		setMoveHistory([])
		setMoveCount(0)
		setSelectedTube(null)
		setHintMove(null)
		setHintMessage(null)
		setIsLevelSolved(false)
		if (levelNumber === 1 && !tutorialCompletedRef.current) {
			setTrainingStep('pick-source')
		}
	}, [clearPourAnimation, initialBoard, levelNumber, moveCount])

	const shouldConfirmRestart = useCallback(() => {
		if (moveCount === 0) return false
		if (levelNumber === 1 && !tutorialCompletedRef.current) return false
		return true
	}, [levelNumber, moveCount])

	const handleHint = useCallback(() => {
		if (isLevelSolved || isSolved(currentBoard)) {
			showToast('Уровень уже решён')
			return
		}
		try {
			const move = getHint(currentBoard, {
				maxStates: 250_000,
				maxDepth: 250,
				timeoutMs: 4_000,
			})
			if (!move) {
				showToast('Подсказка недоступна')
				setHintMove(null)
				setHintMessage(null)
				return
			}
			setSelectedTube(null)
			setHintMove(move)
			trackEvent('hint_used', {
				level_number: levelNumber,
				difficulty: difficultyBand,
			})
			setHintMessage('Перелейте отсюда → сюда')
		} catch {
			showToast('Подсказка недоступна')
			setHintMove(null)
			setHintMessage(null)
		}
	}, [currentBoard, difficultyBand, isLevelSolved, levelNumber, showToast])

	const openLevel = useCallback(
		(targetLevel: number) => {
			if (targetLevel < 1 || targetLevel > highestUnlockedRef.current) {
				showToast('Уровень ещё закрыт')
				return
		}
		const level = createCampaignLevel(targetLevel)
		trackEvent('level_selected', { level_number: targetLevel })
		hydrateLevel(level, { tutorialDone: tutorialCompletedRef.current })
		},
		[hydrateLevel, showToast],
	)

	const handleNextLevel = useCallback(() => {
		if (levelNumber >= 100) {
			setShowCampaignFinished(true)
			return
		}
		openLevel(levelNumber + 1)
	}, [levelNumber, openLevel])

	const handleReplayLevel = useCallback(() => {
		openLevel(levelNumber)
	}, [levelNumber, openLevel])

	return {
		ready,
		levelNumber,
		difficultyBand,
		difficultyLabel: getDifficultyLabelRu(difficultyBand),
		initialBoard,
		currentBoard,
		moveCount,
		moveHistoryLength: moveHistory.length,
		selectedTube,
		hintMove,
		hintMessage,
		invalidFlashIndex,
		pourAnimation,
		isLevelSolved,
		showCampaignFinished,
		campaignComplete,
		tutorialCompleted,
		trainingStep,
		highestUnlockedLevel,
		canUndo: moveHistory.length > 0,
		toastMessage,
		settings,
		updateSettings,
		replayTutorial,
		handleTubePress,
		handleUndo,
		handleRestart,
		shouldConfirmRestart,
		handleHint,
		handleNextLevel,
		handleReplayLevel,
		openLevel,
		dismissCampaignFinished: () => setShowCampaignFinished(false),
	}
}

export type { AnimationSpeed, PaletteMode }
export { createDefaultPersistedState }
