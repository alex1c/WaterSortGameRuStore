import { createCampaignLevel } from '../campaign'
import {
	createDefaultPersistedState,
	STORAGE_SCHEMA_VERSION,
} from '../storage/types'
import { parsePersistedGameState } from '../storage/parse'

describe('persisted game state', () => {
	it('round-trips a mid-level session payload', () => {
		const level = createCampaignLevel(1)
		const payload = {
			schemaVersion: STORAGE_SCHEMA_VERSION,
			currentLevel: 1,
			highestUnlockedLevel: 1,
			campaignComplete: false,
			tutorialCompleted: false,
			session: {
				levelNumber: 1,
				seed: String(level.seed),
				campaignBand: level.campaignBand,
				initialBoard: level.board,
				currentBoard: level.board,
				moveHistory: [],
				moveCount: 0,
			},
		}
		const parsed = parsePersistedGameState(JSON.stringify(payload))
		expect(parsed.schemaVersion).toBe(STORAGE_SCHEMA_VERSION)
		expect(parsed.currentLevel).toBe(1)
		expect(parsed.session?.initialBoard).toEqual(level.board)
		expect(parsed.session?.currentBoard).toEqual(level.board)
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
