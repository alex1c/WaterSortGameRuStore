import {
	Alert,
	Linking,
	Pressable,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BannerSlot } from '../components/BannerSlot'
import {
	ABOUT_APP_NAME,
	ABOUT_DEVELOPER,
	ABOUT_OTHER_APPS_URL,
	ABOUT_WEBSITE_URL,
} from '../about/config'
import {
	animationSpeedLabelRu,
	colorModeLabelRu,
	type AnimationSpeed,
	type GameSettings,
} from '../settings'
import type { PaletteMode } from '../theme'
import { spacing, uiColors } from '../theme'

async function openExternalUrl(url: string) {
	try {
		const supported = await Linking.canOpenURL(url)
		if (!supported) throw new Error('URL is not supported')
		await Linking.openURL(url)
	} catch {
		Alert.alert('Не удалось открыть ссылку', 'Проверьте подключение к интернету.')
	}
}

interface SettingsScreenProps {
	settings: GameSettings
	onChange: (patch: Partial<GameSettings>) => void
	onReplayTutorial: () => void
	onClose: () => void
}

const SPEEDS: AnimationSpeed[] = ['normal', 'fast', 'instant']
const COLOR_MODES: PaletteMode[] = ['normal', 'highContrast', 'patterned']

/**
 * Clean Settings screen. Only finished controls — no placeholder rows.
 * Bottom stack preserves fake banner + real safe-area inset.
 */
export function SettingsScreen({
	settings,
	onChange,
	onReplayTutorial,
	onClose,
}: SettingsScreenProps) {
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
			testID="settings-screen"
		>
			<View style={styles.header}>
				<Text style={styles.title}>Настройки</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Назад"
					onPress={onClose}
					style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
				>
					<Text style={styles.backLabel}>Назад</Text>
				</Pressable>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<Text style={styles.section}>Игра</Text>

				<Text style={styles.fieldLabel}>Скорость анимации</Text>
				<View style={styles.segmentRow}>
					{SPEEDS.map((speed) => (
						<Pressable
							key={speed}
							accessibilityRole="button"
							accessibilityState={{ selected: settings.animationSpeed === speed }}
							onPress={() => onChange({ animationSpeed: speed })}
							style={[
								styles.segment,
								settings.animationSpeed === speed && styles.segmentActive,
							]}
						>
							<Text
								style={[
									styles.segmentLabel,
									settings.animationSpeed === speed && styles.segmentLabelActive,
								]}
							>
								{animationSpeedLabelRu(speed)}
							</Text>
						</Pressable>
					))}
				</View>

				<ToggleRow
					label="Вибрация"
					value={settings.hapticsEnabled}
					onValueChange={(hapticsEnabled) => onChange({ hapticsEnabled })}
				/>
				<ToggleRow
					label="Звуки"
					value={settings.soundsEnabled}
					onValueChange={(soundsEnabled) => onChange({ soundsEnabled })}
				/>

				<Text style={[styles.fieldLabel, styles.fieldSpaced]}>Режим цветов</Text>
				<View style={styles.stackChoices}>
					{COLOR_MODES.map((mode) => (
						<Pressable
							key={mode}
							accessibilityRole="button"
							accessibilityState={{ selected: settings.colorMode === mode }}
							onPress={() => onChange({ colorMode: mode })}
							style={[
								styles.choice,
								settings.colorMode === mode && styles.choiceActive,
							]}
						>
							<Text
								style={[
									styles.choiceLabel,
									settings.colorMode === mode && styles.choiceLabelActive,
								]}
							>
								{colorModeLabelRu(mode)}
							</Text>
						</Pressable>
					))}
				</View>

				<Text style={styles.section}>Обучение</Text>
				<Pressable
					accessibilityRole="button"
					onPress={onReplayTutorial}
					style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
				>
					<Text style={styles.actionLabel}>Пройти обучение снова</Text>
				</Pressable>
				<Text style={styles.hint}>
					Повторное обучение не сбрасывает прогресс кампании и открытые уровни.
				</Text>

				<Text style={styles.section}>О программе</Text>
				<View style={styles.aboutCard}>
					<Text style={styles.aboutTitle}>{ABOUT_APP_NAME}</Text>
					<Text style={styles.aboutBody}>Разработчик: {ABOUT_DEVELOPER}</Text>
					<Text style={styles.aboutBody}>Кампания: уровни 1–100</Text>
					<Text style={styles.aboutBody}>Версия 1.0.0</Text>
					<AboutLink
						label="Сайт ForestMusic"
						onPress={() => void openExternalUrl(ABOUT_WEBSITE_URL)}
					/>
					<AboutLink
						label="Другие наши приложения"
						onPress={() => void openExternalUrl(ABOUT_OTHER_APPS_URL)}
					/>
				</View>
			</ScrollView>

			<View style={styles.bottomStack}>
				<BannerSlot placement="information" testID="ad-banner-information" />
				<View style={{ height: insets.bottom, backgroundColor: uiColors.surfaceMuted }} />
			</View>
		</View>
	)
}

function AboutLink({ label, onPress }: { label: string; onPress: () => void }) {
	return (
		<Pressable
			accessibilityRole="link"
			onPress={onPress}
			style={({ pressed }) => [styles.aboutLink, pressed && styles.pressed]}
		>
			<Text style={styles.aboutLinkLabel}>{label}</Text>
		</Pressable>
	)
}

function ToggleRow({
	label,
	value,
	onValueChange,
}: {
	label: string
	value: boolean
	onValueChange: (next: boolean) => void
}) {
	return (
		<View style={styles.toggleRow}>
			<Text style={styles.toggleLabel}>{label}</Text>
			<Switch
				value={value}
				onValueChange={onValueChange}
				trackColor={{ false: '#C5D4D8', true: '#8FCBFF' }}
				thumbColor={value ? uiColors.tubeSelected : '#F4F7F8'}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: uiColors.background,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.sm,
		paddingBottom: spacing.xs,
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
	scroll: {
		flex: 1,
	},
	content: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.xl,
		gap: spacing.sm,
	},
	section: {
		marginTop: spacing.lg,
		marginBottom: spacing.xs,
		fontSize: 13,
		fontWeight: '700',
		letterSpacing: 0.4,
		color: uiColors.textSecondary,
		textTransform: 'uppercase',
	},
	fieldLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: uiColors.textPrimary,
		marginBottom: 4,
	},
	fieldSpaced: {
		marginTop: spacing.sm,
	},
	segmentRow: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	segment: {
		flex: 1,
		minHeight: 44,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 4,
	},
	segmentActive: {
		borderColor: uiColors.tubeSelected,
		backgroundColor: '#E8F2FF',
	},
	segmentLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: uiColors.textSecondary,
		textAlign: 'center',
	},
	segmentLabelActive: {
		color: uiColors.tubeSelected,
	},
	toggleRow: {
		minHeight: 48,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: spacing.xs,
	},
	toggleLabel: {
		fontSize: 15,
		fontWeight: '600',
		color: uiColors.textPrimary,
	},
	stackChoices: {
		gap: spacing.sm,
	},
	choice: {
		minHeight: 44,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		paddingHorizontal: spacing.md,
		justifyContent: 'center',
	},
	choiceActive: {
		borderColor: uiColors.tubeSelected,
		backgroundColor: '#E8F2FF',
	},
	choiceLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: uiColors.textPrimary,
	},
	choiceLabelActive: {
		color: uiColors.tubeSelected,
	},
	actionButton: {
		minHeight: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionLabel: {
		fontSize: 15,
		fontWeight: '700',
		color: uiColors.textPrimary,
	},
	aboutLink: {
		paddingVertical: 6,
	},
	aboutLinkLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: uiColors.tubeSelected,
	},
	hint: {
		fontSize: 12,
		lineHeight: 17,
		color: uiColors.textSecondary,
	},
	aboutCard: {
		borderRadius: 12,
		backgroundColor: uiColors.surface,
		borderWidth: 1,
		borderColor: uiColors.border,
		padding: spacing.md,
		gap: 4,
	},
	aboutTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: uiColors.textPrimary,
		marginBottom: 4,
	},
	aboutBody: {
		fontSize: 13,
		color: uiColors.textSecondary,
	},
	pressed: {
		opacity: 0.88,
	},
	bottomStack: {
		width: '100%',
	},
})
