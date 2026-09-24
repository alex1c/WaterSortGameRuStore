import { useCallback, useEffect, useRef, useState } from 'react'

import {
	createFreePlayPuzzle,
	createFreePlaySeed,
	type FreePlayDifficulty,
	type FreePlaySeedFactory,
	type PersistedFreePlaySession,
	type PersistedFreePlayState,
} from '../freePlay'
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
	getPourAnimationMs,
	type AnimationSpeed,
	type GameSettings,
} from '../settings'
import {
	createFreshAttemptFlags,
	recordFreePlayCompletion,
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

export interface FreePlayPourAnimation {
	from: number
	to: number
	startedAt: number
	durationMs: number
}

export type FreePlayStatus = 'idle' | 'generating' | 'ready' | 'failed'

export interface FreePlayController {
	status: FreePlayStatus
	hasSavedSession: boolean
	savedDifficultyLabel: string | null
	savedMoveCount: number
	difficulty: FreePlayDifficulty | null
	difficultyLabel: string
	seed: string | null
	initialBoard: Board
	currentBoard: Board
	moveCount: number
	selectedTube: number | null
	hintMove: Move | null
	hintMessage: string | null
	invalidFlashIndex: number | null
	pourAnimation: FreePlayPourAnimation | null
	isSolved: boolean
	canUndo: boolean
	toastMessage: string | null
	pendingAchievementToast: AchievementId | null
	startNewPuzzle: (difficulty: FreePlayDifficulty) => void
	resumeSavedSession: () => boolean
	clearSavedSession: () => void
	acknowledgeAchievementToast: () => void
	handleTubePress: (index: number) => void
	handleUndo: () => void
	handleRestart: () => void
	shouldConfirmRestart: () => boolean
	handleHint: () => void
	startAnotherSameDifficulty: () => void
}

interface FreePlayHost {
	getSettings: () => GameSettings
	getStatistics: () => GameStatistics
	setStatistics: (stats: GameStatistics) => void
	getAchievements: () => AchievementState
	setAchievements: (state: AchievementState) => void
	getFreePlay: () => PersistedFreePlayState
	setFreePlay: (state: PersistedFreePlayState) => void
	initialFreePlay: PersistedFreePlayState
	seedFactory?: FreePlaySeedFactory
}

/**
 * Free Play gameplay controller.
 * Shares settings/statistics/achievements with Campaign via host accessors.
 * Boards are completely isolated from the Campaign session.
 */
export function useFreePlayGame(host: FreePlayHost): FreePlayController {
	const seedFactory = host.seedFactory ?? createFreePlaySeed
	const hostRef = useRef(host)
	const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const pourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const animatingRef = useRef(false)
	const completionLockRef = useRef(false)
	const generatingRef = useRef(false)
	const attemptRef = useRef<AttemptFlags>(
		host.initialFreePlay.session?.attempt ?? createFreshAttemptFlags(),
	)
	const seedCounterRef = useRef(host.initialFreePlay.seedCounter)
	const hydratedFromStorageRef = useRef(Boolean(host.initialFreePlay.session))

	const [status, setStatus] = useState<FreePlayStatus>(() =>
		host.initialFreePlay.session ? 'ready' : 'idle',
	)
	const [seedCounter, setSeedCounter] = useState(
		host.initialFreePlay.seedCounter,
	)
	const [sessionMeta, setSessionMeta] = useState<PersistedFreePlaySession | null>(
		host.initialFreePlay.session,
	)
	const [difficulty, setDifficulty] = useState<FreePlayDifficulty | null>(
		host.initialFreePlay.session?.difficulty ?? null,
	)
	const [seed, setSeed] = useState<string | null>(
		host.initialFreePlay.session?.seed ?? null,
	)
	const [initialBoard, setInitialBoard] = useState<Board>(
		host.initialFreePlay.session
			? cloneBoard(host.initialFreePlay.session.initialBoard)
			: [],
	)
	const [currentBoard, setCurrentBoard] = useState<Board>(
		host.initialFreePlay.session
			? cloneBoard(host.initialFreePlay.session.currentBoard)
			: [],
	)
	const [moveHistory, setMoveHistory] = useState<Board[]>(
		host.initialFreePlay.session
			? host.initialFreePlay.session.moveHistory.map(cloneBoard)
			: [],
	)
	const [moveCount, setMoveCount] = useState(
		host.initialFreePlay.session?.moveCount ?? 0,
	)
	const [selectedTube, setSelectedTube] = useState<number | null>(null)
	const [hintMove, setHintMove] = useState<Move | null>(null)
	const [hintMessage, setHintMessage] = useState<string | null>(null)
	const [invalidFlashIndex, setInvalidFlashIndex] = useState<number | null>(null)
	const [pourAnimation, setPourAnimation] =
		useState<FreePlayPourAnimation | null>(null)
	const [isPuzzleSolved, setIsPuzzleSolved] = useState(
		host.initialFreePlay.session?.isSolved ?? false,
	)
	const [attempt, setAttempt] = useState<AttemptFlags>(
		host.initialFreePlay.session?.attempt ?? createFreshAttemptFlags(),
	)
	const [toastMessage, setToastMessage] = useState<string | null>(null)
	const [pendingAchievementToast, setPendingAchievementToast] =
		useState<AchievementId | null>(null)

	useEffect(() => {
		hostRef.current = host
	}, [host])

	useEffect(() => {
		attemptRef.current = attempt
	}, [attempt])

	useEffect(() => {
		seedCounterRef.current = seedCounter
	}, [seedCounter])

	useEffect(() => {
		if (hydratedFromStorageRef.current) return
		const saved = host.initialFreePlay.session
		if (!saved) return
		hydratedFromStorageRef.current = true
		/* One-shot AsyncStorage hydrate into Free Play local state. */
		queueMicrotask(() => {
			setSessionMeta(saved)
			setSeedCounter(host.initialFreePlay.seedCounter)
			seedCounterRef.current = host.initialFreePlay.seedCounter
			setDifficulty(saved.difficulty)
			setSeed(saved.seed)
			setInitialBoard(cloneBoard(saved.initialBoard))
			setCurrentBoard(cloneBoard(saved.currentBoard))
			setMoveHistory(saved.moveHistory.map(cloneBoard))
			setMoveCount(saved.moveCount)
			setAttempt(saved.attempt)
			attemptRef.current = saved.attempt
			setIsPuzzleSolved(saved.isSolved)
			setStatus('ready')
		})
	}, [host.initialFreePlay])

	const showToast = useCallback((message: string) => {
		if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
		setToastMessage(message)
		toastTimerRef.current = setTimeout(() => {
			setToastMessage(null)
			toastTimerRef.current = null
		}, 2200)
	}, [])

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

	const publishSession = useCallback(
		(nextSession: PersistedFreePlaySession | null, nextCounter: number) => {
			const blob: PersistedFreePlayState = {
				seedCounter: nextCounter,
				session: nextSession,
			}
			hostRef.current.setFreePlay(blob)
			setSessionMeta(nextSession)
			setSeedCounter(nextCounter)
			seedCounterRef.current = nextCounter
		},
		[],
	)

	const hydratePuzzle = useCallback(
		(
			nextDifficulty: FreePlayDifficulty,
			nextSeed: string,
			board: Board,
			options?: {
				currentBoard?: Board
				moveHistory?: Board[]
				moveCount?: number
				attempt?: AttemptFlags
				isSolved?: boolean
			},
		) => {
			clearPourAnimation()
			completionLockRef.current = false
			const start = cloneBoard(board)
			const current = options?.currentBoard
				? cloneBoard(options.currentBoard)
				: cloneBoard(start)
			const nextAttempt = options?.attempt
				? { ...options.attempt }
				: createFreshAttemptFlags()
			attemptRef.current = nextAttempt
			setAttempt(nextAttempt)
			setDifficulty(nextDifficulty)
			setSeed(nextSeed)
			setInitialBoard(start)
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
		},
		[clearPourAnimation],
	)

	const startNewPuzzle = useCallback(
		(nextDifficulty: FreePlayDifficulty) => {
			if (generatingRef.current) return
			generatingRef.current = true
			setStatus('generating')
			trackEvent('free_play_started', { difficulty: nextDifficulty })

			const nextCounter = seedCounterRef.current + 1
			const nextSeed = seedFactory(nextCounter, nextDifficulty)
			const result = createFreePlayPuzzle(nextDifficulty, nextSeed)
			generatingRef.current = false

			if (!result.ok) {
				setStatus('failed')
				publishSession(null, nextCounter)
				return
			}

			hydratePuzzle(nextDifficulty, nextSeed, result.level.board)
			publishSession(
				{
					difficulty: nextDifficulty,
					seed: nextSeed,
					initialBoard: cloneBoard(result.level.board),
					currentBoard: cloneBoard(result.level.board),
					moveHistory: [],
					moveCount: 0,
					attempt: createFreshAttemptFlags(),
					isSolved: false,
				},
				nextCounter,
			)
		},
		[hydratePuzzle, publishSession, seedFactory],
	)

	const resumeSavedSession = useCallback((): boolean => {
		const saved = hostRef.current.getFreePlay().session
		if (!saved) return false
		hydratePuzzle(saved.difficulty, saved.seed, saved.initialBoard, {
			currentBoard: saved.currentBoard,
			moveHistory: saved.moveHistory,
			moveCount: saved.moveCount,
			attempt: saved.attempt,
			isSolved: saved.isSolved,
		})
		return true
	}, [hydratePuzzle])

	const clearSavedSession = useCallback(() => {
		publishSession(null, seedCounterRef.current)
		setDifficulty(null)
		setSeed(null)
		setInitialBoard([])
		setCurrentBoard([])
		setMoveHistory([])
		setMoveCount(0)
		setIsPuzzleSolved(false)
		setStatus('idle')
	}, [publishSession])

	const persistLiveSession = useCallback(
		(patch: Partial<PersistedFreePlaySession>) => {
			const current = hostRef.current.getFreePlay().session
			if (!current) return
			publishSession({ ...current, ...patch }, seedCounterRef.current)
		},
		[publishSession],
	)

	useEffect(() => {
		if (status !== 'ready' || !difficulty || !seed || initialBoard.length === 0) {
			return
		}
		persistLiveSession({
			difficulty,
			seed,
			initialBoard: cloneBoard(initialBoard),
			currentBoard: cloneBoard(currentBoard),
			moveHistory: moveHistory.map(cloneBoard),
			moveCount,
			attempt: attemptRef.current,
			isSolved: isPuzzleSolved,
		})
	}, [
		status,
		difficulty,
		seed,
		initialBoard,
		currentBoard,
		moveHistory,
		moveCount,
		isPuzzleSolved,
		attempt,
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

				if (difficulty) {
					const completed = recordFreePlayCompletion(
						hostRef.current.getStatistics(),
						difficulty,
					)
					hostRef.current.setStatistics(completed)
					applyAchievementEvaluation(completed)
					trackEvent('free_play_completed', {
						difficulty,
						move_count: moveCount + 1,
					})
					void maybeShowInterstitialAfterLevelCompleted({ isTutorial: false })
				}
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
			selectedTube,
			startPourAnimation,
			status,
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
		if (isPuzzleSolved || isSolved(currentBoard)) {
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
			hostRef.current.setStatistics(
				recordHintUsed(hostRef.current.getStatistics()),
			)
			setHintMessage('Перелейте отсюда → сюда')
		} catch {
			showToast('Подсказка недоступна')
			setHintMove(null)
			setHintMessage(null)
		}
	}, [currentBoard, isPuzzleSolved, showToast])

	const startAnotherSameDifficulty = useCallback(() => {
		if (!difficulty) return
		startNewPuzzle(difficulty)
	}, [difficulty, startNewPuzzle])

	const saved = sessionMeta

	return {
		status,
		hasSavedSession: Boolean(saved && !saved.isSolved),
		savedDifficultyLabel: saved
			? getDifficultyLabelRu(saved.difficulty)
			: null,
		savedMoveCount: saved?.moveCount ?? 0,
		difficulty,
		difficultyLabel: difficulty ? getDifficultyLabelRu(difficulty) : '',
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
		startNewPuzzle,
		resumeSavedSession,
		clearSavedSession,
		acknowledgeAchievementToast,
		handleTubePress,
		handleUndo,
		handleRestart,
		shouldConfirmRestart,
		handleHint,
		startAnotherSameDifficulty,
	}
}
