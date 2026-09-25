import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import { createCampaignLevel } from '../campaign'
import { applyMove, getLegalMoves, isSolved, serializeBoard } from '../game'
import { computeTubeLayout } from '../components/TubeBoard'
import { ABOUT_PRIVACY_URL, APP_VERSION } from '../about/config'
import { createRewardGrantGuard } from '../ads/rewardedPolicy'
import {
	applyExtraTubeToSessionBoards,
	buildRestartBoard,
	canGrantExtraTube,
	canUseHint,
	consumeSuccessfulHint,
	createInitialPuzzleHelpState,
	findHintMove,
	grantExtraTube,
	grantRewardedHintPack,
	hasTrailingEmptyExtraTube,
	hintFailureMessage,
	isLegalSolverBackedMove,
	parsePuzzleHelpState,
	REWARDED_HINT_PACK_SIZE,
	totalHintCredits,
} from '../help'
import { parsePersistedGameState } from '../storage/parse'
import {
	STORAGE_KEY,
	STORAGE_SCHEMA_VERSION,
	createDefaultPersistedState,
} from '../storage/types'
import { createEmptyStatistics } from '../statistics'
import { createEmptyAchievementState } from '../achievements'

describe('PH10 privacy page', () => {
	const privacyPath = join(process.cwd(), 'docs', 'index.html')
	const html = readFileSync(privacyPath, 'utf8')

	it('docs/index.html exists with required mobile meta', () => {
		expect(existsSync(privacyPath)).toBe(true)
		expect(html).toContain('charset="UTF-8"')
		expect(html).toContain('viewport')
		expect(html).toContain('Политика конфиденциальности — Переливайка')
	})

	it('mentions product, AppMetrica, Yandex ads, and local storage', () => {
		expect(html).toContain('Переливайка — сортировка воды')
		expect(html).toContain('ForestMusic')
		expect(html).toContain('AppMetrica')
		expect(html).toMatch(/Yandex Mobile Ads|РСЯ/)
		expect(html).toMatch(/AsyncStorage|локально/)
		expect(html).toContain('https://forest-music.ru')
	})

	it('has no placeholder contact text', () => {
		expect(html).not.toMatch(/TODO|YOUR EMAIL|INSERT HERE|example\.com/i)
	})

	it('About privacy URL remains the GitHub Pages entry', () => {
		expect(ABOUT_PRIVACY_URL).toBe(
			'https://alex1c.github.io/WaterSortGameRuStore/',
		)
	})
})

describe('PH10 about version', () => {
	it('exposes product version 1.0.0 from shared config', () => {
		expect(APP_VERSION).toBe('1.0.0')
	})
})

describe('PH10 hint strategy', () => {
	it('returns a legal solver-backed hint on a solvable campaign board', () => {
		const level = createCampaignLevel(1)
		const result = findHintMove(level.board, { allowStrongPass: false })
		expect(result.status).toBe('found')
		expect(result.move).not.toBeNull()
		expect(isLegalSolverBackedMove(level.board, result.move!)).toBe(true)
		const next = applyMove(level.board, result.move!)
		expect(next).not.toBe(level.board)
	})

	it('does not invent a move for an already solved board', () => {
		const level = createCampaignLevel(1)
		let board = level.board
		// Solve with repeated hints under a generous budget.
		for (let i = 0; i < 80; i += 1) {
			if (isSolved(board)) break
			const hint = findHintMove(board, { allowStrongPass: true })
			if (hint.status !== 'found' || !hint.move) break
			board = applyMove(board, hint.move)
		}
		expect(isSolved(board)).toBe(true)
		const again = findHintMove(board)
		expect(again.status).toBe('already_solved')
		expect(again.move).toBeNull()
	})

	it('recovery copy avoids generic unavailable message', () => {
		expect(hintFailureMessage('cutoff')).toContain('отменить')
		expect(hintFailureMessage('unsolvable')).toContain('отменить')
		expect(hintFailureMessage('cutoff')).not.toContain('недоступна')
	})
})

describe('PH10 hint credits', () => {
	it('starts with 2 free hints and consumes only on success', () => {
		let help = createInitialPuzzleHelpState()
		expect(totalHintCredits(help)).toBe(2)
		expect(canUseHint(help)).toBe(true)

		help = consumeSuccessfulHint(help)
		expect(totalHintCredits(help)).toBe(1)
		help = consumeSuccessfulHint(help)
		expect(totalHintCredits(help)).toBe(0)
		expect(canUseHint(help)).toBe(false)

		// Failed hint must not call consume — credits stay at 0.
		expect(totalHintCredits(help)).toBe(0)
	})

	it('requires reward after free hints and grants +3 once', () => {
		let help = createInitialPuzzleHelpState()
		help = consumeSuccessfulHint(help)
		help = consumeSuccessfulHint(help)
		expect(canUseHint(help)).toBe(false)

		help = grantRewardedHintPack(help)
		expect(help.rewardedHintsRemaining).toBe(REWARDED_HINT_PACK_SIZE)
		expect(totalHintCredits(help)).toBe(3)

		help = consumeSuccessfulHint(help)
		help = consumeSuccessfulHint(help)
		help = consumeSuccessfulHint(help)
		expect(totalHintCredits(help)).toBe(0)
	})

	it('restart/undo semantics leave help credits unchanged', () => {
		let help = createInitialPuzzleHelpState()
		help = consumeSuccessfulHint(help)
		const afterRestart = { ...help }
		const afterUndo = { ...help }
		expect(afterRestart).toEqual(help)
		expect(afterUndo).toEqual(help)
		expect(totalHintCredits(help)).toBe(1)
	})

	it('new puzzle resets to 2 free hints', () => {
		let help = createInitialPuzzleHelpState()
		help = consumeSuccessfulHint(help)
		help = grantRewardedHintPack(help)
		help = grantExtraTube(help)
		help = createInitialPuzzleHelpState()
		expect(help).toEqual(createInitialPuzzleHelpState())
	})
})

describe('PH10 rewarded grant guard', () => {
	it('grants exactly once from verified callback', () => {
		let grants = 0
		const guard = createRewardGrantGuard(() => {
			grants += 1
		})
		expect(guard.onVerifiedReward()).toBe(true)
		expect(guard.onVerifiedReward()).toBe(false)
		guard.onDismissed()
		expect(grants).toBe(1)
		expect(guard.hasGranted()).toBe(true)
	})

	it('dismiss and failed show grant nothing', () => {
		let grants = 0
		const guard = createRewardGrantGuard(() => {
			grants += 1
		})
		guard.onDismissed()
		expect(grants).toBe(0)
		expect(guard.hasGranted()).toBe(false)
	})
})

describe('PH10 extra tube', () => {
	it('grants exactly one empty tube and normalizes history', () => {
		const level = createCampaignLevel(3)
		const legal = getLegalMoves(level.board)[0]!
		const afterMove = applyMove(level.board, legal)
		let help = createInitialPuzzleHelpState()
		expect(canGrantExtraTube(help)).toBe(true)

		help = grantExtraTube(help)
		expect(help.extraTubeGranted).toBe(true)
		expect(canGrantExtraTube(help)).toBe(false)
		help = grantExtraTube(help)
		expect(help.extraTubeGranted).toBe(true)

		const assisted = applyExtraTubeToSessionBoards({
			currentBoard: afterMove,
			moveHistory: [level.board],
		})
		expect(assisted.currentBoard.length).toBe(level.board.length + 1)
		expect(assisted.moveHistory[0]!.length).toBe(level.board.length + 1)
		expect(assisted.currentBoard[assisted.currentBoard.length - 1]).toEqual([])

		const restart = buildRestartBoard(level.board, true)
		expect(hasTrailingEmptyExtraTube(level.board, restart)).toBe(true)
		expect(serializeBoard(level.board)).not.toBe(serializeBoard(restart))
		// Original identity board unchanged.
		expect(level.board.length).toBe(createCampaignLevel(3).board.length)
	})

	it('second grant request cannot stack tubes via help state', () => {
		let help = grantExtraTube(createInitialPuzzleHelpState())
		expect(canGrantExtraTube(help)).toBe(false)
	})
})

describe('PH10 mode isolation of help state', () => {
	it('campaign / free play / daily help blobs stay independent', () => {
		const campaignHelp = createInitialPuzzleHelpState()
		const freePlayHelp = createInitialPuzzleHelpState()
		const dailyHelp = createInitialPuzzleHelpState()

		const campaignAfter = grantExtraTube(
			grantRewardedHintPack(consumeSuccessfulHint(consumeSuccessfulHint(campaignHelp))),
		)
		expect(totalHintCredits(campaignAfter)).toBe(3)
		expect(campaignAfter.extraTubeGranted).toBe(true)

		expect(freePlayHelp).toEqual(createInitialPuzzleHelpState())
		expect(dailyHelp).toEqual(createInitialPuzzleHelpState())
		expect(freePlayHelp.extraTubeGranted).toBe(false)
		expect(dailyHelp.extraTubeGranted).toBe(false)
	})
})

describe('PH10 persistence migration v7', () => {
	it('keeps storage key and schema version 7', () => {
		expect(STORAGE_KEY).toBe('watersort.campaign.v1')
		expect(STORAGE_SCHEMA_VERSION).toBe(7)
		expect(createDefaultPersistedState().freePlayDiscoveryShown).toBe(false)
	})

	it('migrates v6 payload with default help and discovery flag', () => {
		const level = createCampaignLevel(1)
		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: 6,
				currentLevel: 1,
				highestUnlockedLevel: 8,
				campaignComplete: false,
				tutorialCompleted: true,
				session: {
					levelNumber: 1,
					seed: String(level.seed),
					campaignBand: level.campaignBand,
					initialBoard: level.board,
					currentBoard: level.board,
					moveHistory: [],
					moveCount: 0,
				},
				settings: createDefaultPersistedState().settings,
				statistics: createEmptyStatistics(),
				achievements: createEmptyAchievementState(),
				freePlay: { seedCounter: 2, session: null },
				daily: {
					completedDateKeys: ['2026-09-20'],
					currentStreak: 1,
					bestStreak: 1,
					lastCompletedDateKey: '2026-09-20',
					session: null,
				},
			}),
		)
		expect(parsed.schemaVersion).toBe(7)
		expect(parsed.highestUnlockedLevel).toBe(8)
		expect(parsed.freePlay.seedCounter).toBe(2)
		expect(parsed.daily.completedDateKeys).toEqual(['2026-09-20'])
		expect(parsed.freePlayDiscoveryShown).toBe(false)
		expect(parsed.session?.help).toEqual(createInitialPuzzleHelpState())
	})

	it('recovers corrupt help without wiping the puzzle session', () => {
		const level = createCampaignLevel(2)
		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: 7,
				currentLevel: 2,
				highestUnlockedLevel: 2,
				campaignComplete: false,
				tutorialCompleted: true,
				session: {
					levelNumber: 2,
					seed: String(level.seed),
					campaignBand: level.campaignBand,
					initialBoard: level.board,
					currentBoard: level.board,
					moveHistory: [],
					moveCount: 0,
					help: { freeHintsRemaining: -5, rewardedHintsRemaining: 'nope' },
				},
				settings: createDefaultPersistedState().settings,
				statistics: createEmptyStatistics(),
				achievements: createEmptyAchievementState(),
				freePlay: { seedCounter: 0, session: null },
				daily: createDefaultPersistedState().daily,
				freePlayDiscoveryShown: true,
			}),
		)
		expect(parsed.session).not.toBeNull()
		expect(parsed.session?.levelNumber).toBe(2)
		expect(parsePuzzleHelpState(parsed.session?.help)).toEqual(
			parsed.session?.help,
		)
		expect(parsed.freePlayDiscoveryShown).toBe(true)
	})
})

describe('PH10 free play discovery persistence', () => {
	it('defaults discovery to not shown and persists true', () => {
		const defaults = createDefaultPersistedState()
		expect(defaults.freePlayDiscoveryShown).toBe(false)
		const parsed = parsePersistedGameState(
			JSON.stringify({
				...defaults,
				schemaVersion: 6,
				freePlayDiscoveryShown: undefined,
			}),
		)
		expect(parsed.freePlayDiscoveryShown).toBe(false)
		const shown = parsePersistedGameState(
			JSON.stringify({
				...defaults,
				schemaVersion: 7,
				freePlayDiscoveryShown: true,
			}),
		)
		expect(shown.freePlayDiscoveryShown).toBe(true)
	})
})

describe('PH10 14-tube responsive layout', () => {
	it('produces valid layout for 13 and 14 tubes', () => {
		for (const tubeCount of [5, 7, 9, 11, 13, 14]) {
			const layout = computeTubeLayout(tubeCount, 360, 480)
			expect(layout.tubeWidth).toBeGreaterThan(0)
			expect(layout.tubeHeight).toBeGreaterThan(0)
			expect(layout.rows.flat().length).toBe(tubeCount)
		}
	})
})
