import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { CampaignGameProvider, useSharedCampaignGame } from './src/hooks/CampaignGameContext'
import { GameScreen } from './src/screens/GameScreen'
import { LevelSelectScreen } from './src/screens/LevelSelectScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'
import { initializeAds, preloadInterstitial } from './src/ads'
import { initializeAnalytics, trackEvent } from './src/analytics'

type AppScreen = 'game' | 'levels' | 'settings'

/**
 * App entry: SafeAreaProvider is required so useSafeAreaInsets
 * reports real Android window insets on device.
 */
export default function App() {
	useEffect(() => {
		initializeAnalytics()
		initializeAds()
		trackEvent('app_started')
		void preloadInterstitial()
	}, [])

	return (
		<SafeAreaProvider>
			<StatusBar style="dark" />
			<CampaignGameProvider>
				<RootNavigation />
			</CampaignGameProvider>
		</SafeAreaProvider>
	)
}

function RootNavigation() {
	const [screen, setScreen] = useState<AppScreen>('game')
	const game = useSharedCampaignGame()

	if (screen === 'levels') {
		return (
			<LevelSelectScreen
				currentLevel={game.levelNumber}
				highestUnlockedLevel={game.highestUnlockedLevel}
				campaignComplete={game.campaignComplete}
				onSelectLevel={(level) => {
					game.openLevel(level)
					setScreen('game')
				}}
				onClose={() => setScreen('game')}
			/>
		)
	}

	if (screen === 'settings') {
		return (
			<SettingsScreen
				settings={game.settings}
				onChange={game.updateSettings}
				onReplayTutorial={() => {
					game.replayTutorial()
					setScreen('game')
				}}
				onClose={() => setScreen('game')}
			/>
		)
	}

	return (
		<GameScreen
			onOpenLevels={() => setScreen('levels')}
			onOpenSettings={() => setScreen('settings')}
		/>
	)
}
