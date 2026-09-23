/**
 * Minimal sound architecture for Phase 5.
 *
 * No audio assets are bundled yet (licensing / sourcing deferred).
 * The Settings toggle persists; play helpers are safe no-ops until assets land.
 * Do not autoplay music. Sounds must never block gameplay.
 */
export type SoundEvent = 'pour' | 'win'

let soundsEnabled = true

export function setSoundsEnabled(enabled: boolean): void {
	soundsEnabled = enabled
}

export function getSoundsEnabled(): boolean {
	return soundsEnabled
}

/** Asset readiness report for Phase 5 final summary. */
export const SOUND_ASSET_STATUS = {
	pour: 'missing' as const,
	win: 'missing' as const,
	note: 'Sound toggle + API ready; no licensed short SFX bundled in Phase 5.',
}

export async function playSound(event: SoundEvent): Promise<void> {
	if (!soundsEnabled) return
	// Intentionally no-op until short pour / win assets are added.
	void event
}

export async function playPourSound(): Promise<void> {
	await playSound('pour')
}

export async function playWinSound(): Promise<void> {
	await playSound('win')
}
