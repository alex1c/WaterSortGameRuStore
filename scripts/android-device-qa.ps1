[CmdletBinding()]
param(
	[switch]$Build,
	[switch]$Logcat,
	[string]$ProjectPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$MetroPort = 8081
$MetroStatusUrl = "http://127.0.0.1:$MetroPort/status"
$DevClientHost = '127.0.0.1'
$script:ProjectRoot = $null
$script:LocationPushed = $false

function Write-Stage([string]$Title) {
	Write-Host ""
	Write-Host "[$Title]" -ForegroundColor Cyan
}

function Write-Pass([string]$Message) {
	Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Warn([string]$Message) {
	Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Stop-QA([string]$Layer, [string]$Reason, [string]$Suggestion) {
	throw "QA_STOP|$Layer|$Reason|$Suggestion"
}

function Resolve-Executable([string[]]$Names) {
	foreach ($name in $Names) {
		$command = Get-Command $name -ErrorAction SilentlyContinue
		if ($null -ne $command) {
			return $command.Source
		}
	}
	return $null
}

function Invoke-NativeCommand {
	param(
		[string]$FilePath,
		[string[]]$Arguments,
		[switch]$AllowNonZero
	)

	$previousErrorActionPreference = $ErrorActionPreference
	$ErrorActionPreference = 'Continue'
	try {
		$output = @(& $FilePath @Arguments 2>&1 | ForEach-Object { "$_" })
		$exitCode = $LASTEXITCODE
	} finally {
		$ErrorActionPreference = $previousErrorActionPreference
	}
	if (-not $AllowNonZero -and $exitCode -ne 0) {
		$detail = ($output -join [Environment]::NewLine).Trim()
		if ($detail.Length -gt 1200) {
			$detail = $detail.Substring([Math]::Max(0, $detail.Length - 1200))
		}
		Stop-QA 'External command' "$FilePath exited with code $exitCode. $detail" 'Run the command manually and inspect the first failing layer.'
	}
	return [PSCustomObject]@{
		Output = $output
		ExitCode = $exitCode
	}
}

function Get-OptionalProperty($Object, [string]$Name) {
	if ($null -eq $Object) {
		return $null
	}
	$property = $Object.PSObject.Properties[$Name]
	if ($null -eq $property) {
		return $null
	}
	return $property.Value
}

function Get-FirstString($Value) {
	foreach ($item in @($Value)) {
		if ($null -ne $item -and "$item".Trim().Length -gt 0) {
			return "$item".Trim()
		}
	}
	return $null
}

function Get-ExpoConfig([string]$NpxPath) {
	$result = Invoke-NativeCommand $NpxPath @('expo', 'config', '--json')
	$text = ($result.Output -join [Environment]::NewLine)
	$start = $text.IndexOf('{')
	$end = $text.LastIndexOf('}')
	if ($start -lt 0 -or $end -le $start) {
		Stop-QA 'Expo config' 'npx expo config --json did not return parseable JSON.' 'Run npx expo config --json manually and inspect Expo CLI output.'
	}
	try {
		return ($text.Substring($start, $end - $start + 1) | ConvertFrom-Json)
	} catch {
		Stop-QA 'Expo config' "Unable to parse Expo config JSON: $($_.Exception.Message)" 'Run npx expo config --json manually.'
	}
}

function Get-SdkCandidates {
	$candidates = @(
		$env:ANDROID_HOME,
		$env:ANDROID_SDK_ROOT,
		$(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'Android\Sdk' } else { $null }),
		$(if ($env:USERPROFILE) { Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk' } else { $null })
	)
	return @($candidates | Where-Object { $_ -and "$($_)".Trim().Length -gt 0 } | Select-Object -Unique)
}

function Read-LocalSdkPath([string]$Path) {
	if (-not (Test-Path -LiteralPath $Path)) {
		return $null
	}
	$line = Get-Content -LiteralPath $Path | Where-Object { $_ -match '^\s*sdk\.dir=(.+)$' } | Select-Object -First 1
	if ($null -eq $line) {
		return $null
	}
	$value = ([regex]::Match($line, '^\s*sdk\.dir=(.+)$')).Groups[1].Value.Trim()
	return $value.Replace('\\', '\')
}

function Get-PortListeners([int]$Port) {
	try {
		$connections = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop)
		return @($connections | ForEach-Object {
			[PSCustomObject]@{
				Pid = [int]$_.OwningProcess
				Endpoint = "$($_.LocalAddress):$($_.LocalPort)"
			}
		} | Sort-Object Pid, Endpoint -Unique)
	} catch {
		$netstat = @(& netstat.exe -ano -p tcp 2>$null | ForEach-Object { "$_" })
		$matches = @()
		foreach ($line in $netstat) {
			if ($line -match "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$") {
				$matches += [PSCustomObject]@{ Pid = [int]$Matches[1]; Endpoint = "netstat:$Port" }
			}
		}
		return @($matches | Sort-Object Pid, Endpoint -Unique)
	}
}

function Get-ProcessDetails([int]$ProcessId) {
	try {
		$process = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
		return [PSCustomObject]@{
			Name = Get-FirstString $process.Name
			Path = Get-FirstString $process.ExecutablePath
			CommandLine = Get-FirstString $process.CommandLine
		}
	} catch {
		try {
			$process = Get-Process -Id $ProcessId -ErrorAction Stop
			return [PSCustomObject]@{
				Name = $process.ProcessName
				Path = Get-FirstString $process.Path
				CommandLine = $null
			}
		} catch {
			return [PSCustomObject]@{ Name = $null; Path = $null; CommandLine = $null }
		}
	}
}

function Format-PortOwner([int]$ProcessId) {
	$details = Get-ProcessDetails $ProcessId
	$name = if ($details.Name) { $details.Name } else { 'unknown-process' }
	$path = if ($details.Path) { $details.Path } else { 'path-unavailable' }
	return "PID $ProcessId; process $name; path $path"
}

function Test-IPv4Port([int]$Port) {
	$testNetConnection = Get-Command Test-NetConnection -ErrorAction SilentlyContinue
	if ($null -ne $testNetConnection) {
		try {
			return [bool](Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue)
		} catch {
			return $false
		}
	}
	try {
		$client = [System.Net.Sockets.TcpClient]::new()
		$async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
		$connected = $async.AsyncWaitHandle.WaitOne(500)
		if ($connected -and $client.Connected) {
			$client.Close()
			return $true
		}
		$client.Close()
		return $false
	} catch {
		return $false
	}
}

function Test-MetroHealth {
	if (-not (Test-IPv4Port $MetroPort)) {
		return $false
	}
	try {
		$response = Invoke-WebRequest -UseBasicParsing -Uri $MetroStatusUrl -TimeoutSec 3
		$content = $response.Content
		if ($content -is [byte[]]) {
			$content = [Text.Encoding]::UTF8.GetString($content)
		}
		return "$content" -match 'packager-status\s*:\s*running'
	} catch {
		return $false
	}
}

function Test-CurrentProjectMetro([int]$ProcessId, [string]$Root) {
	$details = Get-ProcessDetails $ProcessId
	$commandLine = if ($details.CommandLine) { $details.CommandLine.ToLowerInvariant() } else { '' }
	$rootToken = ([IO.Path]::GetFullPath($Root)).TrimEnd('\').ToLowerInvariant()
	return $commandLine.Contains($rootToken) -and $commandLine -match 'expo[\\/].*\bstart\b'
}

function Get-InstalledPackageInfo([string]$AdbPath, [string]$Serial, [string]$PackageName) {
	$result = Invoke-NativeCommand $AdbPath @('-s', $Serial, 'shell', 'dumpsys', 'package', $PackageName) -AllowNonZero
	$text = ($result.Output -join [Environment]::NewLine)
	if ($result.ExitCode -ne 0 -or $text -notmatch [regex]::Escape($PackageName)) {
		return $null
	}
	$versionName = $null
	$versionCode = $null
	$nameMatch = [regex]::Match($text, 'versionName=([^\s]+)')
	$codeMatch = [regex]::Match($text, 'versionCode[=:](\d+)')
	if ($nameMatch.Success) { $versionName = $nameMatch.Groups[1].Value }
	if ($codeMatch.Success) { $versionCode = $codeMatch.Groups[1].Value }
	return [PSCustomObject]@{ VersionName = $versionName; VersionCode = $versionCode }
}

<#
function Invoke-PhoneMetroHealth([string]$AdbPath, [string]$Serial) {
	$curl = Invoke-NativeCommand $AdbPath @('-s', $Serial, 'shell', 'command', '-v', 'curl') -AllowNonZero
	if ($curl.ExitCode -eq 0 -and ($curl.Output -join '').Trim().Length -gt 0) {
		$result = Invoke-NativeCommand $AdbPath @('-s', $Serial, 'shell', 'curl', '-s', '--max-time', '5', $MetroStatusUrl) -AllowNonZero
		$text = ($result.Output -join [Environment]::NewLine)
		if ($result.ExitCode -ne 0 -or $text -notmatch 'packager-status\s*:\s*running') {
			#
			#
			#
			Stop-QA 'Phone → Metro' 'Device curl reached no healthy Metro status.' 'Verify adb reverse and keep Metro on --host lan --port 8081.'
			#
			Stop-QA 'Phone to Metro' 'Device curl reached no healthy Metro status.' 'Verify adb reverse and keep Metro on --host lan --port 8081.'
			#
			Stop-QA 'Phone to Metro' 'Device wget reached no healthy Metro status.' 'Verify adb reverse and keep Metro on --host lan --port 8081.'
		}
		return 'curl'
	}

	$wget = Invoke-NativeCommand $AdbPath @('-s', $Serial, 'shell', 'command', '-v', 'wget') -AllowNonZero
	if ($wget.ExitCode -eq 0 -and ($wget.Output -join '').Trim().Length -gt 0) {
		$result = Invoke-NativeCommand $AdbPath @('-s', $Serial, 'shell', 'wget', '-q', '-O', '-', $MetroStatusUrl) -AllowNonZero
		$text = ($result.Output -join [Environment]::NewLine)
		if ($result.ExitCode -ne 0 -or $text -notmatch 'packager-status\s*:\s*running') {
			Stop-QA 'Phone → Metro' 'Device wget reached no healthy Metro status.' 'Verify adb reverse and keep Metro on --host lan --port 8081.'
		}
			#
			Stop-QA 'Phone to Metro' 'Device wget reached no healthy Metro status.' 'Verify adb reverse and keep Metro on --host lan --port 8081.'
		}
		return 'wget'
	}
	return $null
}

 #>
function Invoke-PhoneMetroHealth([string]$AdbPath, [string]$Serial) {
	$curl = Invoke-NativeCommand $AdbPath @('-s', $Serial, 'shell', 'command', '-v', 'curl') -AllowNonZero
	if ($curl.ExitCode -eq 0 -and ($curl.Output -join '').Trim().Length -gt 0) {
		$result = Invoke-NativeCommand $AdbPath @('-s', $Serial, 'shell', 'curl', '-s', '--max-time', '5', $MetroStatusUrl) -AllowNonZero
		$text = ($result.Output -join [Environment]::NewLine)
		if ($result.ExitCode -ne 0 -or $text -notmatch 'packager-status\s*:\s*running') {
			Stop-QA 'Phone to Metro' 'Device curl reached no healthy Metro status.' 'Verify adb reverse and keep Metro on --host lan --port 8081.'
		}
		return 'curl'
	}

	$wget = Invoke-NativeCommand $AdbPath @('-s', $Serial, 'shell', 'command', '-v', 'wget') -AllowNonZero
	if ($wget.ExitCode -eq 0 -and ($wget.Output -join '').Trim().Length -gt 0) {
		$result = Invoke-NativeCommand $AdbPath @('-s', $Serial, 'shell', 'wget', '-q', '-O', '-', $MetroStatusUrl) -AllowNonZero
		$text = ($result.Output -join [Environment]::NewLine)
		if ($result.ExitCode -ne 0 -or $text -notmatch 'packager-status\s*:\s*running') {
			Stop-QA 'Phone to Metro' 'Device wget reached no healthy Metro status.' 'Verify adb reverse and keep Metro on --host lan --port 8081.'
		}
		return 'wget'
	}
	return $null
}

try {
	$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
	$inferredRoot = Split-Path -Parent $scriptDirectory
	if ($ProjectPath) {
		if (-not (Test-Path -LiteralPath $ProjectPath -PathType Container)) {
			Stop-QA 'Project' "ProjectPath does not exist: $ProjectPath" 'Pass a valid project root or omit -ProjectPath when the script is inside <project>\scripts.'
		}
		$script:ProjectRoot = (Resolve-Path -LiteralPath $ProjectPath).Path
	} else {
		$script:ProjectRoot = (Resolve-Path -LiteralPath $inferredRoot).Path
	}
	if (-not (Test-Path -LiteralPath (Join-Path $script:ProjectRoot 'package.json') -PathType Leaf)) {
		Stop-QA 'Project' "package.json was not found at $script:ProjectRoot" 'Copy the script into <project>\scripts or pass -ProjectPath.'
	}

	Push-Location $script:ProjectRoot
	$script:LocationPushed = $true
	Write-Host '========================================' -ForegroundColor Cyan
	Write-Host 'ForestMusic Android device QA startup' -ForegroundColor Cyan
	Write-Host '========================================' -ForegroundColor Cyan
	Write-Host "PROJECT: $script:ProjectRoot"
	Write-Host "PATH: $scriptDirectory"
	Write-Host "TIMESTAMP: $((Get-Date).ToString('o'))"

	Write-Stage 'Git'
	$git = Resolve-Executable @('git.exe', 'git')
	if (-not $git) { Stop-QA 'Git' 'git was not found on PATH.' 'Install Git or add it to PATH.' }
	$gitStatus = Invoke-NativeCommand $git @('status', '--short')
	if (@($gitStatus.Output).Count -gt 0) {
		$details = ($gitStatus.Output -join [Environment]::NewLine)
		Write-Host $details -ForegroundColor Yellow
		Stop-QA 'Git' 'Working tree is dirty; QA stopped before device actions.' 'Inspect the changes and rerun with an intentionally clean tree.'
	}
	$sha = (Invoke-NativeCommand $git @('rev-parse', 'HEAD')).Output | Select-Object -First 1
	$branch = (Invoke-NativeCommand $git @('rev-parse', '--abbrev-ref', 'HEAD')).Output | Select-Object -First 1
	Write-Host "SHA: $sha"
	Write-Host "BRANCH: $branch"
	Write-Pass 'Git'

	Write-Stage 'Expo config'
	$npx = Resolve-Executable @('npx.cmd', 'npx.exe', 'npx')
	if (-not $npx) { Stop-QA 'Expo config' 'npx was not found on PATH.' 'Install Node.js/npm and ensure npx is available.' }
	$expoConfig = Get-ExpoConfig $npx
	$androidConfig = Get-OptionalProperty $expoConfig 'android'
	$expoName = Get-FirstString (Get-OptionalProperty $expoConfig 'name')
	$expoVersion = Get-FirstString (Get-OptionalProperty $expoConfig 'version')
	$expoScheme = Get-FirstString (Get-OptionalProperty $expoConfig 'scheme')
	$packageName = Get-FirstString (Get-OptionalProperty $androidConfig 'package')
	$expectedVersionCode = Get-FirstString (Get-OptionalProperty $androidConfig 'versionCode')
	if (-not $packageName) { Stop-QA 'Expo config' 'Resolved Expo config has no android.package.' 'Add a valid Android package to the app config.' }
	if (-not $expoScheme) { Stop-QA 'Expo config' 'Resolved Expo config has no scheme.' 'Add a URL scheme to the app config before dev-client launch.' }
	Write-Host "Name: $expoName"
	Write-Host "Package: $packageName"
	Write-Host "Version: $expoVersion"
	Write-Host "VersionCode: $expectedVersionCode"
	Write-Host "Scheme: $expoScheme"
	Write-Pass 'Expo config'

	Write-Stage 'Android SDK'
	$androidDir = Join-Path $script:ProjectRoot 'android'
	$localProperties = Join-Path $androidDir 'local.properties'
	$sdkRoot = $null
	foreach ($candidate in Get-SdkCandidates) {
		if (Test-Path -LiteralPath $candidate -PathType Container) {
			$sdkRoot = (Resolve-Path -LiteralPath $candidate).Path
			break
		}
	}
	$localSdk = Read-LocalSdkPath $localProperties
	if ($localSdk -and -not (Test-Path -LiteralPath $localSdk -PathType Container)) {
		Stop-QA 'Android SDK' "android/local.properties points to missing SDK: $localSdk" 'Fix local.properties manually; this script will not overwrite an invalid existing setting.'
	}
	if (-not $sdkRoot -and $localSdk) { $sdkRoot = $localSdk }
	if (-not $sdkRoot) { Stop-QA 'Android SDK' 'Android SDK was not found in ANDROID_HOME, ANDROID_SDK_ROOT, or the default Windows SDK path.' 'Install/configure the Android SDK and rerun.' }
	if ((Test-Path -LiteralPath $androidDir -PathType Container) -and -not (Test-Path -LiteralPath $localProperties -PathType Leaf)) {
		$sdkForGradle = $sdkRoot.Replace('\', '/')
		Set-Content -LiteralPath $localProperties -Value "sdk.dir=$sdkForGradle" -Encoding ascii
		Write-Host "Created ignored android/local.properties with sdk.dir=$sdkForGradle"
	}
	Write-Host "SDK: $sdkRoot"
	Write-Pass 'Android SDK'

	Write-Stage 'ADB device'
	$adb = Join-Path $sdkRoot 'platform-tools\adb.exe'
	if (-not (Test-Path -LiteralPath $adb -PathType Leaf)) { $adb = Resolve-Executable @('adb.exe', 'adb') }
	if (-not $adb) { Stop-QA 'ADB' 'adb was not found in the Android SDK or PATH.' 'Install Android platform-tools and rerun.' }
	$deviceResult = Invoke-NativeCommand $adb @('devices', '-l')
	$deviceRows = @()
	foreach ($line in $deviceResult.Output) {
		if ($line -match '^([^\s]+)\s+([^\s]+)(?:\s+(.*))?$') {
			$deviceRows += [PSCustomObject]@{ Serial = $Matches[1]; State = $Matches[2]; Details = $Matches[3] }
		}
	}
	$unauthorized = @($deviceRows | Where-Object { $_.State -eq 'unauthorized' -and $_.Serial -notlike 'emulator-*' })
	if ($unauthorized.Count -gt 0) { Stop-QA 'ADB device' "Device is unauthorized: $($unauthorized.Serial -join ', ')" 'Approve USB debugging on the phone, then rerun.' }
	$realDevices = @($deviceRows | Where-Object { $_.State -eq 'device' -and $_.Serial -notlike 'emulator-*' })
	if ($realDevices.Count -eq 0) { Stop-QA 'ADB device' 'No real Android device with status device was found.' 'Connect the OPPO/real device and approve USB debugging. This script will not start an AVD.' }
	if ($realDevices.Count -ne 1) { Stop-QA 'ADB device' "Expected exactly one real device, found $($realDevices.Count): $($realDevices.Serial -join ', ')" 'Disconnect extra real devices and rerun.' }
	$serial = $realDevices[0].Serial
	$modelMatch = [regex]::Match("$($realDevices[0].Details)", 'model:([^\s]+)')
	$model = if ($modelMatch.Success) { $modelMatch.Groups[1].Value } else { 'unknown-model' }
	Write-Host "Serial: $serial"
	Write-Host "Model: $model"
	Write-Pass 'Device'

	Write-Stage 'Metro ports'
	$port8081 = @(Get-PortListeners 8081)
	$port8082 = @(Get-PortListeners 8082)
	$port8083 = @(Get-PortListeners 8083)
	foreach ($portInfo in @(@{ Port = 8081; Items = $port8081 }, @{ Port = 8082; Items = $port8082 }, @{ Port = 8083; Items = $port8083 })) {
		if (@($portInfo.Items).Count -eq 0) {
			Write-Host "$($portInfo.Port): free"
		} else {
			Write-Host "$($portInfo.Port): occupied"
			foreach ($item in $portInfo.Items) { Write-Host "  $(Format-PortOwner $item.Pid)" }
		}
	}
	if ($port8082.Count -gt 0 -or $port8083.Count -gt 0) {
		Write-Warn '8082/8083 are occupied. This script stays on the single-project Metro port 8081.'
	}

	$reuseMetro = $false
	$metroOwnerPid = $null
	if ($port8081.Count -gt 0) {
		if (-not (Test-MetroHealth)) {
			Stop-QA 'Metro port' '8081 is occupied but does not serve a healthy Metro /status response.' 'Identify the owner shown above and stop/reconcile it manually; this script will not kill it or switch ports.'
		}
		$currentProjectOwners = @($port8081 | Where-Object { Test-CurrentProjectMetro $_.Pid $script:ProjectRoot })
		if ($currentProjectOwners.Count -ne 1) {
			Stop-QA 'Metro port' 'A healthy 8081 listener could not be confidently identified as this project Metro.' 'Stop the unknown/stale Metro manually, then rerun from this project root.'
		}
		$reuseMetro = $true
		$metroOwnerPid = $currentProjectOwners[0].Pid
		Write-Host "REUSE NATIVE BUILD / EXISTING CURRENT-PROJECT METRO PID $metroOwnerPid"
	}
	Write-Pass 'Metro port'

	Write-Stage 'Build decision'
	if ($Build) {
		Write-Host 'BUILD NATIVE DEBUG APK'
		if (-not (Test-Path -LiteralPath $androidDir -PathType Container)) { Stop-QA 'Build' 'android/ does not exist.' 'Run Expo prebuild manually in the intended workflow; this v1 script will not prebuild.' }
		$gradlew = Join-Path $androidDir 'gradlew.bat'
		if (-not (Test-Path -LiteralPath $gradlew -PathType Leaf)) { Stop-QA 'Build' 'android/gradlew.bat was not found.' 'Verify the native Android project before rerunning.' }
		Push-Location $androidDir
		$previousNodeEnv = $env:NODE_ENV
		$env:NODE_ENV = 'development'
		try {
			$buildResult = Invoke-NativeCommand $gradlew @('assembleDebug', '--console=plain')
		} finally {
			$env:NODE_ENV = $previousNodeEnv
			Pop-Location
		}
		$buildText = ($buildResult.Output -join [Environment]::NewLine)
		if ($buildText -notmatch 'BUILD SUCCESSFUL') { Stop-QA 'Build' 'Gradle exited successfully without the BUILD SUCCESSFUL marker.' 'Inspect the Gradle output manually.' }
		Write-Pass 'Build'

		$apkPath = Join-Path $androidDir 'app\build\outputs\apk\debug\app-debug.apk'
		if (-not (Test-Path -LiteralPath $apkPath -PathType Leaf)) { Stop-QA 'APK' "Expected debug APK was not found: $apkPath" 'Inspect the assembleDebug output and Android build directory.' }
		$apk = Get-Item -LiteralPath $apkPath
		Write-Host "FullName: $($apk.FullName)"
		Write-Host "Length: $($apk.Length)"
		Write-Host "LastWriteTime: $($apk.LastWriteTime.ToString('o'))"
		$installResult = Invoke-NativeCommand $adb @('-s', $serial, 'install', '-r', $apk.FullName)
		if (($installResult.Output -join [Environment]::NewLine) -notmatch '(?m)^Success\s*$') { Stop-QA 'APK install' 'adb install did not report Success.' 'Run adb install -r manually and inspect the device response.' }
		Write-Pass 'APK install'
	} else {
		Write-Host 'REUSE NATIVE BUILD'
		$packagePath = Invoke-NativeCommand $adb @('-s', $serial, 'shell', 'pm', 'path', $packageName) -AllowNonZero
		if ($packagePath.ExitCode -ne 0 -or ($packagePath.Output -join '') -notmatch 'package:') { Stop-QA 'Installed app' "Package $packageName is not installed on the device." 'Run this script with -Build for native install verification.' }
		Write-Pass 'Reuse installed native build'
	}

	Write-Stage 'Installed version'
	$installed = Get-InstalledPackageInfo $adb $serial $packageName
	if ($null -eq $installed) { Stop-QA 'Installed version' "Unable to read dumpsys package $packageName." 'Install a valid debug build and rerun.' }
	Write-Host "Installed versionName: $($installed.VersionName)"
	Write-Host "Installed versionCode: $($installed.VersionCode)"
	if ($Build) {
		if ($expoVersion -and $installed.VersionName -and $installed.VersionName -ne $expoVersion) { Stop-QA 'Installed version' "versionName mismatch: expected $expoVersion, installed $($installed.VersionName)." 'Inspect Expo config and the installed APK before continuing.' }
		if ($expectedVersionCode -and $installed.VersionCode -and $installed.VersionCode -ne $expectedVersionCode) { Stop-QA 'Installed version' "versionCode mismatch: expected $expectedVersionCode, installed $($installed.VersionCode)." 'Inspect Expo config and the installed APK before continuing.' }
	}
	Write-Pass 'Installed version'

	Write-Stage 'Metro startup'
	if (-not $reuseMetro) {
		$powershell = Resolve-Executable @('powershell.exe', 'powershell')
		if (-not $powershell) { Stop-QA 'Metro startup' 'Windows PowerShell was not found.' 'Start Metro manually with --host lan --port 8081.' }
		$quotedRoot = $script:ProjectRoot.Replace("'", "''")
		$metroCommand = "`$env:NODE_ENV='development'; Set-Location -LiteralPath '$quotedRoot'; npx.cmd expo start --dev-client --host lan --port 8081"
		$metroProcess = Start-Process -FilePath $powershell -ArgumentList @('-NoProfile', '-NoExit', '-Command', $metroCommand) -WorkingDirectory $script:ProjectRoot -PassThru
		$metroOwnerPid = $metroProcess.Id
		Write-Host "Started Metro PowerShell PID: $metroOwnerPid"
	}
	$deadline = (Get-Date).AddSeconds(60)
	$metroReady = $false
	do {
		if (Test-MetroHealth) {
			$metroReady = $true
			break
		}
		Start-Sleep -Seconds 1
	} while ((Get-Date) -lt $deadline)
	if (-not $metroReady) { Stop-QA 'Metro startup' 'Timed out waiting for IPv4 127.0.0.1:8081 and /status packager-status:running.' 'Inspect the Metro PowerShell window; do not switch to 8082/8083.' }
	Write-Host 'Metro: --dev-client --host lan --port 8081'
	Write-Pass 'Metro IPv4'
	Write-Pass 'Metro /status'

	Write-Stage 'ADB reverse'
	Invoke-NativeCommand $adb @('-s', $serial, 'reverse', '--remove-all') | Out-Null
	Invoke-NativeCommand $adb @('-s', $serial, 'reverse', "tcp:$MetroPort", "tcp:$MetroPort") | Out-Null
	$reverseList = Invoke-NativeCommand $adb @('-s', $serial, 'reverse', '--list')
	$reverseText = ($reverseList.Output -join [Environment]::NewLine)
	if ($reverseText -notmatch "tcp:$MetroPort\s+tcp:$MetroPort") { Stop-QA 'ADB reverse' "Required tcp:$MetroPort tcp:$MetroPort mapping was not reported." 'Run adb reverse manually and inspect the device connection.' }
	Write-Host $reverseText
	Write-Pass 'adb reverse'

	<#
	Write-Stage 'Phone → Metro'
	#>
	Write-Stage 'Phone to Metro'
	$phoneHealthMethod = Invoke-PhoneMetroHealth $adb $serial
	if ($phoneHealthMethod) {
		Write-Host "Device health method: $phoneHealthMethod"
		<#
		Write-Pass 'Phone → Metro'
	}
		#>
		Write-Pass 'Phone to Metro'
	}
	if (-not $phoneHealthMethod) {
		Write-Warn 'Device has neither curl nor wget; phone-side HTTP health could not be verified.'
	}

	Write-Stage 'Dev client launch'
	$devClientUrl = "$expoScheme`://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A$MetroPort"
	Write-Host "URL: $devClientUrl"
	$launchResult = Invoke-NativeCommand $adb @('-s', $serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', $devClientUrl) -AllowNonZero
	$launchText = ($launchResult.Output -join [Environment]::NewLine)
	Write-Host $launchText
	if ($launchResult.ExitCode -ne 0 -and $launchText -notmatch 'Activity not started, intent has been delivered to currently running top-most instance') {
		Stop-QA 'Dev client launch' "adb am start failed with code $($launchResult.ExitCode). $launchText" 'Verify the discovered scheme and the installed development client.'
	}
	Write-Pass 'Dev client launched'

	Write-Stage 'App PID'
	$appPid = $null
	$pidDeadline = (Get-Date).AddSeconds(12)
	do {
		$pidResult = Invoke-NativeCommand $adb @('-s', $serial, 'shell', 'pidof', $packageName) -AllowNonZero
		$pidText = ($pidResult.Output -join ' ').Trim()
		if ($pidText -match '\b(\d+)\b') {
			$appPid = $Matches[1]
			break
		}
		Start-Sleep -Milliseconds 500
	} while ((Get-Date) -lt $pidDeadline)
	if (-not $appPid) { Stop-QA 'App PID' "pidof $packageName returned no PID after launch." 'Verify the dev-client URL, installed package, and device screen manually.' }
	Write-Host "PID: $appPid"
	Write-Pass 'PID'

	if ($Logcat) {
		Write-Stage 'Logcat snapshot'
		$logResult = Invoke-NativeCommand $adb @('-s', $serial, 'logcat', '-d', "--pid=$appPid", '-v', 'time', '-t', '120') -AllowNonZero
		if ($logResult.Output.Count -gt 0) { $logResult.Output | ForEach-Object { Write-Host $_ } }
		if ($logResult.ExitCode -ne 0) { Write-Warn 'Bounded logcat snapshot returned a non-zero code.' }
	}

	Write-Host ''
	Write-Host '========================================' -ForegroundColor Green
	Write-Host 'FORESTMUSIC DEVICE QA STARTUP PASS' -ForegroundColor Green
	Write-Host '========================================' -ForegroundColor Green
	Write-Host "Project: $script:ProjectRoot"
	Write-Host "Package: $packageName"
	Write-Host "Scheme: $expoScheme"
	Write-Host "SHA: $sha"
	Write-Host "Device: $serial ($model)"
	Write-Host "Installed version: $($installed.VersionName) ($($installed.VersionCode))"
	Write-Host "Metro: 127.0.0.1:$MetroPort /status running"
	Write-Host "ADB reverse: tcp:$MetroPort tcp:$MetroPort"
	Write-Host "PID: $appPid"
	Write-Host ''
	Write-Host 'DEVICE CONNECTION PASS. Verify real application UI is visible on the phone.' -ForegroundColor Yellow
	Write-Host 'This script does not claim visual correctness or gameplay pass.' -ForegroundColor Yellow

}
catch {
	$message = $_.Exception.Message
	if ($message -match '^QA_STOP\|([^|]+)\|([^|]+)\|(.+)$') {
		$layer = $Matches[1]
		$reason = $Matches[2]
		$suggestion = $Matches[3]
	} else {
		$layer = 'Unexpected script error'
		$reason = $message
		$suggestion = 'Inspect the PowerShell error and rerun only after the failing layer is understood.'
	}
	Write-Host ''
	Write-Host '========================================' -ForegroundColor Red
	<#
	#
	Write-Host "STOP — $layer" -ForegroundColor Red
	Write-Host '========================================' -ForegroundColor Red
	#
	#>
	Write-Host ('Reason: ' + $reason) -ForegroundColor Red
	Write-Host ('Suggested next diagnostic: ' + $suggestion) -ForegroundColor Yellow
	exit 1
} finally {
	if ($script:LocationPushed) {
		Pop-Location
		$script:LocationPushed = $false
	}
}
