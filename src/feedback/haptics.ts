import * as Haptics from 'expo-haptics'

/**
 * Restrained haptic helpers. Failures are swallowed so gameplay never blocks.
 */
export async function hapticSelection(enabled: boolean): Promise<void> {
	if (!enabled) return
	try {
		await Haptics.selectionAsync()
	} catch {
		// Device may lack a vibrator / Taptic Engine.
	}
}

export async function hapticPour(enabled: boolean): Promise<void> {
	if (!enabled) return
	try {
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
	} catch {
		// ignore
	}
}

export async function hapticInvalid(enabled: boolean): Promise<void> {
	if (!enabled) return
	try {
		await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
	} catch {
		// ignore
	}
}

export async function hapticSuccess(enabled: boolean): Promise<void> {
	if (!enabled) return
	try {
		await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
	} catch {
		// ignore
	}
}
