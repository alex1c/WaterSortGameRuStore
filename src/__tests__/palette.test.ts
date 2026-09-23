import { AD_BANNER_HEIGHT } from '../../src/theme/spacing'
import { getLiquidColor, getLiquidSymbol, uiColors } from '../../src/theme/palette'

describe('theme palette abstraction', () => {
	it('keeps banner height reserved for a small mobile banner', () => {
		expect(AD_BANNER_HEIGHT).toBeGreaterThanOrEqual(50)
		expect(AD_BANNER_HEIGHT).toBeLessThanOrEqual(60)
	})

	it('maps generated color ids to distinct fills and symbols', () => {
		expect(getLiquidColor('color-1')).toMatch(/^#/)
		expect(getLiquidColor('color-2')).not.toBe(getLiquidColor('color-1'))
		expect(getLiquidColor('color-12')).toMatch(/^#/)
		expect(getLiquidSymbol('color-1')).toBeTruthy()
		expect(uiColors.background).toMatch(/^#/)
	})
})
