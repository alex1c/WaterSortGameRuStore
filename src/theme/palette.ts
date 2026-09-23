import type { ColorId } from '../game/types'

/**
 * Palette modes prepared for a future accessibility feature.
 * Phase 1 only renders `normal`; high-contrast and patterned modes
 * are stubs so color hex values stay centralized (not scattered in UI).
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
	tubeInvalidFlash: '#E05A5A',
	controlBackground: '#FFFFFF',
	controlBorder: '#7FA3B0',
	controlPressed: '#D0E4EC',
	bannerBackground: '#C9D8DE',
	bannerText: '#3A5058',
	hintBackground: 'rgba(255, 255, 255, 0.88)',
	shadow: 'rgba(26, 43, 51, 0.18)',
} as const

/**
 * Strongly distinguishable liquid fills for the normal palette.
 * Values are intentionally vivid so layers read clearly on 1080×1920 shots.
 */
const normalLiquid: Record<ColorId, string> = {
	red: '#E53935',
	blue: '#1E88E5',
	green: '#43A047',
	yellow: '#FDD835',
	purple: '#8E24AA',
	orange: '#FB8C00',
	teal: '#00897B',
	pink: '#D81B60',
}

/**
 * High-contrast stub — darker/brighter pairs for a later a11y mode.
 * Not wired into UI yet; kept here so components never hard-code hex.
 */
const highContrastLiquid: Record<ColorId, string> = {
	red: '#FF0000',
	blue: '#004CFF',
	green: '#00A000',
	yellow: '#FFE600',
	purple: '#9B00FF',
	orange: '#FF6A00',
	teal: '#007A70',
	pink: '#FF1493',
}

/**
 * Patterned mode reuses normal fills for now.
 * Future work can map ColorId → { color, patternId } without touching tubes.
 */
const patternedLiquid: Record<ColorId, string> = { ...normalLiquid }

const liquidByMode: Record<PaletteMode, Record<ColorId, string>> = {
	normal: normalLiquid,
	highContrast: highContrastLiquid,
	patterned: patternedLiquid,
}

/** Resolve a liquid fill for the active palette mode (defaults to normal). */
export function getLiquidColor(
	colorId: ColorId,
	mode: PaletteMode = 'normal',
): string {
	// Generated levels may contain more identities than the Phase 1 sample
	// palette. Keep the UI safe until a production palette is added.
	return liquidByMode[mode][colorId] ?? '#607D8B'
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
