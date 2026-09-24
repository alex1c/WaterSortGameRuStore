import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { CampaignGameProvider, useSharedCampaignGame } from './src/hooks/CampaignGameContext'
import { useAppNavigation } from './src/navigation'
import { HomeScreen } from './src/screens/HomeScreen'
import { GameScreen } from './src/screens/GameScreen'
import { LevelSelectScreen } from './src/screens/LevelSelectScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'
import { StatisticsScreen } from './src/screens/StatisticsScreen'
import { AchievementsScreen } from './src/screens/AchievementsScreen'
import { AboutScreen } from './src/screens/AboutScreen'
import { FreePlayScreen } from './src/screens/FreePlayScreen'
import { FreePlayGameScreen } from './src/screens/FreePlayGameScreen'
import { initializeAds, preloadInterstitial } from './src/ads'
import { initializeAnalytics, trackEvent } from './src/analytics'
import { getDifficultyLabelRu } from './src/campaign'
import type { FreePlayDifficulty } from './src/freePlay'

/**
 * App entry: SafeAreaProvider + campaign/Free Play state + stack navigation.
 * Home is the root; Android Back pops toward Home and exits only there.
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
	const nav = useAppNavigation('home')
	const game = useSharedCampaignGame()
	const [forceFreePlayChooser, setForceFreePlayChooser] = useState(false)

	useEffect(() => {
		if (nav.current === 'home') trackEvent('home_opened')
		if (nav.current === 'statistics') trackEvent('statistics_opened')
		if (nav.current === 'achievements') trackEvent('achievements_opened')
		if (nav.current === 'free_play') trackEvent('free_play_opened')
	}, [nav.current])

	const openFreePlayDifficulty = (difficulty: FreePlayDifficulty) => {
		setForceFreePlayChooser(false)
		game.freePlay.startNewPuzzle(difficulty)
		nav.navigate('free_play_game')
	}

	if (nav.current === 'levels') {
		return (
			<LevelSelectScreen
				currentLevel={game.levelNumber}
				highestUnlockedLevel={game.highestUnlockedLevel}
				campaignComplete={game.campaignComplete}
				onSelectLevel={(level) => {
					game.openLevel(level)
					nav.navigate('game')
				}}
				onClose={() => nav.goHome()}
			/>
		)
	}

	if (nav.current === 'settings') {
		return (
			<SettingsScreen
				settings={game.settings}
				onChange={game.updateSettings}
				onReplayTutorial={() => {
					game.replayTutorial()
					nav.navigate('game')
				}}
				onOpenAbout={() => nav.navigate('about')}
				onClose={() => nav.goHome()}
			/>
		)
	}

	if (nav.current === 'about') {
		return <AboutScreen onClose={() => nav.goBack()} />
	}

	if (nav.current === 'statistics') {
		return (
			<StatisticsScreen
				statistics={game.statistics}
				onClose={() => nav.goHome()}
			/>
		)
	}

	if (nav.current === 'achievements') {
		return (
			<AchievementsScreen
				items={game.achievementProgress}
				onClose={() => nav.goHome()}
			/>
		)
	}

	if (nav.current === 'free_play') {
		const showDifficultyList =
			forceFreePlayChooser || !game.freePlay.hasSavedSession
		return (
			<FreePlayScreen
				hasSavedSession={game.freePlay.hasSavedSession}
				savedDifficultyLabel={game.freePlay.savedDifficultyLabel}
				savedMoveCount={game.freePlay.savedMoveCount}
				showDifficultyList={showDifficultyList}
				onContinue={() => {
					if (game.freePlay.resumeSavedSession()) {
						nav.navigate('free_play_game')
					}
				}}
				onRequestNewPuzzle={() => setForceFreePlayChooser(true)}
				onChooseDifficulty={openFreePlayDifficulty}
				onClose={() => {
					setForceFreePlayChooser(false)
					nav.goHome()
				}}
			/>
		)
	}

	if (nav.current === 'free_play_game') {
		return (
			<FreePlayGameScreen
				onOpenHome={() => nav.goHome()}
				onOpenSettings={() => nav.navigate('settings')}
				onChooseDifficulty={() => {
					setForceFreePlayChooser(true)
					nav.navigate('free_play')
				}}
			/>
		)
	}

	if (nav.current === 'game') {
		return (
			<GameScreen
				onOpenHome={() => nav.goHome()}
				onOpenLevels={() => nav.navigate('levels')}
				onOpenSettings={() => nav.navigate('settings')}
			/>
		)
	}

	return (
		<HomeScreen
			ready={game.ready}
			continueLevel={game.levelNumber}
			continueDifficultyLabel={
				game.ready ? game.difficultyLabel : getDifficultyLabelRu('BEGINNER')
			}
			levelsCompleted={game.levelsCompleted}
			hasMidLevelSession={game.hasMidLevelSession}
			onContinue={() => {
				game.continueGame()
				nav.navigate('game')
			}}
			onOpenLevels={() => nav.navigate('levels')}
			onOpenFreePlay={() => {
				setForceFreePlayChooser(false)
				nav.navigate('free_play')
			}}
			onOpenAchievements={() => nav.navigate('achievements')}
			onOpenStatistics={() => nav.navigate('statistics')}
			onOpenSettings={() => nav.navigate('settings')}
		/>
	)
}
