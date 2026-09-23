/**
 * Shared spacing tokens so layout stays consistent across header,
 * board, controls, and the ad banner slot.
 */
export const spacing = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
} as const

/**
 * Reserved height for a future small bottom ad banner.
 * Keep this in one place so AdBannerPlaceholder and layout math stay aligned.
 */
export const AD_BANNER_HEIGHT = 50
