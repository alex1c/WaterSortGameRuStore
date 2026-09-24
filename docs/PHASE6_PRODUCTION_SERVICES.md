# Phase 6 production services

## Tooling checkpoint

- ForestMusic DevTools: v1.0.0
- Commit: `43e8c09c31a1274e7e8180dce34d32d8f915cc69`
- Canonical Android QA script: `scripts/android-device-qa.ps1`

## Services

- AppMetrica is initialized once with the Water Sort API key. Event payloads
  are allow-listed scalar fields; board state, private text and identifiers
  are not sent. Analytics failures are ignored by gameplay.
- Yandex Mobile Ads is the only advertising stack. Banner mapping is game ->
  `R-M-20102113-1`, levels -> `R-M-20102113-2`, and informational screens ->
  `R-M-20102113-3`.
- Banner no-fill/error keeps the measured slot reservation in place, using the
  fallback minimum height until the next screen mount. The ad is in normal
  layout flow and never overlays controls or the system inset.
- Interstitial `R-M-20102113-4` is cached without showing on startup and is
  eligible only after five non-tutorial completed levels, at a solved-level
  boundary, with a five-minute cooldown and one-show-per-session guard.
  Failure/no-fill returns immediately and does not gate Next Level.
- Rewarded `R-M-20102113-5` is service-only in Phase 6. No UI action is
  exposed yet. A reward can be granted only from the SDK reward callback,
  once per request; dismissal and failure grant nothing.
- App-open `R-M-20102113-6` is recorded for configuration only. Automatic
  app-open display is intentionally disabled in this phase.
- No purchases or Remove Ads control are included.

## Privacy and release notes

- Privacy URL: <https://alex1c.github.io/WaterSortGameRuStore/>
- Reachability was not verifiable from this environment; the owner-configured
  URL is recorded here and pending publication/availability does not block the
  Phase 6 recovery commit.
- The app has no user-entered personal-data flow and does not use files,
  photos, microphone or location in the current source.
- The AppMetrica package includes advertising-identifier-related native
  support, but the integration disables advertising-identifier tracking in
  the AppMetrica activation config. Final merged-manifest and dependency
  audits must use the native checkpoint, not app.json inference.

## Native audit checkpoint

- Resolved native ads version: Yandex Mobile Ads 8.5.0. The dependency graph
  contains `play-services-ads-identifier` and `play-services-appset`, but no
  `play-services-ads`, `play-services-ads-lite`, `play-services-ads-base`, or
  Google mediation adapter.
- The generated debug merged manifest contains `INTERNET`, `VIBRATE`,
  `ACCESS_NETWORK_STATE`, `com.google.android.gms.permission.AD_ID`, and
  install-referrer permissions. `ACCESS_NETWORK_STATE` and `AD_ID` are from
  Yandex; install-referrer is from the AppMetrica/Yandex native graph.
- `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` are blocked through
  Expo config. `SYSTEM_ALERT_WINDOW` remains debug-only from the React Native
  debug manifest; it is not an app feature and is not expected in a release
  manifest. No `POST_NOTIFICATIONS`, `RECORD_AUDIO`, `CAMERA`, or location
  permission is present in the generated debug manifest.
- A release Gradle checkpoint was attempted but stopped in third-party lint
  analysis after Gradle exhausted its configured metaspace; a later release
  build should recheck the final release merged manifest.
