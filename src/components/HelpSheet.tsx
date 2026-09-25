import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import {
	canGrantExtraTube,
	totalHintCredits,
	type PuzzleHelpState,
} from '../help'
import { spacing, uiColors } from '../theme'

export type HelpDialogKind =
	| 'menu'
	| 'hint_pack_offer'
	| 'extra_tube_confirm'
	| null

interface HelpSheetProps {
	visible: boolean
	dialog: HelpDialogKind
	help: PuzzleHelpState
	isSolved: boolean
	hintSearching: boolean
	rewardLoading: boolean
	onClose: () => void
	onRequestHint: () => void
	onRequestExtraTube: () => void
	onConfirmHintPack: () => void
	onConfirmExtraTube: () => void
	onCancelDialog: () => void
}

/**
 * Compact voluntary-help sheet. Lives in the normal flex stack flow via a
 * Modal overlay — never absolutely pinned under system navigation.
 */
export function HelpSheet({
	visible,
	dialog,
	help,
	isSolved,
	hintSearching,
	rewardLoading,
	onClose,
	onRequestHint,
	onRequestExtraTube,
	onConfirmHintPack,
	onConfirmExtraTube,
	onCancelDialog,
}: HelpSheetProps) {
	const credits = totalHintCredits(help)
	const canOfferTube = canGrantExtraTube(help) && !isSolved

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<Pressable style={styles.backdrop} onPress={onClose} testID="help-sheet-backdrop">
				<Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()} testID="help-sheet">
					{dialog === null || dialog === 'menu' ? (
						<HelpMenu
							credits={credits}
							help={help}
							canOfferTube={canOfferTube}
							hintSearching={hintSearching}
							isSolved={isSolved}
							onRequestHint={onRequestHint}
							onRequestExtraTube={onRequestExtraTube}
							onClose={onClose}
						/>
					) : null}

					{dialog === 'hint_pack_offer' ? (
						<HintPackOffer
							rewardLoading={rewardLoading}
							onConfirm={onConfirmHintPack}
							onCancel={onCancelDialog}
						/>
					) : null}

					{dialog === 'extra_tube_confirm' ? (
						<ExtraTubeConfirm
							rewardLoading={rewardLoading}
							onConfirm={onConfirmExtraTube}
							onCancel={onCancelDialog}
						/>
					) : null}
				</Pressable>
			</Pressable>
		</Modal>
	)
}

function HelpMenu({
	credits,
	help,
	canOfferTube,
	hintSearching,
	isSolved,
	onRequestHint,
	onRequestExtraTube,
	onClose,
}: {
	credits: number
	help: PuzzleHelpState
	canOfferTube: boolean
	hintSearching: boolean
	isSolved: boolean
	onRequestHint: () => void
	onRequestExtraTube: () => void
	onClose: () => void
}) {
	const hintMeta =
		credits > 0
			? credits === 1
				? '1 осталась'
				: `${credits} осталось`
			: 'Ещё 3 подсказки за рекламу'

	const freeMeta =
		help.freeHintsRemaining > 0
			? `${help.freeHintsRemaining} бесплатно`
			: null

	return (
		<>
			<Text style={styles.title}>Помощь</Text>
			{!isSolved ? (
				<>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Подсказка"
						disabled={hintSearching}
						onPress={onRequestHint}
						style={({ pressed }) => [
							styles.action,
							pressed && styles.pressed,
							hintSearching && styles.disabled,
						]}
						testID="help-hint-action"
					>
						<Text style={styles.actionTitle}>
							{hintSearching ? 'Ищем подсказку…' : 'Подсказка'}
						</Text>
						<Text style={styles.actionMeta}>
							{freeMeta ? `${freeMeta} · ${hintMeta}` : hintMeta}
						</Text>
					</Pressable>

					{canOfferTube ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Добавить пробирку за рекламу"
							onPress={onRequestExtraTube}
							style={({ pressed }) => [styles.action, pressed && styles.pressed]}
							testID="help-extra-tube-action"
						>
							<Text style={styles.actionTitle}>+ Пробирка</Text>
							<Text style={styles.actionMeta}>за рекламу</Text>
						</Pressable>
					) : help.extraTubeGranted ? (
						<View style={styles.infoBlock} testID="help-extra-tube-granted">
							<Text style={styles.infoText}>Дополнительная пробирка добавлена</Text>
						</View>
					) : null}
				</>
			) : (
				<Text style={styles.infoText}>Головоломка уже решена</Text>
			)}

			<Pressable
				accessibilityRole="button"
				onPress={onClose}
				style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
			>
				<Text style={styles.secondaryLabel}>Закрыть</Text>
			</Pressable>
		</>
	)
}

function HintPackOffer({
	rewardLoading,
	onConfirm,
	onCancel,
}: {
	rewardLoading: boolean
	onConfirm: () => void
	onCancel: () => void
}) {
	return (
		<View testID="help-hint-pack-offer">
			<Text style={styles.title}>Нужны ещё подсказки?</Text>
			<Text style={styles.body}>
				Бесплатные подсказки закончились. Посмотрите короткую рекламу и получите
				ещё 3 подсказки для этой головоломки.
			</Text>
			<Pressable
				accessibilityRole="button"
				disabled={rewardLoading}
				onPress={onConfirm}
				style={({ pressed }) => [
					styles.primaryBtn,
					pressed && styles.pressed,
					rewardLoading && styles.disabled,
				]}
				testID="help-hint-pack-confirm"
			>
				<Text style={styles.primaryLabel}>
					{rewardLoading ? 'Загружаем рекламу…' : 'Получить 3 подсказки'}
				</Text>
			</Pressable>
			<Pressable
				accessibilityRole="button"
				disabled={rewardLoading}
				onPress={onCancel}
				style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
			>
				<Text style={styles.secondaryLabel}>Не сейчас</Text>
			</Pressable>
		</View>
	)
}

function ExtraTubeConfirm({
	rewardLoading,
	onConfirm,
	onCancel,
}: {
	rewardLoading: boolean
	onConfirm: () => void
	onCancel: () => void
}) {
	return (
		<View testID="help-extra-tube-confirm">
			<Text style={styles.title}>Добавить пустую пробирку?</Text>
			<Text style={styles.body}>
				Дополнительная пробирка останется до конца этой головоломки и сделает
				решение проще.
			</Text>
			<Pressable
				accessibilityRole="button"
				disabled={rewardLoading}
				onPress={onConfirm}
				style={({ pressed }) => [
					styles.primaryBtn,
					pressed && styles.pressed,
					rewardLoading && styles.disabled,
				]}
				testID="help-extra-tube-confirm-ad"
			>
				<Text style={styles.primaryLabel}>
					{rewardLoading ? 'Загружаем рекламу…' : 'Посмотреть рекламу'}
				</Text>
			</Pressable>
			<Pressable
				accessibilityRole="button"
				disabled={rewardLoading}
				onPress={onCancel}
				style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
			>
				<Text style={styles.secondaryLabel}>Отмена</Text>
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: uiColors.overlay,
		justifyContent: 'flex-end',
	},
	sheet: {
		backgroundColor: uiColors.surface,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		paddingHorizontal: spacing.md,
		paddingTop: spacing.md,
		paddingBottom: spacing.lg,
		gap: spacing.sm,
	},
	title: {
		color: uiColors.textPrimary,
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 4,
	},
	body: {
		color: uiColors.textSecondary,
		fontSize: 14,
		lineHeight: 20,
		marginBottom: spacing.sm,
	},
	action: {
		borderWidth: 1,
		borderColor: uiColors.controlBorder,
		backgroundColor: uiColors.controlBackground,
		borderRadius: 10,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm + 2,
		minHeight: 52,
		justifyContent: 'center',
	},
	actionTitle: {
		color: uiColors.textPrimary,
		fontSize: 15,
		fontWeight: '700',
	},
	actionMeta: {
		color: uiColors.textSecondary,
		fontSize: 13,
		marginTop: 2,
	},
	infoBlock: {
		paddingVertical: spacing.sm,
	},
	infoText: {
		color: uiColors.textSecondary,
		fontSize: 14,
	},
	primaryBtn: {
		backgroundColor: uiColors.tubeSelected,
		borderRadius: 10,
		minHeight: 48,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.md,
	},
	primaryLabel: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '700',
	},
	secondaryBtn: {
		minHeight: 44,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.md,
	},
	secondaryLabel: {
		color: uiColors.textSecondary,
		fontSize: 14,
		fontWeight: '600',
	},
	pressed: {
		opacity: 0.88,
	},
	disabled: {
		opacity: 0.55,
	},
})
