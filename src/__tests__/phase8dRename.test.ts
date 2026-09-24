import appConfig from '../../app.json'
import {
	ABOUT_APP_NAME,
	ABOUT_PRIVACY_URL,
	APP_DISPLAY_NAME,
} from '../about/config'
import { CAMPAIGN_SEED_PREFIX } from '../campaign'
import { createFreePlaySeed } from '../freePlay'
import { STORAGE_KEY } from '../storage/types'

describe('Phase 8D production rename identity', () => {
	it('uses Переливайка as compact display / launcher name', () => {
		expect(APP_DISPLAY_NAME).toBe('Переливайка')
		expect(appConfig.expo.name).toBe('Переливайка')
		expect(ABOUT_APP_NAME).toBe('Переливайка — сортировка воды')
	})

	it('preserves technical package, scheme, storage and seed namespaces', () => {
		expect(appConfig.expo.android.package).toBe(
			'com.calculatorplatform.watersort',
		)
		expect(appConfig.expo.ios?.bundleIdentifier).toBe(
			'com.calculatorplatform.watersort',
		)
		expect(appConfig.expo.scheme).toBe('water-sort')
		expect(appConfig.expo.slug).toBe('water-sort')
		expect(STORAGE_KEY).toBe('watersort.campaign.v1')
		expect(CAMPAIGN_SEED_PREFIX).toBe('watersort-campaign-v1-level')
		expect(createFreePlaySeed(1, 'EASY')).toBe(
			'watersort-freeplay-v1-EASY-1',
		)
		expect(ABOUT_PRIVACY_URL).toBe(
			'https://alex1c.github.io/WaterSortGameRuStore/',
		)
	})
})
