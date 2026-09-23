# Water Sort — RuStore / ForestMusic

Campaign Water Sort puzzle game for Android / RuStore.

## Stack

- Expo SDK 57
- React Native
- React 19
- TypeScript (strict)
- ESLint
- Jest (`jest-expo`)
- AsyncStorage (campaign progress)

## Package

- Android / application id: `com.calculatorplatform.watersort`
- Display name: **Water Sort**
- Expo development-client scheme: `water-sort`

## Scripts

```bash
npm start
npm run typecheck
npm run lint
npm test
npm run android:qa
```

## Campaign

Levels 1–100 are generated deterministically:

```text
seed = watersort-campaign-v1-level-{N}
```

Difficulty bands (UI labels): Новичок → Легко → Средне → Сложно → Эксперт.

## Source layout

```text
src/
  campaign/     # level config, createLevel, play session helpers
  components/   # tubes, controls, win modal, ad placeholder
  screens/      # GameScreen, LevelSelectScreen
  game/         # pure engine (core / solver / generator)
  hooks/        # useCampaignGame + context
  theme/
  storage/      # versioned AsyncStorage persistence
scripts/
```

## Settings (Phase 5)

- Animation speed: Обычная / Быстрая / Мгновенная
- Haptics + Sounds toggles
- Color modes: normal / high contrast / colors + symbols
- Replay Level 1 training without resetting campaign progress

Sound SFX assets are not bundled yet (toggle + API ready).
