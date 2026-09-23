import type { ColorId } from '../game/types'

/**
 * Palette modes prepared for a future accessibility feature.
 * Keep hex values centralized — components must not scatter raw colors.
 */
export type PaletteMode = 'normal' | 'highContrast' | 'patterned'

/** Semantic UI colors unrelated to liquid identity. */
export const uiColors = {
	background: '#E8F4F8',
	surface: '#FFFFFF',
	surfaceMuted: '#D7E8EE',
	textPrimary: '#1A2B33',
	textSecondary: '#4A6570',
	border: '#9BB8C4',
	tubeGlass: 'rgba(255, 255, 255, 0.55)',
	tubeOutline: '#5A7A88',
	tubeSelected: '#2F80ED',
	tubeHintSource: '#F2A100',
	tubeHintDestination: '#2E9E6A',
	tubeInvalidFlash: '#E05A5A',
	controlBackground: '#FFFFFF',
	controlBorder: '#7FA3B0',
	controlPressed: '#D0E4EC',
	controlDisabled: '#B7C7CE',
	bannerBackground: '#C9D8DE',
	bannerText: '#3A5058',
	hintBackground: 'rgba(255, 255, 255, 0.92)',
	shadow: 'rgba(26, 43, 51, 0.18)',
	overlay: 'rgba(15, 28, 34, 0.45)',
	locked: '#A0B4BC',
	unlocked: '#2F80ED',
	completed: '#2E9E6A',
} as const

/**
 * Ordered vivid fills for generated color-1..color-N identities.
 * Index 0 maps to color-1.
 */
const GENERATED_NORMAL = [
	'#E53935',
	'#1E88E5',
	'#43A047',
	'#FDD835',
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

/** Legacy named sample colors kept for any remaining fixtures. */
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

function resolveGenerated(
	colorId: ColorId,
	palette: readonly string[],
): string | undefined {
	const match = /^color-(\d+)$/.exec(colorId)
	if (!match) return undefined
	const index = Number(match[1]) - 1
	if (index < 0) return undefined
	return palette[index % palette.length]
}

/** Resolve a liquid fill for the active palette mode (defaults to normal). */
export function getLiquidColor(
	colorId: ColorId,
	mode: PaletteMode = 'normal',
): string {
	if (mode === 'highContrast') {
		return (
			resolveGenerated(colorId, GENERATED_HIGH_CONTRAST) ??
			namedHighContrast[colorId] ??
			'#111111'
		)
	}
	return (
		resolveGenerated(colorId, GENERATED_NORMAL) ??
		namedNormal[colorId] ??
		'#607D8B'
	)
}

/** Optional future symbol/pattern key per color (stub for a11y). */
export function getLiquidPatternKey(
	colorId: ColorId,
	_mode: PaletteMode = 'patterned',
): string {
	return colorId
}

export const palette = {
	ui: uiColors,
	getLiquidColor,
	getLiquidPatternKey,
} as const
