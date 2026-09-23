import {
	CAMPAIGN_LEVEL_COUNT,
	createCampaignLevel,
	createPlaySession,
	getCampaignColorCount,
	getCampaignDifficultyBand,
	getCampaignLevelConfig,
	getDifficultyLabelRu,
	isLevelCompleted,
	isLevelUnlocked,
	nextUnlockAfterClearing,
	requestHint,
	restartSession,
	tapTube,
	undoMove,
} from '../campaign'
import { canPour, getLegalMoves, isSolved } from '../game'
import { computeTubeLayout } from '../components/TubeBoard'

describe('campaign levels', () => {
	it('derives a stable seed and band for each level number', () => {
		const config = getCampaignLevelConfig(35)
		expect(config.seed).toBe('watersort-campaign-v1-level-35')
		expect(config.band).toBe('MEDIUM')
		expect(getDifficultyLabelRu(config.band)).toBe('Средне')
		expect(getCampaignDifficultyBand(1)).toBe('BEGINNER')
		expect(getCampaignDifficultyBand(11)).toBe('EASY')
		expect(getCampaignDifficultyBand(56)).toBe('HARD')
		expect(getCampaignDifficultyBand(100)).toBe('EXPERT')
	})

	it('keeps color-count progression gradual', () => {
		expect(getCampaignColorCount(1)).toBe(2)
		expect(getCampaignColorCount(10)).toBe(3)
		expect(getCampaignColorCount(31)).toBe(6)
		expect(getCampaignColorCount(56)).toBe(8)
		expect(getCampaignColorCount(81)).toBe(10)
		expect(getCampaignColorCount(100)).toBe(11)
	})

	it('creates deterministic boards for the same level number', () => {
		const first = createCampaignLevel(1)
		const second = createCampaignLevel(1)
		expect(first.board).toEqual(second.board)
		expect(first.seed).toBe('watersort-campaign-v1-level-1')
		expect(first.campaignBand).toBe('BEGINNER')
		expect(isSolved(first.board)).toBe(false)
	}, 20_000)

	it('varies boards across different level numbers', () => {
		const a = createCampaignLevel(2)
		const b = createCampaignLevel(3)
		expect(JSON.stringify(a.board)).not.toBe(JSON.stringify(b.board))
	}, 20_000)
})

describe('campaign unlock rules', () => {
	it('locks levels above the unlock frontier', () => {
		expect(isLevelUnlocked(1, 1)).toBe(true)
		expect(isLevelUnlocked(2, 1)).toBe(false)
		expect(isLevelUnlocked(5, 5)).toBe(true)
		expect(isLevelCompleted(1, 2)).toBe(true)
		expect(isLevelCompleted(2, 2)).toBe(false)
		expect(isLevelCompleted(100, 100, true)).toBe(true)
		expect(nextUnlockAfterClearing(1, 1)).toBe(2)
		expect(nextUnlockAfterClearing(100, 100)).toBe(100)
		expect(CAMPAIGN_LEVEL_COUNT).toBe(100)
	})
})

describe('play session integration', () => {
	const level = createCampaignLevel(1)

	it('increments move count only on successful pours', () => {
		let session = createPlaySession(level.board)
		const legal = getLegalMoves(session.currentBoard)[0]
		expect(legal).toBeDefined()

		const selected = tapTube(session, legal!.from)
		expect(selected.type).toBe('select')
		session = selected.session

		const poured = tapTube(session, legal!.to)
		expect(poured.type).toBe('poured')
		session = poured.session
		expect(session.moveCount).toBe(1)
		expect(session.moveHistory).toHaveLength(1)

		// Invalid destination must not change board or move count.
		const other = session.currentBoard.findIndex(
			(tube, index) =>
				index !== session.selectedTube &&
				tube.length > 0 &&
				!canPour(session.currentBoard, { from: index, to: (index + 1) % session.currentBoard.length }),
		)
		if (other >= 0) {
			const pick = tapTube(session, other)
			session = pick.session
			const badTarget = (other + 1) % session.currentBoard.length
			const before = session.moveCount
			const boardBefore = session.currentBoard
			const invalid = tapTube(session, badTarget)
			if (invalid.type === 'invalid') {
				expect(invalid.session.moveCount).toBe(before)
				expect(invalid.session.currentBoard).toEqual(boardBefore)
			}
		}
	}, 20_000)

	it('undo restores the exact previous board and decrements move count', () => {
		let session = createPlaySession(level.board)
		const legal = getLegalMoves(session.currentBoard)[0]!
		session = tapTube(session, legal.from).session
		session = tapTube(session, legal.to).session
		const afterPour = cloneSnapshot(session)
		session = undoMove(session)
		expect(session.moveCount).toBe(0)
		expect(session.currentBoard).toEqual(level.board)
		expect(session.currentBoard).not.toEqual(afterPour.currentBoard)
	}, 20_000)

	it('restart restores the initial board', () => {
		let session = createPlaySession(level.board)
		const legal = getLegalMoves(session.currentBoard)[0]!
		session = tapTube(session, legal.from).session
		session = tapTube(session, legal.to).session
		session = restartSession(session)
		expect(session.moveCount).toBe(0)
		expect(session.moveHistory).toEqual([])
		expect(session.currentBoard).toEqual(level.board)
		expect(session.selectedTube).toBeNull()
	}, 20_000)

	it('hint returns a legal move without executing it', () => {
		const session = createPlaySession(level.board)
		const before = session.currentBoard
		const { session: hinted, move } = requestHint(session)
		expect(move).not.toBeNull()
		expect(canPour(before, move!)).toBe(true)
		expect(hinted.currentBoard).toEqual(before)
		expect(hinted.moveCount).toBe(0)
		expect(hinted.hintMove).toEqual(move)
	}, 20_000)
})

describe('responsive tube layout', () => {
	const width = 360
	const height = 520

	it.each([
		['3 colors + 2 empty', 5],
		['5 colors + 2 empty', 7],
		['7 colors + 2 empty', 9],
		['9 colors + 2 empty', 11],
		['11 colors + 2 empty', 13],
	])('%s keeps tappable tube sizes', (_label, tubeCount) => {
		const layout = computeTubeLayout(tubeCount, width, height)
		expect(layout.tubeWidth).toBeGreaterThanOrEqual(44)
		expect(layout.tubeHeight).toBeGreaterThanOrEqual(96)
		expect(layout.rows.flat()).toHaveLength(tubeCount)
	})
})

function cloneSnapshot<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T
}
