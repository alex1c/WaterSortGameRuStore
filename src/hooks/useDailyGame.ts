import { useCallback, useEffect, useRef, useState } from 'react'

import {
	buildDailyHistory,
	createDailyPuzzle,
	createDailySeed,
	formatLocalDateRu,
	getActiveCurrentStreak,
	getDailyDifficulty,
	isDailyCompletedOn,
	localDateKey,
	pruneCompletedDateKeys,
	recordDailyCompletion,
	type DailyDifficulty,
	type DailyHistoryCell,
	type LocalDateKey,
	type PersistedDailySession,
	type PersistedDailyState,
} from '../daily'
import {
	applyMove,
	canPour,
	cloneBoard,
	isSolved,
	type Board,
	type Move,
} from '../game'
import {
	buildRestartBoard,
	createInitialPuzzleHelpState,
	type PuzzleHelpState,
} from '../help'
import {
	getPourAnimationMs,
	type AnimationSpeed,
	type GameSettings,
} from '../settings'
import {
	createFreshAttemptFlags,
	recordDailyStatsCompletion,
	recordHintUsed,
	recordPour,
	recordRestartUsed,
	recordUndoUsed,
	type AttemptFlags,
	type GameStatistics,
} from '../statistics'
import {
	evaluateAchievements,
	markAchievementsNotified,
	pendingUnlockNotifications,
	type AchievementId,
	type AchievementState,
} from '../achievements'
import { getDifficultyLabelRu } from '../campaign'
import {
	hapticInvalid,
	hapticPour,
	hapticSelection,
	hapticSuccess,
	playPourSound,
	playWinSound,
} from '../feedback'
import { maybeShowInterstitialAfterLevelCompleted } from '../ads'
import { trackEvent } from '../analytics'
import { usePuzzleHelpUi } from './usePuzzleHelpUi'

export interface DailyPourAnimation {
	from: number
	to: number
	startedAt: number
	durationMs: number
}

export type DailyStatus = 'idle' | 'generating' | 'ready' | 'failed'

export interface DailyController {
	status: DailyStatus
	/** Local calendar key used for hub/game identity (injected clock). */
	todayKey: LocalDateKey
	todayLabel: string
	difficulty: DailyDifficulty
	difficultyLabel: string
	activeStreak: number
	bestStreak: number
	completedToday: boolean
	/** Unfinished session for *today* only. */
	hasInProgressSession: boolean
	inProgressMoveCount: number
	seed: string | null
	initialBoard: Board
	currentBoard: Board
	moveCount: number
	selectedTube: number | null
	hintMove: Move | null
	hintMessage: string | null
	invalidFlashIndex: number | null
	pourAnimation: DailyPourAnimation | null
	isSolved: boolean
	canUndo: boolean
	toastMessage: string | null
	pendingAchievementToast: AchievementId | null
	historyCells: DailyHistoryCell[]
	/** Refresh todayKey from host clock (call on hub focus). */
	syncToday: () => void
	startOrResumeToday: () => void
	replayToday: () => void
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
}

interface DailyHost {
	getSettings: () => GameSettings
	getStatistics: () => GameStatistics
	setStatistics: (stats: GameStatistics) => void
	getAchievements: () => AchievementState
	setAchievements: (state: AchievementState) => void
	getDaily: () => PersistedDailyState
	setDaily: (state: PersistedDailyState) => void
	initialDaily: PersistedDailyState
	/** Injectable clock for tests; defaults to device local now. */
	now?: () => Date
}

const HISTORY_DAYS = 30
const RETAIN_COMPLETED_KEYS = 400

/**
 * Daily Puzzle gameplay controller.
 * Identity = watersort-daily-v1-YYYY-MM-DD from the player's local calendar.
 * Boards are isolated from Campaign and Free Play sessions.
 */
export function useDailyGame(host: DailyHost): DailyController {
	const nowRef = useRef(host.now ?? (() => new Date()))
	const hostRef = useRef(host)
	const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const pourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const animatingRef = useRef(false)
	const completionLockRef = useRef(false)
	const generatingRef = useRef(false)
	const attemptRef = useRef<AttemptFlags>(createFreshAttemptFlags())
	const hydratedFromStorageRef = useRef(false)

	const [todayKey, setTodayKey] = useState<LocalDateKey>(() =>
		localDateKey((host.now ?? (() => new Date()))()),
	)
	const [status, setStatus] = useState<DailyStatus>('idle')
	const [difficulty, setDifficulty] = useState<DailyDifficulty>(() =>
		getDailyDifficulty(localDateKey((host.now ?? (() => new Date()))())),
	)
	const [seed, setSeed] = useState<string | null>(null)
	/** Original generated board — Daily identity freeze; never gains extra tube. */
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
	const [pourAnimation, setPourAnimation] =
		useState<DailyPourAnimation | null>(null)
	const [isPuzzleSolved, setIsPuzzleSolved] = useState(false)
	const [attempt, setAttempt] = useState<AttemptFlags>(createFreshAttemptFlags)
	const [toastMessage, setToastMessage] = useState<string | null>(null)
	const [pendingAchievementToast, setPendingAchievementToast] =
		useState<AchievementId | null>(null)
	const [dailySnapshot, setDailySnapshot] = useState<PersistedDailyState>(
		host.initialDaily,
	)

	const boardRef = useRef<Board>([])
	const originalBoardRef = useRef<Board>([])
	const moveHistoryRef = useRef<Board[]>([])
	const isPuzzleSolvedRef = useRef(false)
	const difficultyRef = useRef<DailyDifficulty>(difficulty)

	useEffect(() => {
		boardRef.current = currentBoard
		originalBoardRef.current = originalBoard
		moveHistoryRef.current = moveHistory
		isPuzzleSolvedRef.current = isPuzzleSolved
		difficultyRef.current = difficulty
	}, [currentBoard, originalBoard, moveHistory, isPuzzleSolved, difficulty])

	useEffect(() => {
		hostRef.current = host
		nowRef.current = host.now ?? (() => new Date())
	}, [host])

	useEffect(() => {
		attemptRef.current = attempt
	}, [attempt])

	const publishDaily = useCallback((next: PersistedDailyState) => {
		hostRef.current.setDaily(next)
		setDailySnapshot(next)
	}, [])

	/** Drop unfinished sessions that belong to a previous local date. */
	const discardStaleSession = useCallback(
		(state: PersistedDailyState, key: LocalDateKey): PersistedDailyState => {
			if (state.session && state.session.dateKey !== key) {
				return { ...state, session: null }
			}
			return state
		},
		[],
	)

	const syncToday = useCallback(() => {
		const key = localDateKey(nowRef.current())
		setTodayKey(key)
		setDifficulty(getDailyDifficulty(key))
		const current = discardStaleSession(hostRef.current.getDaily(), key)
		if (current !== hostRef.current.getDaily()) {
			publishDaily(current)
		} else {
			setDailySnapshot(current)
		}
	}, [discardStaleSession, publishDaily])

	const showToast = useCallback((message: string) => {
		if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
		setToastMessage(message)
		toastTimerRef.current = setTimeout(() => {
			setToastMessage(null)
			toastTimerRef.current = null
		}, 2200)
	}, [])

	const puzzleHelp = usePuzzleHelpUi({
		mode: 'daily',
		getDifficulty: () => difficultyRef.current,
		getBoard: () => boardRef.current,
		getOriginalBoard: () => originalBoardRef.current,
		getMoveHistory: () => moveHistoryRef.current,
		isPuzzleSolved: () => isPuzzleSolvedRef.current,
		showToast,
		onHintMove: (move) => {
			setSelectedTube(null)
			setHintMove(move)
			attemptRef.current = { ...attemptRef.current, usedHint: true }
			setAttempt(attemptRef.current)
			hostRef.current.setStatistics(
				recordHintUsed(hostRef.current.getStatistics()),
			)
			trackEvent('hint_used', {
				difficulty: difficultyRef.current,
			})
			setHintMessage('Перелейте отсюда → сюда')
		},
		onBoardsAssisted: ({
			currentBoard: nextBoard,
			moveHistory: nextHistory,
			restartBoard,
		}) => {
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
		void hapticInvalid(hostRef.current.getSettings().hapticsEnabled)
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
		setPendingAchievementToast(pending[0] ?? null)
	}, [])

	const applyAchievementEvaluation = useCallback(
		(stats: GameStatistics) => {
			const evaluated = evaluateAchievements(
				stats,
				hostRef.current.getAchievements(),
			)
			hostRef.current.setAchievements(evaluated.state)
			for (const id of evaluated.newlyUnlocked) {
				trackEvent('achievement_unlocked', { achievement_id: id })
			}
			queueAchievementToasts(evaluated.state)
		},
		[queueAchievementToasts],
	)

	const hydratePuzzle = useCallback(
		(
			dateKey: LocalDateKey,
			nextDifficulty: DailyDifficulty,
			nextSeed: string,
			board: Board,
			options?: {
				currentBoard?: Board
				moveHistory?: Board[]
				moveCount?: number
				attempt?: AttemptFlags
				isSolved?: boolean
				help?: PuzzleHelpState
			},
		) => {
			clearPourAnimation()
			completionLockRef.current = Boolean(options?.isSolved)
			const original = cloneBoard(board)
			const nextHelp = options?.help ?? createInitialPuzzleHelpState()
			const restartBase = buildRestartBoard(original, nextHelp.extraTubeGranted)
			const current = options?.currentBoard
				? cloneBoard(options.currentBoard)
				: cloneBoard(restartBase)
			const nextAttempt = options?.attempt
				? { ...options.attempt }
				: createFreshAttemptFlags()
			attemptRef.current = nextAttempt
			setAttempt(nextAttempt)
			setTodayKey(dateKey)
			setDifficulty(nextDifficulty)
			setSeed(nextSeed)
			setOriginalBoard(original)
			setInitialBoard(restartBase)
			setCurrentBoard(current)
			setMoveHistory(
				options?.moveHistory ? options.moveHistory.map(cloneBoard) : [],
			)
			setMoveCount(options?.moveCount ?? 0)
			setSelectedTube(null)
			setHintMove(null)
			setHintMessage(null)
			setIsPuzzleSolved(options?.isSolved ?? isSolved(current))
			setStatus('ready')
			puzzleHelpRef.current.restoreHelp(nextHelp)
		},
		[clearPourAnimation],
	)

	useEffect(() => {
		if (hydratedFromStorageRef.current) return
		hydratedFromStorageRef.current = true
		const key = localDateKey(nowRef.current())
		queueMicrotask(() => {
			setTodayKey(key)
			setDifficulty(getDailyDifficulty(key))
			const normalized = discardStaleSession(host.initialDaily, key)
			if (normalized !== host.initialDaily) {
				publishDaily(normalized)
			} else {
				setDailySnapshot(normalized)
			}
			const saved = normalized.session
			if (saved && saved.dateKey === key) {
				hydratePuzzle(key, saved.difficulty, saved.seed, saved.initialBoard, {
					currentBoard: saved.currentBoard,
					moveHistory: saved.moveHistory,
					moveCount: saved.moveCount,
					attempt: saved.attempt,
					isSolved: saved.isSolved,
					help: saved.help,
				})
			}
		})
	}, [discardStaleSession, host.initialDaily, hydratePuzzle, publishDaily])

	const generateAndPublish = useCallback(
		(dateKey: LocalDateKey, fresh: boolean) => {
			if (generatingRef.current) return
			generatingRef.current = true
			setStatus('generating')

			const nextDifficulty = getDailyDifficulty(dateKey)
			const nextSeed = createDailySeed(dateKey)
			trackEvent('daily_started', {
				difficulty: nextDifficulty,
				date_key: dateKey,
			})

			const result = createDailyPuzzle(nextDifficulty, nextSeed)
			generatingRef.current = false

			if (!result.ok) {
				setStatus('failed')
				return
			}

			const board = result.level.board
			const freshHelp = createInitialPuzzleHelpState()
			hydratePuzzle(dateKey, nextDifficulty, nextSeed, board, {
				isSolved: false,
				attempt: createFreshAttemptFlags(),
				moveCount: 0,
				moveHistory: [],
				help: freshHelp,
			})

			const base = discardStaleSession(hostRef.current.getDaily(), dateKey)
			const session: PersistedDailySession = {
				dateKey,
				difficulty: nextDifficulty,
				seed: nextSeed,
				initialBoard: cloneBoard(board),
				currentBoard: cloneBoard(board),
				moveHistory: [],
				moveCount: 0,
				attempt: createFreshAttemptFlags(),
				isSolved: false,
				help: freshHelp,
			}
			publishDaily({
				...base,
				completedDateKeys: pruneCompletedDateKeys(
					base.completedDateKeys,
					dateKey,
					RETAIN_COMPLETED_KEYS,
				),
				session: fresh ? session : session,
			})
		},
		[discardStaleSession, hydratePuzzle, publishDaily],
	)

	const startOrResumeToday = useCallback(() => {
		const key = localDateKey(nowRef.current())
		setTodayKey(key)
		const state = discardStaleSession(hostRef.current.getDaily(), key)
		if (state !== hostRef.current.getDaily()) {
			publishDaily(state)
		}
		const saved = state.session
		if (saved && saved.dateKey === key && !saved.isSolved) {
			hydratePuzzle(key, saved.difficulty, saved.seed, saved.initialBoard, {
				currentBoard: saved.currentBoard,
				moveHistory: saved.moveHistory,
				moveCount: saved.moveCount,
				attempt: saved.attempt,
				isSolved: saved.isSolved,
				help: saved.help,
			})
			return
		}
		if (saved && saved.dateKey === key && saved.isSolved) {
			// Completed today: resume viewing solved state unless caller uses replay.
			hydratePuzzle(key, saved.difficulty, saved.seed, saved.initialBoard, {
				currentBoard: saved.currentBoard,
				moveHistory: saved.moveHistory,
				moveCount: saved.moveCount,
				attempt: saved.attempt,
				isSolved: true,
				help: saved.help,
			})
			return
		}
		generateAndPublish(key, true)
	}, [discardStaleSession, generateAndPublish, hydratePuzzle, publishDaily])

	const replayToday = useCallback(() => {
		const key = localDateKey(nowRef.current())
		setTodayKey(key)
		// Fresh attempt: generateAndPublish creates new session + initial help.
		generateAndPublish(key, true)
	}, [generateAndPublish])

	const persistLiveSession = useCallback(
		(patch: Partial<PersistedDailySession>) => {
			const current = hostRef.current.getDaily()
			const session = current.session
			if (!session || session.dateKey !== todayKey) return
			publishDaily({
				...current,
				session: { ...session, ...patch },
			})
		},
		[publishDaily, todayKey],
	)

	useEffect(() => {
		if (status !== 'ready' || !seed || originalBoard.length === 0) return
		persistLiveSession({
			dateKey: todayKey,
			difficulty,
			seed,
			// Persist ORIGINAL board only; restart assistance is derived from help.
			initialBoard: cloneBoard(originalBoard),
			currentBoard: cloneBoard(currentBoard),
			moveHistory: moveHistory.map(cloneBoard),
			moveCount,
			attempt: attemptRef.current,
			isSolved: isPuzzleSolved,
			help: puzzleHelpRef.current.getHelp(),
		})
	}, [
		status,
		todayKey,
		difficulty,
		seed,
		originalBoard,
		initialBoard,
		currentBoard,
		moveHistory,
		moveCount,
		isPuzzleSolved,
		attempt,
		puzzleHelp.help,
		persistLiveSession,
	])

	const acknowledgeAchievementToast = useCallback(() => {
		const currentId = pendingAchievementToast
		if (!currentId) return
		const next = markAchievementsNotified(hostRef.current.getAchievements(), [
			currentId,
		])
		hostRef.current.setAchievements(next)
		const remaining = pendingUnlockNotifications(next)
		setPendingAchievementToast(remaining[0] ?? null)
	}, [pendingAchievementToast])

	const handleTubePress = useCallback(
		(index: number) => {
			if (status !== 'ready' || isPuzzleSolved || animatingRef.current) return

			if (selectedTube === null) {
				const tube = currentBoard[index]
				if (!tube || tube.length === 0) {
					flashInvalid(index)
					return
				}
				void hapticSelection(hostRef.current.getSettings().hapticsEnabled)
				setSelectedTube(index)
				setHintMove(null)
				setHintMessage(null)
				return
			}

			if (selectedTube === index) {
				setSelectedTube(null)
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

			const nextStats = recordPour(hostRef.current.getStatistics())
			hostRef.current.setStatistics(nextStats)

			void hapticPour(hostRef.current.getSettings().hapticsEnabled)
			void playPourSound()
			startPourAnimation(
				move.from,
				move.to,
				hostRef.current.getSettings().animationSpeed,
			)

			if (isSolved(nextBoard)) {
				if (completionLockRef.current) {
					setIsPuzzleSolved(true)
					return
				}
				completionLockRef.current = true
				setIsPuzzleSolved(true)

				const before = hostRef.current.getDaily()
				const wasFirst = !isDailyCompletedOn(before, todayKey)
				const afterDaily = recordDailyCompletion(before, todayKey)
				publishDaily(afterDaily)

				const completed = recordDailyStatsCompletion(
					hostRef.current.getStatistics(),
					difficulty,
					{
						wasFirstCompletion: wasFirst,
						currentStreak: afterDaily.currentStreak,
						bestStreak: afterDaily.bestStreak,
					},
				)
				hostRef.current.setStatistics(completed)
				applyAchievementEvaluation(completed)
				trackEvent('daily_completed', {
					difficulty,
					date_key: todayKey,
					move_count: moveCount + 1,
					streak: afterDaily.currentStreak,
				})
				void maybeShowInterstitialAfterLevelCompleted({ isTutorial: false })
				void hapticSuccess(hostRef.current.getSettings().hapticsEnabled)
				void playWinSound()
			}
		},
		[
			applyAchievementEvaluation,
			currentBoard,
			difficulty,
			flashInvalid,
			isPuzzleSolved,
			moveCount,
			publishDaily,
			selectedTube,
			startPourAnimation,
			status,
			todayKey,
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
		attemptRef.current = { ...attemptRef.current, usedUndo: true }
		setAttempt(attemptRef.current)
		hostRef.current.setStatistics(recordUndoUsed(hostRef.current.getStatistics()))
		setMoveHistory(history)
		setCurrentBoard(previous)
		setMoveCount((count) => Math.max(0, count - 1))
		setSelectedTube(null)
		setHintMove(null)
		setHintMessage(null)
		setIsPuzzleSolved(false)
		completionLockRef.current = false
	}, [clearPourAnimation, moveHistory, showToast])

	const handleRestart = useCallback(() => {
		clearPourAnimation()
		attemptRef.current = {
			usedHint: false,
			usedUndo: false,
			usedRestart: true,
		}
		setAttempt(attemptRef.current)
		hostRef.current.setStatistics(
			recordRestartUsed(hostRef.current.getStatistics()),
		)
		completionLockRef.current = false
		setCurrentBoard(cloneBoard(initialBoard))
		setMoveHistory([])
		setMoveCount(0)
		setSelectedTube(null)
		setHintMove(null)
		setHintMessage(null)
		setIsPuzzleSolved(false)
	}, [clearPourAnimation, initialBoard])

	const shouldConfirmRestart = useCallback(() => moveCount > 0, [moveCount])

	const handleHint = useCallback(() => {
		puzzleHelp.requestHint()
	}, [puzzleHelp])

	const todaySession =
		dailySnapshot.session?.dateKey === todayKey
			? dailySnapshot.session
			: null
	const completedToday = isDailyCompletedOn(dailySnapshot, todayKey)
	const activeStreak = getActiveCurrentStreak(dailySnapshot, todayKey)

	return {
		status,
		todayKey,
		todayLabel: formatLocalDateRu(todayKey),
		difficulty,
		difficultyLabel: getDifficultyLabelRu(difficulty),
		activeStreak,
		bestStreak: dailySnapshot.bestStreak,
		completedToday,
		hasInProgressSession: Boolean(todaySession && !todaySession.isSolved),
		inProgressMoveCount: todaySession?.moveCount ?? 0,
		seed,
		initialBoard,
		currentBoard,
		moveCount,
		selectedTube,
		hintMove,
		hintMessage,
		invalidFlashIndex,
		pourAnimation,
		isSolved: isPuzzleSolved,
		canUndo: moveHistory.length > 0,
		toastMessage,
		pendingAchievementToast,
		historyCells: buildDailyHistory(
			todayKey,
			dailySnapshot.completedDateKeys,
			HISTORY_DAYS,
		),
		syncToday,
		startOrResumeToday,
		replayToday,
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
	}
}
