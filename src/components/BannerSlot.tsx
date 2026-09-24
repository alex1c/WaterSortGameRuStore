import { useEffect, useState } from 'react'
import { Dimensions, StyleSheet, Text, View } from 'react-native'

import { BannerAdSize, BannerView } from 'yandex-mobile-ads'

import { AD_BANNER_HEIGHT, uiColors } from '../theme'
import { getBannerUnitId, type BannerPlacement } from '../ads'

interface BannerSlotProps {
	placement: BannerPlacement
	testID?: string
}

/**
 * A real, in-flow adaptive banner slot. The fallback height is retained on
 * no-fill/error so the board and controls never jump or move under navigation.
 */
export function BannerSlot({ placement, testID = 'ad-banner-slot' }: BannerSlotProps) {
	const [bannerSize, setBannerSize] = useState<Awaited<ReturnType<typeof BannerAdSize.stickySize>> | null>(null)
	const [slotHeight, setSlotHeight] = useState(AD_BANNER_HEIGHT)

	useEffect(() => {
		let active = true
		void BannerAdSize.stickySize(Dimensions.get('window').width)
			.then((size) => {
				if (!active) return
				setBannerSize(size)
				setSlotHeight(Math.max(AD_BANNER_HEIGHT, size.height))
			})
			.catch(() => undefined)
		return () => {
			active = false
		}
	}, [])

	return (
		<View
			accessibilityLabel="Рекламный баннер"
			style={[styles.container, { height: slotHeight }]}
			testID={testID}
		>
			{bannerSize ? (
				<BannerView
					size={bannerSize}
					adRequest={{ adUnitId: getBannerUnitId(placement) }}
					style={styles.ad}
					onAdFailedToLoad={() => undefined}
				/>
			) : null}
			{__DEV__ ? <Text style={styles.devLabel}>ТЕСТОВЫЙ РЕКЛАМНЫЙ СЛОТ</Text> : null}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
		backgroundColor: uiColors.bannerBackground,
		alignItems: 'center',
		justifyContent: 'center',
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: uiColors.border,
		overflow: 'hidden',
	},
	ad: {
		width: '100%',
		height: '100%',
	},
	devLabel: {
		position: 'absolute',
		color: uiColors.bannerText,
		fontSize: 10,
		fontWeight: '600',
		letterSpacing: 0.4,
	},
})
