import { useEffect, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'

import type { ColorId, Tube as TubeLayers } from '../game/types'
import { TUBE_CAPACITY } from '../game/types'
import type { PaletteMode } from '../theme'
import {
	getLiquidColor,
	getLiquidSymbol,
	shouldShowLiquidSymbols,
	uiColors,
} from '../theme'

export type TubeHighlight =
	| 'none'
	| 'selected'
	| 'hint-source'
	| 'hint-destination'
	| 'invalid'
	| 'pour-source'
	| 'pour-destination'

interface TubeProps {
	layers: TubeLayers
	width: number
	height: number
	highlight: TubeHighlight
	colorMode: PaletteMode
	/** When pouring from this tube, lean toward positive (right) or negative (left). */
	pourDirection?: 1 | -1 | 0
	pourDurationMs?: number
	onPress: () => void
	accessibilityLabel: string
}

/**
 * Glass-like tube with contained liquid layers.
 * Selection / hint / pour feedback uses lift, border style, and optional tilt —
 * not color alone — so Hint stays distinct from Selection.
 */
export function TubeView({
	layers,
	width,
	height,
	highlight,
	colorMode,
	pourDirection = 0,
	pourDurationMs = 0,
	onPress,
	accessibilityLabel,
}: TubeProps) {
	const [lift] = useState(() => new Animated.Value(0))
	const [shake] = useState(() => new Animated.Value(0))
	const [scale] = useState(() => new Animated.Value(1))
	const [tilt] = useState(() => new Animated.Value(0))

	useEffect(() => {
		const selected = highlight === 'selected' || highlight === 'pour-source'
		Animated.spring(lift, {
			toValue: selected ? 1 : 0,
			useNativeDriver: true,
			friction: 8,
			tension: 120,
		}).start()
		Animated.spring(scale, {
			toValue: selected ? 1.04 : 1,
			useNativeDriver: true,
			friction: 8,
			tension: 120,
		}).start()
	}, [highlight, lift, scale])

	useEffect(() => {
		if (highlight === 'pour-source' && pourDurationMs > 0 && pourDirection !== 0) {
			tilt.setValue(0)
			const lean = pourDirection * 14
			Animated.sequence([
				Animated.timing(tilt, {
					toValue: lean,
					duration: Math.max(40, Math.floor(pourDurationMs * 0.35)),
					useNativeDriver: true,
				}),
				Animated.timing(tilt, {
					toValue: 0,
					duration: Math.max(40, Math.floor(pourDurationMs * 0.45)),
					useNativeDriver: true,
				}),
			]).start()
		} else {
			tilt.setValue(0)
		}
	}, [highlight, pourDirection, pourDurationMs, tilt])

	useEffect(() => {
		if (highlight !== 'invalid') return
		shake.setValue(0)
		Animated.sequence([
			Animated.timing(shake, { toValue: 1, duration: 40, useNativeDriver: true }),
			Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
			Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
			Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: true }),
		]).start()
	}, [highlight, shake])

	const outline = resolveOutline(highlight)
	const layerHeight = (height - 12) / TUBE_CAPACITY
	const showSymbols = shouldShowLiquidSymbols(colorMode)
	const isHint = highlight === 'hint-source' || highlight === 'hint-destination'

	const translateY = lift.interpolate({
		inputRange: [0, 1],
		outputRange: [0, -8],
	})
	const translateX = shake.interpolate({
		inputRange: [-1, 1],
		outputRange: [-4, 4],
	})
	const rotate = tilt.interpolate({
		inputRange: [-20, 20],
		outputRange: ['-20deg', '20deg'],
	})

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ selected: highlight === 'selected' }}
			onPress={onPress}
			style={[styles.pressable, { width, height: height + 10 }]}
		>
			<Animated.View
				style={[
					styles.animated,
					{
						width,
						height,
						transform: [
							{ translateY },
							{ translateX },
							{ scale },
							{ rotate },
						],
						shadowOpacity: highlight === 'selected' || highlight === 'pour-source' ? 0.22 : 0.08,
						elevation: highlight === 'selected' || highlight === 'pour-source' ? 6 : 2,
					},
				]}
			>
				{/* Open rim highlight at the top. */}
				<View style={[styles.rim, { borderColor: outline.color }]} />
				<View
					style={[
						styles.tube,
						{
							width,
							height,
							borderColor: outline.color,
							borderWidth: outline.width,
							borderStyle: isHint ? 'dashed' : 'solid',
						},
					]}
				>
					<View style={styles.glassSheen} pointerEvents="none" />
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
								colorMode={colorMode}
								showSymbol={showSymbols}
							/>
						))}
					</View>
				</View>
				{isHint ? (
					<View
						style={[
							styles.hintBadge,
							highlight === 'hint-source'
								? styles.hintBadgeSource
								: styles.hintBadgeDestination,
						]}
					>
						<Text style={styles.hintBadgeText}>
							{highlight === 'hint-source' ? '→' : '↓'}
						</Text>
					</View>
				) : null}
			</Animated.View>
		</Pressable>
	)
}

interface LiquidLayerProps {
	colorId: ColorId
	height: number
	colorMode: PaletteMode
	showSymbol: boolean
}

function LiquidLayer({ colorId, height, colorMode, showSymbol }: LiquidLayerProps) {
	const fill = getLiquidColor(colorId, colorMode)
	return (
		<View style={[styles.liquid, { height, backgroundColor: fill }]}>
			{showSymbol ? (
				<Text
					style={[
						styles.symbol,
						{ fontSize: Math.max(10, Math.min(14, height * 0.55)) },
					]}
					allowFontScaling={false}
				>
					{getLiquidSymbol(colorId)}
				</Text>
			) : null}
		</View>
	)
}

function resolveOutline(highlight: TubeHighlight): { color: string; width: number } {
	switch (highlight) {
		case 'invalid':
			return { color: uiColors.tubeInvalidFlash, width: 3 }
		case 'selected':
		case 'pour-source':
			return { color: uiColors.tubeSelected, width: 3 }
		case 'hint-source':
			return { color: uiColors.tubeHintSource, width: 3 }
		case 'hint-destination':
		case 'pour-destination':
			return { color: uiColors.tubeHintDestination, width: 3 }
		default:
			return { color: uiColors.tubeOutline, width: 2 }
	}
}

const styles = StyleSheet.create({
	pressable: {
		alignItems: 'center',
		justifyContent: 'flex-end',
	},
	animated: {
		alignItems: 'center',
		justifyContent: 'flex-end',
		shadowColor: uiColors.shadow,
		shadowOffset: { width: 0, height: 4 },
		shadowRadius: 6,
	},
	rim: {
		position: 'absolute',
		top: -2,
		width: '88%',
		height: 6,
		borderTopWidth: 2,
		borderLeftWidth: 1,
		borderRightWidth: 1,
		borderColor: uiColors.tubeRim,
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
		zIndex: 2,
	},
	tube: {
		borderTopLeftRadius: 12,
		borderTopRightRadius: 12,
		borderBottomLeftRadius: 22,
		borderBottomRightRadius: 22,
		backgroundColor: uiColors.tubeGlass,
		overflow: 'hidden',
		padding: 3,
	},
	glassSheen: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: '8%',
		width: '28%',
		backgroundColor: uiColors.tubeGlassInner,
	},
	inner: {
		flex: 1,
		justifyContent: 'flex-end',
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
		borderBottomLeftRadius: 18,
		borderBottomRightRadius: 18,
		overflow: 'hidden',
		backgroundColor: 'rgba(255,255,255,0.12)',
	},
	slot: {
		width: '100%',
	},
	liquid: {
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: 'rgba(255,255,255,0.25)',
	},
	symbol: {
		color: 'rgba(255,255,255,0.95)',
		fontWeight: '800',
		textShadowColor: 'rgba(0,0,0,0.35)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 1,
	},
	hintBadge: {
		position: 'absolute',
		top: -10,
		right: -6,
		minWidth: 20,
		height: 20,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 4,
	},
	hintBadgeSource: {
		backgroundColor: uiColors.tubeHintSource,
	},
	hintBadgeDestination: {
		backgroundColor: uiColors.tubeHintDestination,
	},
	hintBadgeText: {
		color: '#FFFFFF',
		fontSize: 11,
		fontWeight: '800',
	},
})
