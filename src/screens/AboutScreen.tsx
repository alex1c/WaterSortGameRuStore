import {
	Alert,
	Linking,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BannerSlot } from '../components/BannerSlot'
import {
	ABOUT_APP_NAME,
	ABOUT_DEVELOPER,
	ABOUT_OTHER_APPS_URL,
	ABOUT_PRIVACY_URL,
	ABOUT_WEBSITE_URL,
} from '../about/config'
import { CAMPAIGN_LEVEL_COUNT } from '../campaign'
import { spacing, uiColors } from '../theme'

interface AboutScreenProps {
	onClose: () => void
}

async function openExternalUrl(url: string) {
	try {
		const supported = await Linking.canOpenURL(url)
		if (!supported) throw new Error('URL is not supported')
		await Linking.openURL(url)
	} catch {
		Alert.alert('Не удалось открыть ссылку', 'Проверьте подключение к интернету.')
	}
}

export function AboutScreen({ onClose }: AboutScreenProps) {
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
			testID="about-screen"
		>
			<View style={styles.header}>
				<Text style={styles.title}>О программе</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Назад"
					onPress={onClose}
					style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
				>
					<Text style={styles.backLabel}>Назад</Text>
				</Pressable>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.appName}>{ABOUT_APP_NAME}</Text>
				<Text style={styles.meta}>{ABOUT_DEVELOPER}</Text>
				<Text style={styles.meta}>Кампания: уровни 1–{CAMPAIGN_LEVEL_COUNT}</Text>
				<Text style={styles.meta}>Версия 1.0.0</Text>

				<Pressable
					accessibilityRole="button"
					onPress={() => void openExternalUrl(ABOUT_WEBSITE_URL)}
					style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
				>
					<Text style={styles.linkLabel}>Сайт ForestMusic</Text>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					onPress={() => void openExternalUrl(ABOUT_OTHER_APPS_URL)}
					style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
				>
					<Text style={styles.linkLabel}>Другие наши приложения</Text>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					onPress={() => void openExternalUrl(ABOUT_PRIVACY_URL)}
					style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
				>
					<Text style={styles.linkLabel}>Политика конфиденциальности</Text>
				</Pressable>
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
		gap: spacing.sm,
	},
	appName: {
		fontSize: 18,
		fontWeight: '700',
		color: uiColors.textPrimary,
		marginBottom: spacing.sm,
	},
	meta: {
		fontSize: 14,
		color: uiColors.textSecondary,
	},
	linkButton: {
		marginTop: spacing.sm,
		minHeight: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		alignItems: 'center',
		justifyContent: 'center',
	},
	linkLabel: {
		fontSize: 15,
		fontWeight: '700',
		color: uiColors.tubeSelected,
	},
	pressed: { opacity: 0.88 },
	bottomStack: { width: '100%' },
})
