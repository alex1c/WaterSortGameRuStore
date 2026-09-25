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
	isSolved,
	type Board,
	type Move,
} from '../game'
import {
	createInitialPuzzleHelpState,
	buildRestartBoard,
	type PuzzleHelpState,
} from '../help'
import { usePuzzleHelpUi } from './usePuzzleHelpUi'
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
import {
	createEmptyFreePlayState,
	type PersistedFreePlayState,
} from '../freePlay'
import {
	createEmptyDailyState,
	type PersistedDailyState,
} from '../daily'
import { useFreePlayGame, type FreePlayController } from './useFreePlayGame'
import { useDailyGame, type DailyController } from './useDailyGame'

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
	openHelpSheet: () => void
	closeHelpSheet: () => void
	requestExtraTubeOffer: () => void
	confirmHintPack: () => void
	confirmExtraTube: () => void
	cancelHelpDialog: () => void
	help: PuzzleHelpState
	helpSheetVisible: boolean
	helpDialog: import('../components/HelpSheet').HelpDialogKind
	hintSearching: boolean
	rewardLoading: boolean
	freePlayDiscoveryVisible: boolean
	acknowledgeFreePlayDiscovery: (opened: boolean) => void
	maybeShowFreePlayDiscovery: () => void
	handleNextLevel: () => void
	handleReplayLevel: () => void
	openLevel: (levelNumber: number) => void
	dismissCampaignFinished: () => void
	freePlay: FreePlayController
	daily: DailyController
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
	/** Original generated board — campaign identity freeze; never gains extra tube. */
	const [originalBoard, setOriginalBoard] = useState<Board>([])
	/** Restart target (original + optional rewarded empty tube). */
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
	const [freePlayDiscoveryShown, setFreePlayDiscoveryShown] = useState(false)
	const [freePlayDiscoveryVisible, setFreePlayDiscoveryVisible] = useState(false)

	const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const pourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const persistEnabledRef = useRef(false)
	const tutorialCompletedRef = useRef(false)
	const highestUnlockedRef = useRef(1)
	const campaignCompleteRef = useRef(false)
	const freePlayDiscoveryShownRef = useRef(false)
	const settingsRef = useRef<GameSettings>({ ...DEFAULT_GAME_SETTINGS })
	const statisticsRef = useRef<GameStatistics>(createEmptyStatistics())
	const achievementsRef = useRef<AchievementState>(createEmptyAchievementState())
	const attemptRef = useRef<AttemptFlags>(createFreshAttemptFlags())
	const animatingRef = useRef(false)
	const completionLockRef = useRef<number | null>(null)
	const freePlayRef = useRef<PersistedFreePlayState>(createEmptyFreePlayState())
	const [initialFreePlay, setInitialFreePlay] = useState<PersistedFreePlayState>(
		createEmptyFreePlayState,
	)
	const [freePlayTick, setFreePlayTick] = useState(0)
	const dailyRef = useRef<PersistedDailyState>(createEmptyDailyState())
	const [initialDaily, setInitialDaily] = useState<PersistedDailyState>(
		createEmptyDailyState,
	)
	const [dailyTick, setDailyTick] = useState(0)

	const boardRef = useRef<Board>([])
	const originalBoardRef = useRef<Board>([])
	const moveHistoryRef = useRef<Board[]>([])
	const isLevelSolvedRef = useRef(false)
	const difficultyBandRef = useRef<CampaignDifficultyBand>('BEGINNER')

	useEffect(() => {
		boardRef.current = currentBoard
		originalBoardRef.current = originalBoard
		moveHistoryRef.current = moveHistory
		isLevelSolvedRef.current = isLevelSolved
		difficultyBandRef.current = difficultyBand
	}, [currentBoard, originalBoard, moveHistory, isLevelSolved, difficultyBand])

	const showToast = useCallback((message: string) => {
		if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
		setToastMessage(message)
		toastTimerRef.current = setTimeout(() => {
			setToastMessage(null)
			toastTimerRef.current = null
		}, 2200)
	}, [])

	const puzzleHelp = usePuzzleHelpUi({
		mode: 'campaign',
		getDifficulty: () => difficultyBandRef.current,
		getBoard: () => boardRef.current,
		getOriginalBoard: () => originalBoardRef.current,
		getMoveHistory: () => moveHistoryRef.current,
		isPuzzleSolved: () => isLevelSolvedRef.current,
		showToast,
		onHintMove: (move) => {
			setSelectedTube(null)
			setHintMove(move)
			attemptRef.current = { ...attemptRef.current, usedHint: true }
			setAttempt(attemptRef.current)
			const nextStats = recordHintUsed(statisticsRef.current)
			statisticsRef.current = nextStats
			setStatistics(nextStats)
			trackEvent('hint_used', {
				level_number: levelNumber,
				difficulty: difficultyBandRef.current,
			})
			setHintMessage('Перелейте отсюда → сюда')
		},
		onBoardsAssisted: ({ currentBoard: nextBoard, moveHistory: nextHistory, restartBoard }) => {
			setCurrentBoard(nextBoard)
			setMoveHistory(nextHistory)
			setInitialBoard(restartBoard)
			setSelectedTube(null)
			setHintMove(null)
			setHintMessage(null)
		},
	})
	const puzzleHelpRef = useRef(puzzleHelp)
	useEffect(() => {
		puzzleHelpRef.current = puzzleHelp
	}, [puzzleHelp])

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
				help?: PuzzleHelpState
				/** When true, treat as a fresh puzzle identity (replay / next level). */
				freshHelp?: boolean
			},
		) => {
			const original = cloneBoard(level.board)
			const nextHelp =
				options?.freshHelp || !options?.help
					? createInitialPuzzleHelpState()
					: options.help
			const restartBase = buildRestartBoard(original, nextHelp.extraTubeGranted)
			const board = options?.currentBoard
				? cloneBoard(options.currentBoard)
				: cloneBoard(restartBase)
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
			setOriginalBoard(original)
			setInitialBoard(restartBase)
			setCurrentBoard(board)
			setMoveHistory(options?.moveHistory ? options.moveHistory.map(cloneBoard) : [])
			setMoveCount(moves)
			setSelectedTube(null)
			setHintMove(null)
			setHintMessage(null)
			setIsLevelSolved(isSolved(board))
			setShowCampaignFinished(false)
			puzzleHelpRef.current.restoreHelp(nextHelp)

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
			freePlayDiscoveryShownRef.current = saved.freePlayDiscoveryShown
			settingsRef.current = saved.settings
			statisticsRef.current = saved.statistics
			achievementsRef.current = saved.achievements
			freePlayRef.current = saved.freePlay
			setInitialFreePlay(saved.freePlay)
			dailyRef.current = saved.daily
			setInitialDaily(saved.daily)

			setHighestUnlockedLevel(saved.highestUnlockedLevel)
			setCampaignComplete(saved.campaignComplete)
			setTutorialCompleted(saved.tutorialCompleted)
			setFreePlayDiscoveryShown(saved.freePlayDiscoveryShown)
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
					help: saved.session.help,
				})
			} else {
				hydrateLevel(level, {
					tutorialDone: saved.tutorialCompleted,
					freshHelp: true,
				})
			}

			// Migrated users past Level 5 may see discovery once on Home.
			if (
				!saved.freePlayDiscoveryShown &&
				saved.highestUnlockedLevel > 5 &&
				saved.tutorialCompleted
			) {
				// Eligible — shown when Home opens via maybeShowFreePlayDiscovery.
			}

			setReady(true)
			persistEnabledRef.current = true
		})()
		return () => {
			cancelled = true
		}
	}, [hydrateLevel, queueAchievementToasts])

	useEffect(() => {
		if (!ready || !persistEnabledRef.current || originalBoard.length === 0) {
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
			freePlay: freePlayRef.current,
			daily: dailyRef.current,
			freePlayDiscoveryShown: freePlayDiscoveryShownRef.current,
			session: {
				levelNumber,
				seed,
				campaignBand: difficultyBand,
				initialBoard: cloneBoard(originalBoard),
				currentBoard: cloneBoard(currentBoard),
				moveHistory: moveHistory.map(cloneBoard),
				moveCount,
				attempt: attemptRef.current,
				help: puzzleHelpRef.current.getHelp(),
			},
		})
	}, [
		ready,
		levelNumber,
		seed,
		difficultyBand,
		originalBoard,
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
		freePlayTick,
		dailyTick,
		puzzleHelp.help,
		freePlayDiscoveryShown,
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
				// After Level 5, discovery becomes eligible (shown once on Home).
				if (
					levelNumber === 5 &&
					!freePlayDiscoveryShownRef.current
				) {
					// Defer until Home — do not cover the win celebration.
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

	const maybeShowFreePlayDiscovery = useCallback(() => {
		if (freePlayDiscoveryShownRef.current) return
		if (!tutorialCompletedRef.current) return
		if (highestUnlockedRef.current <= 5) return
		// Users who already opened Free Play do not need the educational prompt.
		if (
			freePlayRef.current.seedCounter > 0 ||
			freePlayRef.current.session !== null
		) {
			freePlayDiscoveryShownRef.current = true
			setFreePlayDiscoveryShown(true)
			return
		}
		freePlayDiscoveryShownRef.current = true
		setFreePlayDiscoveryShown(true)
		setFreePlayDiscoveryVisible(true)
		trackEvent('free_play_discovery_shown')
	}, [])

	const acknowledgeFreePlayDiscovery = useCallback((opened: boolean) => {
		setFreePlayDiscoveryVisible(false)
		freePlayDiscoveryShownRef.current = true
		setFreePlayDiscoveryShown(true)
		if (opened) {
			trackEvent('free_play_discovery_opened')
		}
	}, [])

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
		puzzleHelp.requestHint()
	}, [puzzleHelp])

	const openLevel = useCallback(
		(targetLevel: number) => {
			if (targetLevel < 1 || targetLevel > highestUnlockedRef.current) {
				showToast('Уровень ещё закрыт')
				return
			}
			const level = createCampaignLevel(targetLevel)
			trackEvent('level_selected', { level_number: targetLevel })
			hydrateLevel(level, {
				tutorialDone: tutorialCompletedRef.current,
				freshHelp: true,
			})
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

	const bumpFreePlayTick = useCallback(() => {
		setFreePlayTick((value) => value + 1)
	}, [])

	const bumpDailyTick = useCallback(() => {
		setDailyTick((value) => value + 1)
	}, [])

	const setStatisticsAndRef = useCallback((next: GameStatistics) => {
		statisticsRef.current = next
		setStatistics(next)
	}, [])

	const setAchievementsAndRef = useCallback((next: AchievementState) => {
		achievementsRef.current = next
		setAchievements(next)
	}, [])

	const setFreePlayState = useCallback(
		(next: PersistedFreePlayState) => {
			freePlayRef.current = next
			bumpFreePlayTick()
		},
		[bumpFreePlayTick],
	)

	const setDailyState = useCallback(
		(next: PersistedDailyState) => {
			dailyRef.current = next
			bumpDailyTick()
		},
		[bumpDailyTick],
	)

	const freePlay = useFreePlayGame({
		getSettings: () => settingsRef.current,
		getStatistics: () => statisticsRef.current,
		setStatistics: setStatisticsAndRef,
		getAchievements: () => achievementsRef.current,
		setAchievements: setAchievementsAndRef,
		getFreePlay: () => freePlayRef.current,
		setFreePlay: setFreePlayState,
		initialFreePlay,
	})

	const daily = useDailyGame({
		getSettings: () => settingsRef.current,
		getStatistics: () => statisticsRef.current,
		setStatistics: setStatisticsAndRef,
		getAchievements: () => achievementsRef.current,
		setAchievements: setAchievementsAndRef,
		getDaily: () => dailyRef.current,
		setDaily: setDailyState,
		initialDaily,
	})

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
		openHelpSheet: puzzleHelp.openHelpSheet,
		closeHelpSheet: puzzleHelp.closeHelpSheet,
		requestExtraTubeOffer: puzzleHelp.requestExtraTubeOffer,
		confirmHintPack: puzzleHelp.confirmHintPack,
		confirmExtraTube: puzzleHelp.confirmExtraTube,
		cancelHelpDialog: puzzleHelp.cancelHelpDialog,
		help: puzzleHelp.help,
		helpSheetVisible: puzzleHelp.helpSheetVisible,
		helpDialog: puzzleHelp.helpDialog,
		hintSearching: puzzleHelp.hintSearching,
		rewardLoading: puzzleHelp.rewardLoading,
		freePlayDiscoveryVisible,
		acknowledgeFreePlayDiscovery,
		maybeShowFreePlayDiscovery,
		handleNextLevel,
		handleReplayLevel,
		openLevel,
		dismissCampaignFinished: () => setShowCampaignFinished(false),
		freePlay,
		daily,
	}
}

export type { AnimationSpeed, PaletteMode }
export { createDefaultPersistedState }
