import { useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { CampaignGameProvider, useSharedCampaignGame } from './src/hooks/CampaignGameContext'
import { GameScreen } from './src/screens/GameScreen'
import { LevelSelectScreen } from './src/screens/LevelSelectScreen'

/**
 * App entry: SafeAreaProvider is required so useSafeAreaInsets
 * reports real Android window insets on device.
 */
export default function App() {
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
	const [screen, setScreen] = useState<'game' | 'levels'>('game')
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

	return <GameScreen onOpenLevels={() => setScreen('levels')} />
}
