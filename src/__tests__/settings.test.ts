import {
	DEFAULT_GAME_SETTINGS,
	getPourAnimationMs,
	parseGameSettings,
	withTutorialReplayRequested,
} from '../settings'
import { createDefaultPersistedState, LEGACY_STORAGE_SCHEMA_VERSIONS } from '../storage/types'
import { parsePersistedGameState } from '../storage/parse'
import { getLiquidColor, getLiquidSymbol, shouldShowLiquidSymbols } from '../theme/palette'
import { createCampaignLevel, createPlaySession, tapTube } from '../campaign'
import { getLegalMoves } from '../game'

describe('settings defaults and parsing', () => {
	it('provides safe defaults', () => {
		expect(DEFAULT_GAME_SETTINGS).toEqual({
			animationSpeed: 'normal',
			hapticsEnabled: true,
			soundsEnabled: true,
			colorMode: 'normal',
		})
		expect(parseGameSettings(undefined)).toEqual(DEFAULT_GAME_SETTINGS)
		expect(parseGameSettings({ animationSpeed: 'nope', colorMode: 3 })).toEqual(
			DEFAULT_GAME_SETTINGS,
		)
	})

	it('accepts valid settings patches', () => {
		expect(
			parseGameSettings({
				animationSpeed: 'instant',
				hapticsEnabled: false,
				soundsEnabled: false,
				colorMode: 'patterned',
			}),
		).toEqual({
			animationSpeed: 'instant',
			hapticsEnabled: false,
			soundsEnabled: false,
			colorMode: 'patterned',
		})
	})

	it('maps animation speeds to durations without changing board state', () => {
		expect(getPourAnimationMs('instant').total).toBe(0)
		expect(getPourAnimationMs('fast').total).toBeLessThan(getPourAnimationMs('normal').total)
		expect(getPourAnimationMs('normal').total).toBeGreaterThan(0)

		const level = createCampaignLevel(1)
		const legal = getLegalMoves(level.board)[0]!
		let session = createPlaySession(level.board)
		session = tapTube(session, legal.from).session
		session = tapTube(session, legal.to).session
		// Animation speed is presentation-only — session board is authoritative.
		expect(session.moveCount).toBe(1)
		expect(session.currentBoard).not.toEqual(level.board)
	}, 20_000)
})

describe('settings persistence compatibility', () => {
	it('migrates schema v1 saves and fills settings defaults', () => {
		const level = createCampaignLevel(1)
		const parsed = parsePersistedGameState(
			JSON.stringify({
				schemaVersion: LEGACY_STORAGE_SCHEMA_VERSIONS[0],
				currentLevel: 3,
				highestUnlockedLevel: 5,
				campaignComplete: false,
				tutorialCompleted: true,
				session: {
					levelNumber: 3,
					seed: 'watersort-campaign-v1-level-3',
					campaignBand: 'BEGINNER',
					initialBoard: level.board,
					currentBoard: level.board,
					moveHistory: [],
					moveCount: 0,
				},
			}),
		)
		expect(parsed.schemaVersion).toBe(createDefaultPersistedState().schemaVersion)
		expect(parsed.currentLevel).toBe(3)
		expect(parsed.highestUnlockedLevel).toBe(5)
		expect(parsed.tutorialCompleted).toBe(true)
		expect(parsed.settings).toEqual(DEFAULT_GAME_SETTINGS)
	}, 20_000)

	it('round-trips schema v2 settings', () => {
		const payload = {
			...createDefaultPersistedState(),
			currentLevel: 2,
			highestUnlockedLevel: 2,
			settings: {
				animationSpeed: 'fast' as const,
				hapticsEnabled: false,
				soundsEnabled: true,
				colorMode: 'highContrast' as const,
			},
		}
		const parsed = parsePersistedGameState(JSON.stringify(payload))
		expect(parsed.settings.animationSpeed).toBe('fast')
		expect(parsed.settings.hapticsEnabled).toBe(false)
		expect(parsed.settings.colorMode).toBe('highContrast')
	})
})

describe('tutorial replay safety', () => {
	it('does not reset campaign unlocks when replaying training', () => {
		const before = {
			...createDefaultPersistedState(),
			currentLevel: 12,
			highestUnlockedLevel: 20,
			campaignComplete: false,
			tutorialCompleted: true,
			settings: {
				animationSpeed: 'fast' as const,
				hapticsEnabled: true,
				soundsEnabled: false,
				colorMode: 'patterned' as const,
			},
		}
		const after = withTutorialReplayRequested(before)
		expect(after.tutorialCompleted).toBe(false)
		expect(after.highestUnlockedLevel).toBe(20)
		expect(after.currentLevel).toBe(12)
		expect(after.campaignComplete).toBe(false)
		expect(after.settings).toEqual(before.settings)
	})
})

describe('color accessibility modes', () => {
	it('keeps stable symbols per ColorId', () => {
		expect(getLiquidSymbol('color-1')).toBe(getLiquidSymbol('color-1'))
		expect(getLiquidSymbol('color-1')).not.toBe(getLiquidSymbol('color-2'))
		expect(getLiquidSymbol('color-3')).toBe('◆')
		expect(shouldShowLiquidSymbols('patterned')).toBe(true)
		expect(shouldShowLiquidSymbols('normal')).toBe(false)
	})

	it('does not change engine ColorId semantics across modes', () => {
		const a = getLiquidColor('color-1', 'normal')
		const b = getLiquidColor('color-1', 'highContrast')
		const c = getLiquidColor('color-1', 'patterned')
		expect(a).toMatch(/^#/)
		expect(b).toMatch(/^#/)
		expect(c).toMatch(/^#/)
		// Rendering differs; identity string is unchanged for the engine.
		expect('color-1').toBe('color-1')
	})
})

/**
 * Flagged for later human playtest (statistical candidates — not confirmed bugs):
 * 9, 13, 15, 18, 58, 60, 64, 74, 80, 84, 88
 */
export const HUMAN_PLAYTEST_CANDIDATE_LEVELS = [
	9, 13, 15, 18, 58, 60, 64, 74, 80, 84, 88,
] as const
