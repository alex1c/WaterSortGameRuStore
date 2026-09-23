import type { ColorId } from '../game/types'

/**
 * Palette modes for accessibility.
 * Keep hex / symbols centralized — components must not scatter raw colors.
 */
export type PaletteMode = 'normal' | 'highContrast' | 'patterned'

/** Semantic UI colors unrelated to liquid identity. */
export const uiColors = {
	background: '#EAF6F4',
	backgroundAccent: '#D7EFEA',
	surface: '#FFFFFF',
	surfaceMuted: '#D9EBE7',
	textPrimary: '#17333A',
	textSecondary: '#4A6B72',
	border: '#9BB8B8',
	tubeGlass: 'rgba(255, 255, 255, 0.42)',
	tubeGlassInner: 'rgba(255, 255, 255, 0.18)',
	tubeOutline: '#5A7A80',
	tubeRim: 'rgba(255, 255, 255, 0.75)',
	tubeSelected: '#2F80ED',
	tubeHintSource: '#E8A317',
	tubeHintDestination: '#1F9E6A',
	tubeInvalidFlash: '#E05A5A',
	controlBackground: '#FFFFFF',
	controlBorder: '#7FA3A8',
	controlPressed: '#CDE4DF',
	controlDisabled: '#B7C7CE',
	bannerBackground: '#C9D8DE',
	bannerText: '#3A5058',
	hintBackground: 'rgba(255, 255, 255, 0.94)',
	shadow: 'rgba(23, 51, 58, 0.16)',
	overlay: 'rgba(15, 28, 34, 0.48)',
	locked: '#A0B4BC',
	unlocked: '#2F80ED',
	completed: '#1F9E6A',
	winAccent: '#2E9E6A',
} as const

/**
 * Ordered vivid fills for generated color-1..color-N identities.
 * Index 0 maps to color-1.
 */
const GENERATED_NORMAL = [
	'#E53935',
	'#1E88E5',
	'#43A047',
	'#F9A825',
	'#8E24AA',
	'#FB8C00',
	'#00897B',
	'#D81B60',
	'#5E35B1',
	'#00ACC1',
	'#6D4C41',
	'#3949AB',
] as const

const GENERATED_HIGH_CONTRAST = [
	'#FF0000',
	'#004CFF',
	'#00A000',
	'#FFE600',
	'#9B00FF',
	'#FF6A00',
	'#007A70',
	'#FF1493',
	'#6A00FF',
	'#00D0FF',
	'#8B4513',
	'#0000AA',
] as const

/**
 * Stable distinguishing symbols for patterned mode (ColorId → glyph).
 * Readable on Expert 6+6 layouts; not part of game engine semantics.
 */
const GENERATED_SYMBOLS = ['●', '▲', '◆', '■', '★', '+', '○', '▼', '◇', '□', '✦', '×'] as const

const namedNormal: Record<string, string> = {
	red: GENERATED_NORMAL[0],
	blue: GENERATED_NORMAL[1],
	green: GENERATED_NORMAL[2],
	yellow: GENERATED_NORMAL[3],
	purple: GENERATED_NORMAL[4],
	orange: GENERATED_NORMAL[5],
	teal: GENERATED_NORMAL[6],
	pink: GENERATED_NORMAL[7],
}

const namedHighContrast: Record<string, string> = {
	red: GENERATED_HIGH_CONTRAST[0],
	blue: GENERATED_HIGH_CONTRAST[1],
	green: GENERATED_HIGH_CONTRAST[2],
	yellow: GENERATED_HIGH_CONTRAST[3],
	purple: GENERATED_HIGH_CONTRAST[4],
	orange: GENERATED_HIGH_CONTRAST[5],
	teal: GENERATED_HIGH_CONTRAST[6],
	pink: GENERATED_HIGH_CONTRAST[7],
}

const namedSymbols: Record<string, string> = {
	red: GENERATED_SYMBOLS[0],
	blue: GENERATED_SYMBOLS[1],
	green: GENERATED_SYMBOLS[2],
	yellow: GENERATED_SYMBOLS[3],
	purple: GENERATED_SYMBOLS[4],
	orange: GENERATED_SYMBOLS[5],
	teal: GENERATED_SYMBOLS[6],
	pink: GENERATED_SYMBOLS[7],
}

function colorIndex(colorId: ColorId): number | null {
	const match = /^color-(\d+)$/.exec(colorId)
	if (!match) return null
	const index = Number(match[1]) - 1
	return index >= 0 ? index : null
}

function resolveGenerated(
	colorId: ColorId,
	palette: readonly string[],
): string | undefined {
	const index = colorIndex(colorId)
	if (index === null) return undefined
	return palette[index % palette.length]
}

/** Resolve a liquid fill for the active palette mode (defaults to normal). */
export function getLiquidColor(
	colorId: ColorId,
	mode: PaletteMode = 'normal',
): string {
	if (mode === 'highContrast' || mode === 'patterned') {
		// Patterned keeps strong fills plus an overlaid symbol.
		const high =
			resolveGenerated(colorId, GENERATED_HIGH_CONTRAST) ??
			namedHighContrast[colorId]
		if (mode === 'highContrast') {
			return high ?? '#111111'
		}
		return (
			resolveGenerated(colorId, GENERATED_NORMAL) ??
			namedNormal[colorId] ??
			'#607D8B'
		)
	}
	return (
		resolveGenerated(colorId, GENERATED_NORMAL) ??
		namedNormal[colorId] ??
		'#607D8B'
	)
}

/**
 * Stable symbol for patterned accessibility mode.
 * Same ColorId always maps to the same glyph.
 */
export function getLiquidSymbol(colorId: ColorId): string {
	const index = colorIndex(colorId)
	if (index !== null) {
		return GENERATED_SYMBOLS[index % GENERATED_SYMBOLS.length]!
	}
	return namedSymbols[colorId] ?? '•'
}

/** @deprecated Prefer getLiquidSymbol — kept for older call sites. */
export function getLiquidPatternKey(
	colorId: ColorId,
	_mode: PaletteMode = 'patterned',
): string {
	return getLiquidSymbol(colorId)
}

export function shouldShowLiquidSymbols(mode: PaletteMode): boolean {
	return mode === 'patterned'
}

export const palette = {
	ui: uiColors,
	getLiquidColor,
	getLiquidSymbol,
	getLiquidPatternKey,
	shouldShowLiquidSymbols,
} as const
