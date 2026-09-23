/** Stable identifier for one liquid color.
 *
 * The production generator creates more colors than the Phase 1 sample UI,
 * so the core intentionally does not constrain this to a closed union.
 */
export type ColorId = string

/**
 * A single tube is an ordered stack of color layers.
 * Index 0 is the bottom layer; the last index is the top (pour source).
 */
export type Tube = ColorId[]

/** Full board state: one tube per array entry. */
export type Board = Tube[]

/** One deterministic move between two distinct tube indices. */
export interface Move {
	from: number
	to: number
}

/** Maximum layers that fit in one tube (classic Water Sort rule). */
export const TUBE_CAPACITY = 4

/**
 * Describes a successful pour so UI / undo can reason about it
 * without re-deriving capacity math.
 */
export interface PourResult {
	/** Board after the pour. */
	board: Board
	/** How many contiguous top layers were moved. */
	movedCount: number
	fromIndex: number
	toIndex: number
}
