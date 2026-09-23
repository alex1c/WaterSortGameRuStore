import AsyncStorage from '@react-native-async-storage/async-storage'

import { STORAGE_KEY, STORAGE_SCHEMA_VERSION, createDefaultPersistedState, type PersistedGameState } from './types'
import { parsePersistedGameState } from './parse'

/**
 * Load campaign progress. Corrupt / incomplete payloads fall back safely
 * without throwing so the app never crashes on bad storage.
 */
export async function loadPersistedGameState(): Promise<PersistedGameState> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_KEY)
		if (!raw) {
			return createDefaultPersistedState()
		}
		return parsePersistedGameState(raw)
	} catch {
		return createDefaultPersistedState()
	}
}

export async function savePersistedGameState(state: PersistedGameState): Promise<void> {
	const payload: PersistedGameState = {
		...state,
		schemaVersion: STORAGE_SCHEMA_VERSION,
	}
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export async function clearPersistedGameState(): Promise<void> {
	await AsyncStorage.removeItem(STORAGE_KEY)
}

export { parsePersistedGameState } from './parse'
