/**
 * Liquid color identifiers used by the temporary sample board.
 * Keep IDs stable so UI, tests, and a future game-core can share them.
 */
export type ColorId =
	| 'red'
	| 'blue'
	| 'green'
	| 'yellow'
	| 'purple'
	| 'orange'
	| 'teal'
	| 'pink'

/**
 * A single tube is an ordered stack of color layers.
 * Index 0 is the bottom layer; the last index is the top (pour source).
 */
export type Tube = ColorId[]

/** Full board state: one tube per array entry. */
export type Board = Tube[]

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
