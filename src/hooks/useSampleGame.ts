import { useCallback, useRef, useState } from 'react'

import {
	cloneBoard,
	createInitialSampleBoard,
	tryPour,
} from '../game/sampleLogic'
import type { Board } from '../game/types'

/**
 * Local UI state for the Phase 1 sample board.
 * Encapsulates selection, undo stack, restart, and invalid-move flash
 * so GameScreen stays mostly presentational.
 */
export function useSampleGame() {
	const [board, setBoard] = useState<Board>(() => createInitialSampleBoard())
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
	const [invalidFlashIndex, setInvalidFlashIndex] = useState<number | null>(null)
	const [hasCompletedMove, setHasCompletedMove] = useState(false)
	const [hintMessage, setHintMessage] = useState<string | null>(null)

	// Undo stack stores previous boards after each successful pour.
	const historyRef = useRef<Board[]>([])
	const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const clearFlashTimer = useCallback(() => {
		if (flashTimerRef.current) {
			clearTimeout(flashTimerRef.current)
			flashTimerRef.current = null
		}
	}, [])

	const flashInvalid = useCallback(
		(tubeIndex: number) => {
			clearFlashTimer()
			setInvalidFlashIndex(tubeIndex)
			flashTimerRef.current = setTimeout(() => {
				setInvalidFlashIndex(null)
				flashTimerRef.current = null
			}, 220)
		},
		[clearFlashTimer],
	)

	const showTemporaryHint = useCallback((message: string) => {
		if (hintTimerRef.current) {
			clearTimeout(hintTimerRef.current)
		}
		setHintMessage(message)
		hintTimerRef.current = setTimeout(() => {
			setHintMessage(null)
			hintTimerRef.current = null
		}, 2200)
	}, [])

	const handleTubePress = useCallback(
		(index: number) => {
			// First tap selects a non-empty source tube.
			if (selectedIndex === null) {
				const tube = board[index]
				if (!tube || tube.length === 0) {
					flashInvalid(index)
					return
				}
				setSelectedIndex(index)
				return
			}

			// Tapping the same tube cancels selection.
			if (selectedIndex === index) {
				setSelectedIndex(null)
				return
			}

			const result = tryPour(board, selectedIndex, index)
			if (!result) {
				flashInvalid(index)
				setSelectedIndex(null)
				return
			}

			historyRef.current.push(cloneBoard(board))
			setBoard(result.board)
			setSelectedIndex(null)
			setHasCompletedMove(true)
		},
		[board, flashInvalid, selectedIndex],
	)

	const handleUndo = useCallback(() => {
		const previous = historyRef.current.pop()
		if (!previous) {
			showTemporaryHint('Нечего отменять')
			return
		}
		setBoard(previous)
		setSelectedIndex(null)
		setInvalidFlashIndex(null)
	}, [showTemporaryHint])

	const handleRestart = useCallback(() => {
		historyRef.current = []
		setBoard(createInitialSampleBoard())
		setSelectedIndex(null)
		setInvalidFlashIndex(null)
		setHasCompletedMove(false)
		setHintMessage(null)
	}, [])

	const handleHintPress = useCallback(() => {
		// Solver arrives in a later phase — UI affordance only for now.
		showTemporaryHint('Подсказки появятся позже')
	}, [showTemporaryHint])

	return {
		board,
		selectedIndex,
		invalidFlashIndex,
		hasCompletedMove,
		hintMessage,
		handleTubePress,
		handleUndo,
		handleRestart,
		handleHintPress,
	}
}
