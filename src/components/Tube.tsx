import { Pressable, StyleSheet, View } from 'react-native'

import type { ColorId, Tube as TubeLayers } from '../game/types'
import { TUBE_CAPACITY } from '../game/types'
import { getLiquidColor, uiColors } from '../theme'

export type TubeHighlight = 'none' | 'selected' | 'hint-source' | 'hint-destination' | 'invalid'

interface TubeProps {
	layers: TubeLayers
	width: number
	height: number
	highlight: TubeHighlight
	onPress: () => void
	accessibilityLabel: string
}

/**
 * Glass-like tube outline with stacked liquid layers.
 * Layers render bottom-up to match Board index 0 = bottom.
 */
export function TubeView({
	layers,
	width,
	height,
	highlight,
	onPress,
	accessibilityLabel,
}: TubeProps) {
	const outlineColor =
		highlight === 'invalid'
			? uiColors.tubeInvalidFlash
			: highlight === 'selected'
				? uiColors.tubeSelected
				: highlight === 'hint-source'
					? uiColors.tubeHintSource
					: highlight === 'hint-destination'
						? uiColors.tubeHintDestination
						: uiColors.tubeOutline

	const emphasized = highlight !== 'none'
	const layerHeight = (height - 10) / TUBE_CAPACITY

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ selected: highlight === 'selected' }}
			onPress={onPress}
			style={[
				styles.pressable,
				highlight === 'selected' && styles.selectedLift,
				{ width, height },
			]}
		>
			<View
				style={[
					styles.tube,
					{
						width,
						height,
						borderColor: outlineColor,
						borderWidth: emphasized ? 3 : 2,
					},
				]}
			>
				<View style={styles.inner}>
					{Array.from({ length: TUBE_CAPACITY - layers.length }).map((_, index) => (
						<View
							key={`empty-${index}`}
							style={[styles.slot, { height: layerHeight }]}
						/>
					))}
					{[...layers].reverse().map((colorId, index) => (
						<LiquidLayer
							key={`layer-${layers.length - 1 - index}-${colorId}`}
							colorId={colorId}
							height={layerHeight}
						/>
					))}
				</View>
			</View>
		</Pressable>
	)
}

interface LiquidLayerProps {
	colorId: ColorId
	height: number
}

function LiquidLayer({ colorId, height }: LiquidLayerProps) {
	return (
		<View
			style={[
				styles.liquid,
				{
					height,
					backgroundColor: getLiquidColor(colorId),
				},
			]}
		/>
	)
}

const styles = StyleSheet.create({
	pressable: {
		alignItems: 'center',
		justifyContent: 'flex-end',
	},
	selectedLift: {
		transform: [{ translateY: -6 }],
	},
	tube: {
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		borderBottomLeftRadius: 18,
		borderBottomRightRadius: 18,
		backgroundColor: uiColors.tubeGlass,
		overflow: 'hidden',
		padding: 3,
	},
	inner: {
		flex: 1,
		justifyContent: 'flex-end',
		borderTopLeftRadius: 7,
		borderTopRightRadius: 7,
		borderBottomLeftRadius: 14,
		borderBottomRightRadius: 14,
		overflow: 'hidden',
	},
	slot: {
		width: '100%',
	},
	liquid: {
		width: '100%',
	},
})
