import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { GameScreen } from './src/screens/GameScreen'

/**
 * App entry: SafeAreaProvider is required so useSafeAreaInsets
 * reports real Android window insets on device (not just emulator chrome).
 */
export default function App() {
	return (
		<SafeAreaProvider>
			<StatusBar style="dark" />
			<GameScreen />
		</SafeAreaProvider>
	)
}
