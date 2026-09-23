import type { PaletteMode } from '../theme/palette'

/** Pour animation pacing — does not affect Water Sort rules. */
export type AnimationSpeed = 'normal' | 'fast' | 'instant'

export interface GameSettings {
	animationSpeed: AnimationSpeed
	hapticsEnabled: boolean
	soundsEnabled: boolean
	colorMode: PaletteMode
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
	animationSpeed: 'normal',
	hapticsEnabled: true,
	soundsEnabled: true,
	colorMode: 'normal',
}

/** Durations in ms for the concise pour animation sequence. */
export function getPourAnimationMs(speed: AnimationSpeed): {
	lift: number
	transfer: number
	settle: number
	total: number
} {
	switch (speed) {
		case 'instant':
			return { lift: 0, transfer: 0, settle: 0, total: 0 }
		case 'fast':
			return { lift: 60, transfer: 140, settle: 60, total: 260 }
		case 'normal':
		default:
			return { lift: 90, transfer: 220, settle: 90, total: 400 }
	}
}

export function animationSpeedLabelRu(speed: AnimationSpeed): string {
	switch (speed) {
		case 'normal':
			return 'Обычная'
		case 'fast':
			return 'Быстрая'
		case 'instant':
			return 'Мгновенная'
		default: {
			const _exhaustive: never = speed
			return _exhaustive
		}
	}
}

export function colorModeLabelRu(mode: PaletteMode): string {
	switch (mode) {
		case 'normal':
			return 'Обычные цвета'
		case 'highContrast':
			return 'Контрастные цвета'
		case 'patterned':
			return 'Цвета + символы'
		default: {
			const _exhaustive: never = mode
			return _exhaustive
		}
	}
}
