import {
	DEFAULT_GAME_SETTINGS,
	type AnimationSpeed,
	type GameSettings,
} from './types'
import type { PaletteMode } from '../theme/palette'

const ANIMATION_SPEEDS: AnimationSpeed[] = ['normal', 'fast', 'instant']
const COLOR_MODES: PaletteMode[] = ['normal', 'highContrast', 'patterned']

/** Parse settings from a persisted record; missing/invalid fields → defaults. */
export function parseGameSettings(value: unknown): GameSettings {
	if (!value || typeof value !== 'object') {
		return { ...DEFAULT_GAME_SETTINGS }
	}
	const record = value as Record<string, unknown>
	return {
		animationSpeed: asAnimationSpeed(record.animationSpeed),
		hapticsEnabled: asBoolean(record.hapticsEnabled, DEFAULT_GAME_SETTINGS.hapticsEnabled),
		soundsEnabled: asBoolean(record.soundsEnabled, DEFAULT_GAME_SETTINGS.soundsEnabled),
		colorMode: asColorMode(record.colorMode),
	}
}

function asAnimationSpeed(value: unknown): AnimationSpeed {
	return ANIMATION_SPEEDS.includes(value as AnimationSpeed)
		? (value as AnimationSpeed)
		: DEFAULT_GAME_SETTINGS.animationSpeed
}

function asColorMode(value: unknown): PaletteMode {
	return COLOR_MODES.includes(value as PaletteMode)
		? (value as PaletteMode)
		: DEFAULT_GAME_SETTINGS.colorMode
}

function asBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback
}

/**
 * Replay training must only flip the tutorial flag — never wipe campaign
 * unlocks, sessions, or settings.
 */
export function withTutorialReplayRequested<T extends { tutorialCompleted: boolean }>(
	state: T,
): T {
	return {
		...state,
		tutorialCompleted: false,
	}
}
