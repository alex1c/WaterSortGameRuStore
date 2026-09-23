import { createCampaignLevel, createPlaySession, tapTube, undoMove } from '../campaign'
import { getLegalMoves, isSolved } from '../game'
import {
	createDefaultPersistedState,
	STORAGE_SCHEMA_VERSION,
} from '../storage/types'
import { parsePersistedGameState } from '../storage/parse'

describe('persisted game state', () => {
	it('round-trips a mid-level session payload', () => {
		const level = createCampaignLevel(1)
		const legal = getLegalMoves(level.board)[0]!
		let session = createPlaySession(level.board)
		session = tapTube(session, legal.from).session
		session = tapTube(session, legal.to).session
		const payload = {
			schemaVersion: STORAGE_SCHEMA_VERSION,
			currentLevel: 4,
			highestUnlockedLevel: 7,
			campaignComplete: false,
			tutorialCompleted: false,
			session: {
				levelNumber: 1,
				seed: String(level.seed),
				campaignBand: level.campaignBand,
				initialBoard: session.initialBoard,
				currentBoard: session.currentBoard,
				moveHistory: session.moveHistory,
				moveCount: session.moveCount,
			},
		}
		const parsed = parsePersistedGameState(JSON.stringify(payload))
		expect(parsed.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(parsed.currentLevel).toBe(4)
		expect(parsed.highestUnlockedLevel).toBe(7)
		expect(parsed.session?.initialBoard).toEqual(session.initialBoard)
		expect(parsed.session?.currentBoard).toEqual(session.currentBoard)
		expect(parsed.session?.moveCount).toBe(1)
		expect(parsed.session?.moveHistory).toEqual(session.moveHistory)

		const restored = {
			...session,
			initialBoard: parsed.session!.initialBoard,
			currentBoard: parsed.session!.currentBoard,
			moveHistory: parsed.session!.moveHistory,
			moveCount: parsed.session!.moveCount,
			selectedTube: null,
			hintMove: null,
			isSolved: isSolved(parsed.session!.currentBoard),
		}
		const undone = undoMove(restored)
		expect(undone.currentBoard).toEqual(level.board)
		expect(undone.moveCount).toBe(0)
		expect(parsed.tutorialCompleted).toBe(false)
	}, 20_000)

	it('falls back safely on corrupt JSON', () => {
		expect(parsePersistedGameState('{not-json')).toEqual(createDefaultPersistedState())
		expect(parsePersistedGameState('null')).toEqual(createDefaultPersistedState())
		expect(parsePersistedGameState(JSON.stringify({ schemaVersion: 999 }))).toEqual(
			createDefaultPersistedState(),
		)
	})

	it('rejects incomplete session objects without crashing', () => {
		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: STORAGE_SCHEMA_VERSION,
				currentLevel: 4,
				highestUnlockedLevel: 4,
				campaignComplete: false,
				tutorialCompleted: true,
				session: { levelNumber: 4 },
			}),
		)
		expect(parsed.currentLevel).toBe(4)
		expect(parsed.tutorialCompleted).toBe(true)
		expect(parsed.session).toBeNull()
	})
})
