export const AD_UNIT_IDS = {
	gameBanner: 'R-M-20102113-1',
	levelsBanner: 'R-M-20102113-2',
	informationBanner: 'R-M-20102113-3',
	interstitial: 'R-M-20102113-4',
	rewarded: 'R-M-20102113-5',
	appOpen: 'R-M-20102113-6',
} as const

export type BannerPlacement = 'game' | 'levels' | 'information'

export const BANNER_UNIT_BY_PLACEMENT: Record<BannerPlacement, string> = {
	game: AD_UNIT_IDS.gameBanner,
	levels: AD_UNIT_IDS.levelsBanner,
	information: AD_UNIT_IDS.informationBanner,
}

/** The app-open unit is configured for a later phase but is never displayed. */
export const APP_OPEN_AUTOMATIC_DISPLAY_ENABLED = false

export function getBannerUnitId(placement: BannerPlacement): string {
	return BANNER_UNIT_BY_PLACEMENT[placement]
}
