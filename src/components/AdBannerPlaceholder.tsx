import { StyleSheet, Text, View } from 'react-native'

import { AD_BANNER_HEIGHT, uiColors } from '../theme'

/**
 * Layout-space placeholder for a future Yandex/RuStore small bottom banner.
 *
 * This is NOT an overlay. It participates in normal flex flow so the game
 * board shrinks to the remaining height. Swap this component for a real
 * ad view later without redesigning GameScreen hierarchy.
 */
export function AdBannerPlaceholder() {
	return (
		<View
			accessibilityLabel="Рекламный баннер (заглушка)"
			style={styles.container}
			testID="ad-banner-placeholder"
		>
			<Text style={styles.label}>РЕКЛАМНЫЙ БАННЕР</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		height: AD_BANNER_HEIGHT,
		width: '100%',
		backgroundColor: uiColors.bannerBackground,
		alignItems: 'center',
		justifyContent: 'center',
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: uiColors.border,
	},
	label: {
		color: uiColors.bannerText,
		fontSize: 12,
		fontWeight: '600',
		letterSpacing: 0.6,
	},
})
