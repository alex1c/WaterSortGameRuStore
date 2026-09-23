import { Pressable, StyleSheet, View } from 'react-native'

import type { ColorId, Tube as TubeLayers } from '../game/types'
import { TUBE_CAPACITY } from '../game/types'
import { getLiquidColor, uiColors } from '../theme'

interface TubeProps {
	layers: TubeLayers
	/** Outer pixel width for this tube (computed by TubeBoard). */
	width: number
	/** Outer pixel height for this tube (computed by TubeBoard). */
	height: number
	selected: boolean
	invalidFlash: boolean
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
	selected,
	invalidFlash,
	onPress,
	accessibilityLabel,
}: TubeProps) {
	const outlineColor = invalidFlash
		? uiColors.tubeInvalidFlash
		: selected
			? uiColors.tubeSelected
			: uiColors.tubeOutline

	const layerHeight = (height - 10) / TUBE_CAPACITY

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ selected }}
			onPress={onPress}
			style={[
				styles.pressable,
				selected && styles.selectedLift,
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
						borderWidth: selected || invalidFlash ? 3 : 2,
					},
				]}
			>
				<View style={styles.inner}>
					{/* Empty slots above the liquid keep capacity visually clear. */}
					{Array.from({ length: TUBE_CAPACITY - layers.length }).map((_, index) => (
						<View
							key={`empty-${index}`}
							style={[styles.slot, { height: layerHeight }]}
						/>
					))}
					{/* Render top-first in the flex column so bottom layers sit lower. */}
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
