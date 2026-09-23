import type { Board } from './types'

/**
 * Deterministic training board for Phase 1 UI shell.
 *
 * Intentionally hard-coded so Codex can replace this module with a real
 * generator later without touching screen layout or controls.
 *
 * Layout: 8 occupied tubes (mixed colors) + 2 empty tubes = 10 total.
 * Each non-empty tube uses capacity 4; colors are solvable in principle
 * but we do not ship a solver in this phase.
 */
export const SAMPLE_BOARD: Board = [
	['red', 'blue', 'green', 'yellow'],
	['blue', 'red', 'yellow', 'green'],
	['green', 'yellow', 'red', 'blue'],
	['yellow', 'green', 'blue', 'red'],
	['purple', 'orange', 'teal', 'pink'],
	['orange', 'purple', 'pink', 'teal'],
	['teal', 'pink', 'purple', 'orange'],
	['pink', 'teal', 'orange', 'purple'],
	[],
	[],
]

/** Human-readable level label shown in the compact header. */
export const SAMPLE_LEVEL_TITLE = 'Уровень 1 · Обучение'
