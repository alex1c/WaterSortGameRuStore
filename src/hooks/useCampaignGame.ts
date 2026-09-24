import { useCallback, useEffect, useRef, useState } from 'react'

import {
	CAMPAIGN_LEVEL_COUNT,
	createCampaignLevel,
	getDifficultyLabelRu,
	nextUnlockAfterClearing,
	type CampaignDifficultyBand,
} from '../campaign'
import {
	evaluateAchievements,
	listAchievementProgress,
	markAchievementsNotified,
	pendingUnlockNotifications,
	type AchievementId,
	type AchievementProgress,
	type AchievementState,
	createEmptyAchievementState,
} from '../achievements'
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
import {
	createEmptyStatistics,
	createFreshAttemptFlags,
	recordHintUsed,
	recordLevelCompletion,
	recordPour,
	recordRestartUsed,
	recordUndoUsed,
	type AttemptFlags,
	type GameStatistics,
} from '../statistics'

export type TrainingStep = 'pick-source' | 'pick-destination' | 'encourage' | 'done'

export interface PourAnimation {
	from: number
	to: number
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
	/** True while Level 1 interactive training guidance is active. */
	isTrainingActive: boolean
	trainingStep: TrainingStep
	highestUnlockedLevel: number
	canUndo: boolean
	toastMessage: string | null
	settings: GameSettings
	statistics: GameStatistics
	achievements: AchievementState
	achievementProgress: AchievementProgress[]
	pendingAchievementToast: AchievementId | null
	hasMidLevelSession: boolean
	levelsCompleted: number
	updateSettings: (patch: Partial<GameSettings>) => void
	replayTutorial: () => void
	continueGame: () => void
	acknowledgeAchievementToast: () => void
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

export function useCampaignGame(): CampaignGameController {
	const [ready, setReady] = useState(false)
	const [highestUnlockedLevel, setHighestUnlockedLevel] = useState(1)
	const [campaignComplete, setCampaignComplete] = useState(false)
	const [tutorialCompleted, setTutorialCompleted] = useState(false)
	const [showCampaignFinished, setShowCampaignFinished] = useState(false)
	const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_GAME_SETTINGS })
	const [statistics, setStatistics] = useState<GameStatistics>(createEmptyStatistics)
	const [achievements, setAchievements] = useState<AchievementState>(
		createEmptyAchievementState,
	)
	const [pendingAchievementToast, setPendingAchievementToast] =
		useState<AchievementId | null>(null)

	const [levelNumber, setLevelNumber] = useState(1)
	const [difficultyBand, setDifficultyBand] =
		useState<CampaignDifficultyBand>('BEGINNER')
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
	const [attempt, setAttempt] = useState<AttemptFlags>(createFreshAttemptFlags)

	const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const pourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const persistEnabledRef = useRef(false)
	const tutorialCompletedRef = useRef(false)
	const highestUnlockedRef = useRef(1)
	const campaignCompleteRef = useRef(false)
	const settingsRef = useRef<GameSettings>({ ...DEFAULT_GAME_SETTINGS })
	const statisticsRef = useRef<GameStatistics>(createEmptyStatistics())
	const achievementsRef = useRef<AchievementState>(createEmptyAchievementState())
	const attemptRef = useRef<AttemptFlags>(createFreshAttemptFlags())
	const animatingRef = useRef(false)
	const completionLockRef = useRef<number | null>(null)

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

	const queueAchievementToasts = useCallback((state: AchievementState) => {
		const pending = pendingUnlockNotifications(state)
		if (pending.length === 0) {
			setPendingAchievementToast(null)
			return
		}
		setPendingAchievementToast(pending[0] ?? null)
	}, [])

	const applyAchievementEvaluation = useCallback(
		(stats: GameStatistics) => {
			const evaluated = evaluateAchievements(stats, achievementsRef.current)
			achievementsRef.current = evaluated.state
			setAchievements(evaluated.state)
			for (const id of evaluated.newlyUnlocked) {
				trackEvent('achievement_unlocked', { achievement_id: id })
			}
			queueAchievementToasts(evaluated.state)
		},
		[queueAchievementToasts],
	)

	const hydrateLevel = useCallback(
		(
			level: ReturnType<typeof createCampaignLevel>,
			options?: {
				currentBoard?: Board
				moveHistory?: Board[]
				moveCount?: number
				tutorialDone?: boolean
				attempt?: AttemptFlags
			},
		) => {
			const start = cloneBoard(level.board)
			const board = options?.currentBoard
				? cloneBoard(options.currentBoard)
				: cloneBoard(start)
			const moves = options?.moveCount ?? 0
			const tutorialDone = options?.tutorialDone ?? tutorialCompletedRef.current
			const nextAttempt = options?.attempt
				? { ...options.attempt }
				: createFreshAttemptFlags()

			clearPourAnimation()
			completionLockRef.current = null
			attemptRef.current = nextAttempt
			setAttempt(nextAttempt)
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
			statisticsRef.current = saved.statistics
			achievementsRef.current = saved.achievements

			setHighestUnlockedLevel(saved.highestUnlockedLevel)
			setCampaignComplete(saved.campaignComplete)
			setTutorialCompleted(saved.tutorialCompleted)
			setSettings(saved.settings)
			setStatistics(saved.statistics)
			setAchievements(saved.achievements)
			setSoundsEnabled(saved.settings.soundsEnabled)
			queueAchievementToasts(saved.achievements)

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
					attempt: saved.session.attempt,
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
	}, [hydrateLevel, queueAchievementToasts])

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
			statistics: statisticsRef.current,
			achievements: achievementsRef.current,
			session: {
				levelNumber,
				seed,
				campaignBand: difficultyBand,
				initialBoard: cloneBoard(initialBoard),
				currentBoard: cloneBoard(currentBoard),
				moveHistory: moveHistory.map(cloneBoard),
				moveCount,
				attempt: attemptRef.current,
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
		statistics,
		achievements,
		attempt,
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
		tutorialCompletedRef.current = false
		setTutorialCompleted(false)
		const level = createCampaignLevel(1)
		hydrateLevel(level, { tutorialDone: false })
	}, [hydrateLevel])

	const acknowledgeAchievementToast = useCallback(() => {
		const current = pendingAchievementToast
		if (!current) return
		const next = markAchievementsNotified(achievementsRef.current, [current])
		achievementsRef.current = next
		setAchievements(next)
		const remaining = pendingUnlockNotifications(next)
		setPendingAchievementToast(remaining[0] ?? null)
	}, [pendingAchievementToast])

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

			const previous = cloneBoard(currentBoard)
			const nextBoard = applyMove(currentBoard, move)
			setMoveHistory((history) => [...history, previous])
			setCurrentBoard(nextBoard)
			setMoveCount((count) => count + 1)
			setSelectedTube(null)
			setHintMove(null)
			setHintMessage(null)

			const nextStats = recordPour(statisticsRef.current)
			statisticsRef.current = nextStats
			setStatistics(nextStats)

			void hapticPour(settingsRef.current.hapticsEnabled)
			void playPourSound()
			startPourAnimation(move.from, move.to, settingsRef.current.animationSpeed)

			if (trainingStep === 'pick-destination' || trainingStep === 'pick-source') {
				setTrainingStep('encourage')
			}

			if (isSolved(nextBoard)) {
				// Guard against double-count if completion UI re-renders.
				if (completionLockRef.current === levelNumber) {
					setIsLevelSolved(true)
					return
				}
				completionLockRef.current = levelNumber
				setIsLevelSolved(true)

				const completion = recordLevelCompletion(
					statisticsRef.current,
					levelNumber,
					difficultyBand,
					attemptRef.current,
				)
				statisticsRef.current = completion.stats
				setStatistics(completion.stats)
				applyAchievementEvaluation(completion.stats)

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
				if (levelNumber === CAMPAIGN_LEVEL_COUNT) {
					trackEvent('campaign_completed', {
						level_number: CAMPAIGN_LEVEL_COUNT,
					})
					campaignCompleteRef.current = true
					setCampaignComplete(true)
				}
			}
		},
		[
			applyAchievementEvaluation,
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
		if (animatingRef.current) clearPourAnimation()
		if (moveHistory.length === 0) {
			showToast('Нечего отменять')
			return
		}
		const history = [...moveHistory]
		const previous = history.pop()
		if (!previous) return
		trackEvent('undo_used', { level_number: levelNumber })
		attemptRef.current = { ...attemptRef.current, usedUndo: true }
		setAttempt(attemptRef.current)
		const nextStats = recordUndoUsed(statisticsRef.current)
		statisticsRef.current = nextStats
		setStatistics(nextStats)
		setMoveHistory(history)
		setCurrentBoard(previous)
		setMoveCount((count) => Math.max(0, count - 1))
		setSelectedTube(null)
		setHintMove(null)
		setHintMessage(null)
		setIsLevelSolved(false)
		completionLockRef.current = null
	}, [clearPourAnimation, levelNumber, moveHistory, showToast])

	const handleRestart = useCallback(() => {
		if (moveCount > 0) {
			trackEvent('level_restarted', { level_number: levelNumber })
		}
		clearPourAnimation()
		attemptRef.current = {
			usedHint: false,
			usedUndo: false,
			usedRestart: true,
		}
		setAttempt(attemptRef.current)
		const nextStats = recordRestartUsed(statisticsRef.current)
		statisticsRef.current = nextStats
		setStatistics(nextStats)
		completionLockRef.current = null
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
			attemptRef.current = { ...attemptRef.current, usedHint: true }
			setAttempt(attemptRef.current)
			const nextStats = recordHintUsed(statisticsRef.current)
			statisticsRef.current = nextStats
			setStatistics(nextStats)
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

	const continueGame = useCallback(() => {
		// Prefer the hydrated mid-level session. If the current board is already
		// solved and the next campaign level is unlocked, advance for Continue.
		if (
			isLevelSolved &&
			levelNumber < highestUnlockedRef.current &&
			levelNumber < CAMPAIGN_LEVEL_COUNT
		) {
			openLevel(levelNumber + 1)
		}
	}, [isLevelSolved, levelNumber, openLevel])

	const handleNextLevel = useCallback(() => {
		if (levelNumber >= CAMPAIGN_LEVEL_COUNT) {
			setShowCampaignFinished(true)
			return
		}
		openLevel(levelNumber + 1)
	}, [levelNumber, openLevel])

	const handleReplayLevel = useCallback(() => {
		openLevel(levelNumber)
	}, [levelNumber, openLevel])

	const isTrainingActive =
		levelNumber === 1 && !tutorialCompleted && trainingStep !== 'done'

	const hasMidLevelSession =
		moveCount > 0 ||
		JSON.stringify(currentBoard) !== JSON.stringify(initialBoard)

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
		isTrainingActive,
		trainingStep,
		highestUnlockedLevel,
		canUndo: moveHistory.length > 0,
		toastMessage,
		settings,
		statistics,
		achievements,
		achievementProgress: listAchievementProgress(statistics, achievements),
		pendingAchievementToast,
		hasMidLevelSession,
		levelsCompleted: statistics.levelsCompleted,
		updateSettings,
		replayTutorial,
		continueGame,
		acknowledgeAchievementToast,
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
