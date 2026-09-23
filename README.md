# Water Sort — RuStore / ForestMusic

Phase 1 playable UI shell for a Water Sort puzzle game targeting Android / RuStore.

## Stack

- Expo SDK 57
- React Native
- React 19
- TypeScript (strict)
- ESLint
- Jest (`jest-expo`)

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

Android device QA helper (safe, read-only except optional `local.properties` create):

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/android-device-qa.ps1
```

Open the development client against localhost Metro:

```text
water-sort://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081
```

## Source layout

```text
src/
  components/   # Tube, board, controls, AdBannerPlaceholder
  screens/      # GameScreen
  game/         # Temporary sample board + pour logic (replace later)
  theme/        # Centralized palette / spacing
  hooks/
  storage/
scripts/
```

## Phase 1 notes

- Sample board only — no solver / generator / ads SDK / AppMetrica.
- Bottom layout: controls → fake ad banner → real safe-area inset.
- `AdBannerPlaceholder` reserves space for a future small banner.
