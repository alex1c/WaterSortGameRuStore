import { AD_BANNER_HEIGHT } from '../../src/theme/spacing'
import { getLiquidColor, uiColors } from '../../src/theme/palette'

describe('theme palette abstraction', () => {
	it('keeps banner height reserved for a small mobile banner', () => {
		expect(AD_BANNER_HEIGHT).toBeGreaterThanOrEqual(50)
		expect(AD_BANNER_HEIGHT).toBeLessThanOrEqual(60)
	})

	it('centralizes liquid colors for normal palette', () => {
		expect(getLiquidColor('red')).toMatch(/^#/)
		expect(getLiquidColor('blue')).not.toBe(getLiquidColor('red'))
		expect(uiColors.background).toMatch(/^#/)
	})
})
