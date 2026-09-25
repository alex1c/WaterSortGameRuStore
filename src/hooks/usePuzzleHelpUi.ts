import { useCallback, useEffect, useRef, useState } from 'react'

import type { HelpDialogKind } from '../components/HelpSheet'
import { trackEvent } from '../analytics'
import { REWARDED_LIFECYCLE_FAILSAFE_MS } from '../ads'
import type { Board, Move } from '../game'
import {
	applyExtraTubeToSessionBoards,
	buildRestartBoard,
	canGrantExtraTube,
	canUseHint,
	consumeSuccessfulHint,
	createInitialPuzzleHelpState,
	findHintMoveAsync,
	grantExtraTube,
	grantRewardedHintPack,
	hintFailureMessage,
	runVerifiedRewardedAction,
	type PuzzleHelpState,
} from '../help'

export type HelpMode = 'campaign' | 'free_play' | 'daily'

export interface PuzzleHelpUiController {
	help: PuzzleHelpState
	helpSheetVisible: boolean
	helpDialog: HelpDialogKind
	hintSearching: boolean
	rewardLoading: boolean
	openHelpSheet: () => void
	closeHelpSheet: () => void
	requestHint: () => void
	requestExtraTubeOffer: () => void
	confirmHintPack: () => void
	confirmExtraTube: () => void
	cancelHelpDialog: () => void
	resetHelp: (next?: PuzzleHelpState) => void
	restoreHelp: (next: PuzzleHelpState) => void
	getHelp: () => PuzzleHelpState
	restartBoardFromOriginal: (original: Board) => Board
}

/**
 * Shared voluntary-help UI/state for Campaign, Free Play, and Daily.
 *
 * Hint credits are consumed only after a valid solver-backed move is shown.
 * Rewarded grants happen only inside the verified SDK callback path.
 */
export function usePuzzleHelpUi(options: {
	mode: HelpMode
	getDifficulty: () => string
	getBoard: () => Board
	getOriginalBoard: () => Board
	getMoveHistory: () => Board[]
	isPuzzleSolved: () => boolean
	showToast: (message: string) => void
	onHintMove: (move: Move) => void
	onBoardsAssisted: (next: {
		currentBoard: Board
		moveHistory: Board[]
		restartBoard: Board
	}) => void
}): PuzzleHelpUiController {
	const [help, setHelp] = useState<PuzzleHelpState>(createInitialPuzzleHelpState)
	const [helpSheetVisible, setHelpSheetVisible] = useState(false)
	const [helpDialog, setHelpDialog] = useState<HelpDialogKind>(null)
	const [hintSearching, setHintSearching] = useState(false)
	const [rewardLoading, setRewardLoading] = useState(false)

	const helpRef = useRef(help)
	const searchingRef = useRef(false)
	const rewardBusyRef = useRef(false)
	const rewardBusyStartedAtRef = useRef<number | null>(null)
	const optionsRef = useRef(options)

	useEffect(() => {
		helpRef.current = help
	}, [help])

	useEffect(() => {
		optionsRef.current = options
	}, [options])

	const clearRewardBusy = useCallback(() => {
		rewardBusyRef.current = false
		rewardBusyStartedAtRef.current = null
		setRewardLoading(false)
	}, [])

	const beginRewardBusy = useCallback(() => {
		rewardBusyRef.current = true
		rewardBusyStartedAtRef.current = Date.now()
		setRewardLoading(true)
	}, [])

	/**
	 * True while a native rewarded flow is active.
	 * If busy somehow outlives the ads fail-safe, unlock the sheet so Back works.
	 */
	const isRewardBusy = useCallback(() => {
		if (!rewardBusyRef.current) return false
		const started = rewardBusyStartedAtRef.current
		if (
			started !== null &&
			Date.now() - started > REWARDED_LIFECYCLE_FAILSAFE_MS + 5_000
		) {
			clearRewardBusy()
			return false
		}
		return true
	}, [clearRewardBusy])

	const resetHelp = useCallback((next?: PuzzleHelpState) => {
		const value = next ?? createInitialPuzzleHelpState()
		helpRef.current = value
		setHelp(value)
	}, [])

	const restoreHelp = useCallback((next: PuzzleHelpState) => {
		helpRef.current = next
		setHelp(next)
	}, [])

	const getHelp = useCallback(() => helpRef.current, [])

	const restartBoardFromOriginal = useCallback((original: Board) => {
		return buildRestartBoard(original, helpRef.current.extraTubeGranted)
	}, [])

	const openHelpSheet = useCallback(() => {
		if (optionsRef.current.isPuzzleSolved()) return
		setHelpDialog('menu')
		setHelpSheetVisible(true)
	}, [])

	const closeHelpSheet = useCallback(() => {
		if (isRewardBusy()) return
		setHelpSheetVisible(false)
		setHelpDialog(null)
	}, [isRewardBusy])

	const cancelHelpDialog = useCallback(() => {
		if (isRewardBusy()) return
		setHelpDialog('menu')
	}, [isRewardBusy])

	const applyValidHint = useCallback((move: Move) => {
		const nextHelp = consumeSuccessfulHint(helpRef.current)
		helpRef.current = nextHelp
		setHelp(nextHelp)
		optionsRef.current.onHintMove(move)
		trackEvent('hint_provided', {
			mode: optionsRef.current.mode,
			difficulty: optionsRef.current.getDifficulty(),
		})
	}, [])

	const runHintSearch = useCallback(async () => {
		if (searchingRef.current || rewardBusyRef.current) return
		const opts = optionsRef.current
		if (opts.isPuzzleSolved()) {
			opts.showToast('Уровень уже решён')
			return
		}
		if (!canUseHint(helpRef.current)) {
			trackEvent('rewarded_hint_offer', {
				mode: opts.mode,
				difficulty: opts.getDifficulty(),
			})
			setHelpDialog('hint_pack_offer')
			setHelpSheetVisible(true)
			return
		}

		searchingRef.current = true
		setHintSearching(true)
		opts.showToast('Ищем подсказку…')

		try {
			const board = opts.getBoard()
			const result = await findHintMoveAsync(board, {
				onSearchingStronger: () => {
					opts.showToast('Ищем подсказку…')
				},
			})
			if (result.status === 'found' && result.move) {
				applyValidHint(result.move)
				setHelpSheetVisible(false)
				setHelpDialog(null)
			} else {
				opts.showToast(hintFailureMessage(result.status))
			}
		} catch {
			opts.showToast(
				'Из этой позиции решение не найдено. Попробуйте отменить несколько ходов.',
			)
		} finally {
			searchingRef.current = false
			setHintSearching(false)
		}
	}, [applyValidHint])

	const requestHint = useCallback(() => {
		void runHintSearch()
	}, [runHintSearch])

	const requestExtraTubeOffer = useCallback(() => {
		const opts = optionsRef.current
		if (opts.isPuzzleSolved()) return
		if (!canGrantExtraTube(helpRef.current)) {
			opts.showToast('Дополнительная пробирка добавлена')
			return
		}
		trackEvent('rewarded_extra_tube_offer', {
			mode: opts.mode,
			difficulty: opts.getDifficulty(),
		})
		setHelpDialog('extra_tube_confirm')
		setHelpSheetVisible(true)
	}, [])

	const confirmHintPack = useCallback(() => {
		if (isRewardBusy() || searchingRef.current) return
		const opts = optionsRef.current
		beginRewardBusy()

		void (async () => {
			try {
				let granted = false
				const result = await runVerifiedRewardedAction(() => {
					const next = grantRewardedHintPack(helpRef.current)
					helpRef.current = next
					setHelp(next)
					granted = true
					trackEvent('rewarded_hint_granted', {
						mode: opts.mode,
						difficulty: opts.getDifficulty(),
					})
				})
				if (result === 'granted' && granted) {
					opts.showToast('Получено: 3 подсказки')
					setHelpDialog('menu')
					clearRewardBusy()
					// After grant, fulfill the original hint if a credit remains.
					await runHintSearch()
					return
				}
				opts.showToast('Реклама сейчас недоступна. Попробуйте позже.')
				setHelpDialog('menu')
			} finally {
				clearRewardBusy()
			}
		})()
	}, [beginRewardBusy, clearRewardBusy, isRewardBusy, runHintSearch])

	const confirmExtraTube = useCallback(() => {
		if (isRewardBusy() || searchingRef.current) return
		const opts = optionsRef.current
		if (!canGrantExtraTube(helpRef.current)) {
			opts.showToast('Дополнительная пробирка добавлена')
			setHelpDialog('menu')
			return
		}
		beginRewardBusy()

		void (async () => {
			try {
				let granted = false
				const result = await runVerifiedRewardedAction(() => {
					if (!canGrantExtraTube(helpRef.current)) return
					const nextHelp = grantExtraTube(helpRef.current)
					helpRef.current = nextHelp
					setHelp(nextHelp)
					const assisted = applyExtraTubeToSessionBoards({
						currentBoard: opts.getBoard(),
						moveHistory: opts.getMoveHistory(),
					})
					opts.onBoardsAssisted({
						currentBoard: assisted.currentBoard,
						moveHistory: assisted.moveHistory,
						restartBoard: buildRestartBoard(opts.getOriginalBoard(), true),
					})
					granted = true
					trackEvent('rewarded_extra_tube_granted', {
						mode: opts.mode,
						difficulty: opts.getDifficulty(),
					})
				})
				if (result === 'granted' && granted) {
					opts.showToast('Добавлена пустая пробирка')
					setHelpSheetVisible(false)
					setHelpDialog(null)
				} else {
					opts.showToast('Реклама сейчас недоступна. Попробуйте позже.')
					setHelpDialog('menu')
				}
			} finally {
				clearRewardBusy()
			}
		})()
	}, [beginRewardBusy, clearRewardBusy, isRewardBusy])

	return {
		help,
		helpSheetVisible,
		helpDialog,
		hintSearching,
		rewardLoading,
		openHelpSheet,
		closeHelpSheet,
		requestHint,
		requestExtraTubeOffer,
		confirmHintPack,
		confirmExtraTube,
		cancelHelpDialog,
		resetHelp,
		restoreHelp,
		getHelp,
		restartBoardFromOriginal,
	}
}
