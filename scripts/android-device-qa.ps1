<#
.SYNOPSIS
  Safe Android device QA helper for Water Sort (ForestMusic / RuStore).

.DESCRIPTION
  Automates checks and prints copy-paste commands for launching the Expo
  development client against a real Android phone on Metro port 8081.

  SAFETY: this script NEVER automatically:
    - kills unknown processes
    - runs gradlew clean
    - deletes node_modules / android / caches
    - runs npm install / npm ci without demonstrated need
    - runs expo prebuild --clean
    - starts a heavy API37 AVD
    - changes tracked source or app version
    - silently switches Metro to 8082/8083

.PARAMETER SkipAdbReverse
  Skip adb reverse tcp:8081 tcp:8081.

.PARAMETER ShowLogcatHelp
  Print PID-filtered logcat helper commands.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File ./scripts/android-device-qa.ps1
#>

[CmdletBinding()]
param(
	[switch]$SkipAdbReverse,
	[switch]$ShowLogcatHelp
)

$ErrorActionPreference = 'Continue'

function Write-Section {
	param([string]$Title)
	Write-Host ''
	Write-Host ('=' * 72) -ForegroundColor Cyan
	Write-Host $Title -ForegroundColor Cyan
	Write-Host ('=' * 72) -ForegroundColor Cyan
}

function Write-Ok {
	param([string]$Message)
	Write-Host "[OK]  $Message" -ForegroundColor Green
}

function Write-Warn {
	param([string]$Message)
	Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail {
	param([string]$Message)
	Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Write-Info {
	param([string]$Message)
	Write-Host "[INFO] $Message" -ForegroundColor Gray
}

# ---------------------------------------------------------------------------
# Project constants (Water Sort / RuStore)
# ---------------------------------------------------------------------------
$PackageName = 'com.calculatorplatform.watersort'
$ExpoScheme = 'water-sort'
$MetroPort = 8081
$AltPorts = @(8082, 8083)
$AppDisplayName = 'Water Sort'

# Resolve repo root from this script location (scripts/ -> root).
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir '..')

Write-Section -Title '1. Project root'
Write-Info "Script: $ScriptDir"
Write-Info "Root:   $ProjectRoot"
Set-Location $ProjectRoot

$requiredMarkers = @('package.json', 'app.json', 'App.tsx')
$missing = @()
foreach ($marker in $requiredMarkers) {
	if (-not (Test-Path (Join-Path $ProjectRoot $marker))) {
		$missing += $marker
	}
}
if ($missing.Count -gt 0) {
	Write-Fail "Missing project markers: $($missing -join ', ')"
	Write-Warn 'Aborting further checks - wrong directory?'
	exit 1
}
Write-Ok "Project markers found ($($requiredMarkers -join ', '))"

# ---------------------------------------------------------------------------
# Git status (informational only - never modifies)
# ---------------------------------------------------------------------------
Write-Section -Title '2. Git status'
if (Test-Path (Join-Path $ProjectRoot '.git')) {
	try {
		$branch = git rev-parse --abbrev-ref HEAD 2>$null
		$sha = git rev-parse --short HEAD 2>$null
		Write-Info "Branch: $branch"
		Write-Info "HEAD:   $sha"
		git status --short --branch
		Write-Ok 'Git status printed (read-only)'
	} catch {
		Write-Warn "Git commands failed: $($_.Exception.Message)"
	}
} else {
	Write-Warn 'No .git directory - skip git checks'
}

# ---------------------------------------------------------------------------
# Android SDK + local.properties
# ---------------------------------------------------------------------------
Write-Section -Title '3. Android SDK / local.properties'

function Find-AndroidSdk {
	$candidates = @()
	if ($env:ANDROID_HOME) { $candidates += $env:ANDROID_HOME }
	if ($env:ANDROID_SDK_ROOT) { $candidates += $env:ANDROID_SDK_ROOT }
	$candidates += Join-Path $env:LOCALAPPDATA 'Android\Sdk'
	$candidates += 'C:\Android\Sdk'
	foreach ($path in ($candidates | Select-Object -Unique)) {
		if ($path -and (Test-Path $path)) {
			return (Resolve-Path $path).Path
		}
	}
	return $null
}

$sdkPath = Find-AndroidSdk
if ($sdkPath) {
	Write-Ok "Android SDK found: $sdkPath"
} else {
	Write-Fail 'Android SDK not found (ANDROID_HOME / ANDROID_SDK_ROOT / %LOCALAPPDATA%\Android\Sdk)'
}

$androidDir = Join-Path $ProjectRoot 'android'
$localProps = Join-Path $androidDir 'local.properties'

if (-not (Test-Path $androidDir)) {
	Write-Warn 'android/ folder missing (Expo CNG - generate later with: npx expo prebuild --platform android)'
	Write-Info 'local.properties will be created when android/ exists and SDK is known.'
} else {
	Write-Ok 'android/ directory exists'
	if (Test-Path $localProps) {
		Write-Ok "local.properties exists: $localProps"
		Get-Content $localProps | ForEach-Object { Write-Info $_ }
	} elseif ($sdkPath) {
		# Safe create only - does not delete or overwrite existing files.
		$sdkEscaped = $sdkPath -replace '\\', '\\'
		$content = "sdk.dir=$sdkEscaped"
		Set-Content -Path $localProps -Value $content -Encoding ASCII
		Write-Ok "Created local.properties with sdk.dir=$sdkPath"
	} else {
		Write-Fail 'Cannot create local.properties - SDK path unknown'
	}
}

# ---------------------------------------------------------------------------
# adb devices - prefer real hardware
# ---------------------------------------------------------------------------
Write-Section -Title '4. adb devices'

$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbCmd -and $sdkPath) {
	$platformToolsAdb = Join-Path $sdkPath 'platform-tools\adb.exe'
	if (Test-Path $platformToolsAdb) {
		$env:Path = "$(Split-Path $platformToolsAdb);$env:Path"
		$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
	}
}

$PreferredSerial = $null
if (-not $adbCmd) {
	Write-Fail 'adb not available on PATH'
} else {
	Write-Ok "adb: $($adbCmd.Source)"
	Write-Host ''
	adb devices -l
	Write-Host ''

	$deviceLines = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\S' }
	$ready = @($deviceLines | Where-Object { $_ -match '\tdevice(\s|$)' })
	$emulators = @($ready | Where-Object { $_ -match 'emulator-' })
	$physical = @($ready | Where-Object { $_ -notmatch 'emulator-' })

	if ($physical.Count -gt 0) {
		Write-Ok "Preferring real device(s): $($physical.Count) connected"
		$PreferredSerial = ($physical[0] -split '\s+')[0]
		Write-Info "Preferred serial: $PreferredSerial"
	} elseif ($emulators.Count -gt 0) {
		Write-Warn 'Only emulator(s) connected - ForestMusic QA prefers a real phone'
		$PreferredSerial = ($emulators[0] -split '\s+')[0]
	} else {
		Write-Fail 'No adb device in "device" state'
	}
}

# ---------------------------------------------------------------------------
# Metro ports 8081 / 8082 / 8083 - never silently switch
# ---------------------------------------------------------------------------
Write-Section -Title '5. Metro ports (8081 preferred)'

function Test-LocalPort {
	param([int]$Port)
	# Prefer a fast TcpClient probe - Test-NetConnection can hang for minutes
	# on closed ports under some Windows firewall / ICMP policies.
	$client = New-Object System.Net.Sockets.TcpClient
	try {
		$async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
		$ok = $async.AsyncWaitHandle.WaitOne(400)
		if (-not $ok) {
			return $false
		}
		$client.EndConnect($async)
		return $true
	} catch {
		return $false
	} finally {
		$client.Close()
	}
}

function Get-PortListeners {
	param([int]$Port)
	try {
		return @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
	} catch {
		return @()
	}
}

$port8081Open = Test-LocalPort -Port $MetroPort
$listeners8081 = Get-PortListeners -Port $MetroPort

if ($port8081Open) {
	Write-Warn "Port $MetroPort is already accepting connections (Metro may already be running)"
	foreach ($l in $listeners8081) {
		$proc = Get-Process -Id $l.OwningProcess -ErrorAction SilentlyContinue
		if ($proc) {
			Write-Info "Listener PID $($proc.Id) ($($proc.ProcessName))"
		}
	}
	Write-Warn 'Do NOT silently switch Metro to 8082. Reuse 8081 or stop the known Metro process yourself.'
} else {
	Write-Ok "Port $MetroPort is free"
}

foreach ($alt in $AltPorts) {
	if (Test-LocalPort -Port $alt) {
		Write-Warn "Port $alt is occupied - this script will NOT redirect Metro there"
	} else {
		Write-Info "Port $alt is free (unused by this helper)"
	}
}

# ---------------------------------------------------------------------------
# adb reverse for 8081
# ---------------------------------------------------------------------------
Write-Section -Title '6. adb reverse tcp:8081'
if ($SkipAdbReverse) {
	Write-Info 'Skipped (-SkipAdbReverse)'
} elseif (-not $adbCmd) {
	Write-Fail 'adb missing - cannot reverse'
} elseif (-not $PreferredSerial) {
	Write-Warn 'No preferred device - skip reverse'
} else {
	adb -s $PreferredSerial reverse tcp:$MetroPort tcp:$MetroPort
	if ($LASTEXITCODE -eq 0) {
		Write-Ok "adb -s $PreferredSerial reverse tcp:$MetroPort tcp:$MetroPort"
	} else {
		Write-Fail 'adb reverse failed'
	}
	Write-Host ''
	adb -s $PreferredSerial reverse --list
}

Write-Section -Title '7. Localhost Metro probe 127.0.0.1:8081'
$metroReachable = Test-LocalPort -Port $MetroPort
if ($metroReachable) {
	Write-Ok '127.0.0.1:8081 is reachable (bounded TCP probe; avoids Test-NetConnection hangs)'
} else {
	Write-Warn '127.0.0.1:8081 not reachable yet - start Metro with: npm start'
}

# ---------------------------------------------------------------------------
# Debug APK / assemble hints (commands only - no automatic clean/install)
# ---------------------------------------------------------------------------
Write-Section -Title '8. Debug APK / install commands (manual)'

$debugApkCandidates = @(
	'android\app\build\outputs\apk\debug\app-debug.apk',
	'android\app\build\outputs\apk\debug\app-debug-unsigned.apk'
)
$foundApk = $null
foreach ($rel in $debugApkCandidates) {
	$full = Join-Path $ProjectRoot $rel
	if (Test-Path $full) {
		$foundApk = $full
		break
	}
}

if ($foundApk) {
	Write-Ok "Debug APK: $foundApk"
} else {
	Write-Info 'Debug APK not found yet (expected before first assembleDebug)'
}

Write-Host ''
Write-Info 'Suggested commands (run manually when needed):'
Write-Host "  cd `"$ProjectRoot`""
Write-Host '  npx expo prebuild --platform android'
Write-Host '  cd android'
Write-Host '  .\gradlew.bat assembleDebug'
Write-Host '  adb -s <serial> install -r app\build\outputs\apk\debug\app-debug.apk'
Write-Host ''
Write-Warn 'This script does NOT run gradlew clean, prebuild --clean, or npm ci.'

# ---------------------------------------------------------------------------
# Installed package version via dumpsys
# ---------------------------------------------------------------------------
Write-Section -Title "9. dumpsys package $PackageName"
if ($adbCmd -and $PreferredSerial) {
	$dump = adb -s $PreferredSerial shell dumpsys package $PackageName 2>$null
	if ($dump -match 'versionName=(\S+)') {
		Write-Ok "Installed versionName=$($Matches[1])"
	} else {
		Write-Warn "Package $PackageName not installed (or dumpsys missing versionName)"
	}
	if ($dump -match 'versionCode=(\d+)') {
		Write-Info "versionCode=$($Matches[1])"
	}
	$dump | Select-String -Pattern 'versionName=|versionCode=|pkg=Package' | Select-Object -First 8 | ForEach-Object {
		Write-Info $_.Line.Trim()
	}
} else {
	Write-Warn 'Skip dumpsys - adb/device unavailable'
}

# ---------------------------------------------------------------------------
# Dev client deep link via Expo scheme + 127.0.0.1:8081
# ---------------------------------------------------------------------------
Write-Section -Title '10. Open Expo development client (explicit localhost)'

# Expo development-client URL form:
#   water-sort://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081
$encodedMetro = [System.Uri]::EscapeDataString("http://127.0.0.1:$MetroPort")
$devClientUrl = "${ExpoScheme}://expo-development-client/?url=$encodedMetro"

Write-Info "App name:  $AppDisplayName"
Write-Info "Package:   $PackageName"
Write-Info "Scheme:    $ExpoScheme"
Write-Info "Deep link: $devClientUrl"
Write-Host ''
Write-Info 'Launch manually (preferred - never auto-killed):'
Write-Host "  adb -s <serial> shell am start -a android.intent.action.VIEW -d `"$devClientUrl`" $PackageName"
Write-Host ''
Write-Info 'Or open the package main activity, then paste the URL in the dev client.'
Write-Host "  adb -s <serial> shell monkey -p $PackageName -c android.intent.category.LAUNCHER 1"

if ($adbCmd -and $PreferredSerial) {
	Write-Host ''
	Write-Info "Ready-to-run for preferred serial $PreferredSerial :"
	Write-Host "  adb -s $PreferredSerial shell am start -a android.intent.action.VIEW -d `"$devClientUrl`" $PackageName"
}

# ---------------------------------------------------------------------------
# PID lookup + logcat helper
# ---------------------------------------------------------------------------
Write-Section -Title '11. PID lookup / logcat helper'
if ($adbCmd -and $PreferredSerial) {
	$pidLine = adb -s $PreferredSerial shell pidof -s $PackageName 2>$null
	$appPid = ($pidLine | Out-String).Trim()
	if ($appPid -match '^\d+$') {
		Write-Ok "Running PID: $appPid"
	} else {
		Write-Info 'App not running (no PID) - start the dev client first'
		$appPid = '<PID>'
	}

	Write-Host ''
	Write-Info 'PID-filtered logcat (copy-paste):'
	Write-Host "  adb -s $PreferredSerial logcat --pid=$appPid"
	Write-Host "  adb -s $PreferredSerial logcat --pid=$appPid *:S ReactNative:V ReactNativeJS:V Expo:V"
} else {
	Write-Warn 'Skip PID/logcat - adb/device unavailable'
}

if ($ShowLogcatHelp) {
	Write-Host ''
	Write-Info 'Extra logcat tips:'
	Write-Host '  adb logcat -c'
	Write-Host "  adb logcat | Select-String $PackageName"
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Section -Title 'SUMMARY'
Write-Info "Project:     $ProjectRoot"
Write-Info "Package:     $PackageName"
Write-Info "Scheme:      $ExpoScheme"
Write-Info "Metro port:  $MetroPort (never auto-switched)"
Write-Info "SDK:         $(if ($sdkPath) { $sdkPath } else { 'NOT FOUND' })"
Write-Info "Device:      $(if ($PreferredSerial) { $PreferredSerial } else { 'NONE' })"
Write-Info "Metro 8081:  $(if ($metroReachable) { 'reachable' } else { 'not reachable' })"
Write-Host ''
Write-Ok 'QA helper finished (read-only / safe create local.properties only).'
Write-Host ''
