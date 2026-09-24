import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BannerSlot } from '../components/BannerSlot'
import {
	FREE_PLAY_DIFFICULTY_CHOICES,
	type FreePlayDifficulty,
} from '../freePlay'
import { spacing, uiColors } from '../theme'

interface FreePlayScreenProps {
	hasSavedSession: boolean
	savedDifficultyLabel: string | null
	savedMoveCount: number
	onContinue: () => void
	onChooseDifficulty: (difficulty: FreePlayDifficulty) => void
	onRequestNewPuzzle: () => void
	showDifficultyList: boolean
	onClose: () => void
}

/**
 * Free Play hub: resume unfinished puzzle or pick a difficulty.
 */
export function FreePlayScreen({
	hasSavedSession,
	savedDifficultyLabel,
	savedMoveCount,
	onContinue,
	onChooseDifficulty,
	onRequestNewPuzzle,
	showDifficultyList,
	onClose,
}: FreePlayScreenProps) {
	const insets = useSafeAreaInsets()

	return (
		<View
			style={[
				styles.root,
				{
					paddingTop: insets.top,
					paddingLeft: insets.left,
					paddingRight: insets.right,
				},
			]}
			testID="free-play-screen"
		>
			<View style={styles.header}>
				<Text style={styles.title}>Свободная игра</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Назад на главную"
					onPress={onClose}
					style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
				>
					<Text style={styles.backLabel}>Назад</Text>
				</Pressable>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				{hasSavedSession && !showDifficultyList ? (
					<View style={styles.resumeBlock}>
						<Pressable
							accessibilityRole="button"
							onPress={onContinue}
							style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
							testID="free-play-continue"
						>
							<Text style={styles.primaryLabel}>Продолжить</Text>
							<Text style={styles.primaryMeta}>
								{savedDifficultyLabel} · {savedMoveCount}{' '}
								{savedMoveCount === 1 ? 'ход' : 'ходов'}
							</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							onPress={onRequestNewPuzzle}
							style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
							testID="free-play-new"
						>
							<Text style={styles.secondaryLabel}>Новая головоломка</Text>
						</Pressable>
					</View>
				) : (
					<View style={styles.choices}>
						{FREE_PLAY_DIFFICULTY_CHOICES.map((choice) => (
							<Pressable
								key={choice.id}
								accessibilityRole="button"
								accessibilityLabel={`${choice.title}. ${choice.description}`}
								onPress={() => onChooseDifficulty(choice.id)}
								style={({ pressed }) => [
									styles.choice,
									pressed && styles.pressed,
								]}
								testID={`free-play-difficulty-${choice.id}`}
							>
								<Text style={styles.choiceTitle}>{choice.title}</Text>
								<Text style={styles.choiceBody}>{choice.description}</Text>
							</Pressable>
						))}
					</View>
				)}
			</ScrollView>

			<View style={styles.bottomStack}>
				<BannerSlot placement="information" />
				<View
					style={{ height: insets.bottom, backgroundColor: uiColors.surfaceMuted }}
				/>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: uiColors.background },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.sm,
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	backButton: {
		minHeight: 40,
		paddingHorizontal: spacing.md,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	backLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: uiColors.textPrimary,
	},
	content: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.lg,
		paddingBottom: spacing.xl,
		gap: spacing.md,
	},
	resumeBlock: { gap: spacing.md },
	primary: {
		minHeight: 72,
		borderRadius: 16,
		backgroundColor: uiColors.tubeSelected,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.lg,
	},
	primaryLabel: {
		color: '#FFFFFF',
		fontSize: 20,
		fontWeight: '800',
	},
	primaryMeta: {
		marginTop: 4,
		color: 'rgba(255,255,255,0.9)',
		fontSize: 13,
		fontWeight: '600',
	},
	secondary: {
		minHeight: 52,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	choices: { gap: spacing.sm },
	choice: {
		minHeight: 64,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.md,
		justifyContent: 'center',
	},
	choiceTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: uiColors.textPrimary,
	},
	choiceBody: {
		marginTop: 4,
		fontSize: 13,
		color: uiColors.textSecondary,
	},
	pressed: { opacity: 0.88 },
	bottomStack: { width: '100%' },
})
