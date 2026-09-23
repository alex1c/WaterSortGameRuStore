import type { CampaignLevel } from '../campaign'
import { serializeBoard } from '../game'
import type { PersistedLevelSession } from './types'

/**
 * A persisted session may only be restored against the exact deterministic
 * campaign board that created it. This protects v1 saves if a calibration
 * changes a seed or board while keeping the storage schema compatible.
 */
export function isPersistedSessionCompatible(
	session: PersistedLevelSession,
	level: CampaignLevel,
): boolean {
	return (
		session.levelNumber === level.levelNumber &&
		session.seed === String(level.seed) &&
		session.campaignBand === level.campaignBand &&
		serializeBoard(session.initialBoard) === serializeBoard(level.board)
	)
}
