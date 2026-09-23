import { createContext, useContext, type ReactNode } from 'react'

import {
	useCampaignGame,
	type CampaignGameController,
} from '../hooks/useCampaignGame'

const CampaignGameContext = createContext<CampaignGameController | null>(null)

/** Provides one shared campaign controller for Game + Level Select screens. */
export function CampaignGameProvider({ children }: { children: ReactNode }) {
	const game = useCampaignGame()
	return (
		<CampaignGameContext.Provider value={game}>
			{children}
		</CampaignGameContext.Provider>
	)
}

export function useSharedCampaignGame(): CampaignGameController {
	const value = useContext(CampaignGameContext)
	if (!value) {
		throw new Error('useSharedCampaignGame requires CampaignGameProvider')
	}
	return value
}
