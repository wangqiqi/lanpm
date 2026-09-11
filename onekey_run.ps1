# LanPM onekey ops — PowerShell only (do not call bat/sh)
# Usage: .\onekey_run.ps1 [start|web|stop|restart|status|build|...]
# Note: UTF-8 with BOM required for Windows PowerShell 5.1
param(
  [string]$Action = '',
  [string]$Extra = ''
)

if ($PSVersionTable.PSVersion.Major -lt 6) {
  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
  $OutputEncoding = [Console]::OutputEncoding
}

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$RunDir = Join-Path $Root '.lanpm'
$PidFile = Join-Path $RunDir 'dev.pid'
$LogFile = Join-Path $RunDir 'dev.log'
$ModeFile = Join-Path $RunDir 'dev.mode'
$UrlFile = Join-Path $RunDir 'dev.url'
$PortFile = Join-Path $RunDir 'dev.port'
$DevUrlScript = Join-Path $Root 'scripts/onekey-dev-url.mjs'

function Ensure-RunDir {
  New-Item -ItemType Directory -Force -Path $RunDir | Out-Null
}

function Get-PackageVersion {
  node -p "require('./package.json').version" 2>$null
}

function Get-LanpmViteProcesses {
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'electron-vite' -and $_.CommandLine -match 'lanpm' }
}

function Test-PidAlive([int]$ProcessId) {
  if ($ProcessId -le 0) { return $false }
  return $null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Test-DevRunning {
  if (Test-Path $PidFile) {
    $pidText = (Get-Content $PidFile -Raw).Trim()
    if ($pidText -match '^\d+$' -and (Test-PidAlive ([int]$pidText))) { return $true }
  }
  return @(Get-LanpmViteProcesses).Count -gt 0
}

function Get-ViteRootPid {
  $proc = Get-LanpmViteProcesses | Select-Object -First 1
  if ($proc) { return $proc.ProcessId }
  return $null
}

function Stop-LanpmVite {
  foreach ($p in @(Get-LanpmViteProcesses)) {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Milliseconds 500
}

function Stop-DevTree([int]$ProcessId) {
  if (Test-PidAlive $ProcessId) {
    $null = cmd /c "taskkill /T /PID $ProcessId 2>nul"
    Start-Sleep -Milliseconds 800
    if (Test-PidAlive $ProcessId) {
      $null = cmd /c "taskkill /F /T /PID $ProcessId 2>nul"
    }
  }
}

function Get-PortSummary([int]$Port) {
  $lines = netstat -ano | Select-String ":$Port\s" | Select-String 'LISTENING'
  if (-not $lines) { return $null }
  $line = ($lines | Select-Object -First 1).Line.Trim()
  if ($line -match '\s(\d+)\s*$') {
    $listenPid = [int]$Matches[1]
    $name = (Get-Process -Id $listenPid -ErrorAction SilentlyContinue).ProcessName
    if ($name) { return "$name (pid $listenPid)" }
    return "pid $listenPid"
  }
  return $line
}

function Clear-DevUrl {
  & node $DevUrlScript clear 2>$null | Out-Null
  Remove-Item $UrlFile, $PortFile -ErrorAction SilentlyContinue
}

function Read-DevUrl {
  if (Test-Path $UrlFile) {
    return (Get-Content $UrlFile -Raw).Trim()
  }
  $url = (& node $DevUrlScript read 2>$null)
  if ($url) { return $url.Trim() }
  return $null
}

function Wait-DevUrl {
  $url = (& node $DevUrlScript wait --timeout=45 2>$null)
  if ($url) { return $url.Trim() }
  return $null
}

function Show-DevUrl {
  $url = Read-DevUrl
  if ($url) { Write-Host "  LanPM  ->  $url" }
}

function Show-VitePorts([switch]$Brief) {
  $lanpmUrl = Read-DevUrl
  $lanpmPort = $null
  if ($lanpmUrl -match ':(\d+)$') { $lanpmPort = $Matches[1] }
  if ($lanpmUrl -and (Test-DevRunning)) {
    Write-Host "  LanPM  ->  $lanpmUrl"
    if ($Brief -and $lanpmPort -and $lanpmPort -ne '5173') {
      Write-Host '  (avoided :5173; another Vite process is using it)'
    }
  }

  $found = $false
  foreach ($port in 5173, 5174, 5175) {
    if ($lanpmPort -and "$port" -eq $lanpmPort) { continue }
    $who = Get-PortSummary $port
    if (-not $who) { continue }
    $found = $true
    if ($Brief) {
      Write-Host "  :$port  other use - $who (start/web will auto-avoid)"
    } else {
      Write-Host "  :$port  other use - $who"
      Write-Host '    no conflict with LanPM (strictPort: false)'
    }
  }
  if (-not $found -and -not $lanpmUrl) { Write-Host '  5173-5175 not listening' }
}

function Invoke-Preflight([switch]$Quiet) {
  $preflightArgs = @('--fix')
  if ($Quiet) { $preflightArgs += '--quiet' }
  Write-Host '[lanpm] 启动前预检（依赖 / native）…' -ForegroundColor Cyan
  Push-Location $Root
  try {
    & node (Join-Path $Root 'scripts/onekey-preflight.mjs') @preflightArgs
    if ($LASTEXITCODE -ne 0) {
      Write-Host '[lanpm] 预检未通过，已中止' -ForegroundColor Red
      Write-Host '[lanpm] 提示: .\onekey_run.ps1 install  或  npm install' -ForegroundColor Yellow
      exit 1
    }
  } finally {
    Pop-Location
  }
}

function Invoke-DiagnoseLog {
  if (-not (Test-Path $LogFile)) { return }
  & node (Join-Path $Root 'scripts/onekey-preflight.mjs') '--diagnose-log' $LogFile 2>$null
}

function Start-Dev([string]$Mode) {
  Ensure-RunDir
  Invoke-Preflight
  if (Test-DevRunning) {
    Write-Host '[lanpm] already running; stop or restart first' -ForegroundColor Yellow
    exit 1
  }

  $npmScript = if ($Mode -eq 'web') { 'dev:web' } else { 'dev' }
  Clear-DevUrl
  '' | Set-Content -Path $LogFile -Encoding utf8
  Set-Content -Path $ModeFile -Value $Mode -Encoding utf8 -NoNewline

  Write-Host "[lanpm] starting dev mode: $Mode ..." -ForegroundColor Cyan
  Write-Host "[lanpm] log: $LogFile" -ForegroundColor Cyan

  $env:LANPM_ONEKEY = '1'
  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
  $p = Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/c', "npm run $npmScript >> `"$LogFile`" 2>&1" `
    -WorkingDirectory $Root `
    -PassThru `
    -WindowStyle Hidden

  $devPid = $p.Id
  Set-Content -Path $PidFile -Value $devPid -Encoding utf8 -NoNewline
  Start-Sleep -Seconds 3

  if (-not (Test-PidAlive $devPid)) {
    $vitePid = Get-ViteRootPid
    if ($vitePid) {
      $devPid = $vitePid
      Set-Content -Path $PidFile -Value $devPid -Encoding utf8 -NoNewline
    }
  }

  if ((Test-PidAlive $devPid) -or (Test-DevRunning)) {
    $devUrl = Wait-DevUrl
    Write-Host "[lanpm] started pid=$devPid ($npmScript)" -ForegroundColor Green
    if ($devUrl) {
      if ($Mode -eq 'web') {
        Write-Host "[lanpm] browser preview: $devUrl" -ForegroundColor Green
      } else {
        Write-Host "[lanpm] renderer: $devUrl" -ForegroundColor Cyan
      }
    } else {
      Write-Host '[lanpm] could not parse Vite URL from log; try status or logs' -ForegroundColor Yellow
    }
    Write-Host '[lanpm] logs: .\onekey_run.ps1 logs' -ForegroundColor Cyan
  } else {
    Write-Host '[lanpm] start failed; see log:' -ForegroundColor Red
    if (Test-Path $LogFile) { Get-Content $LogFile -Tail 30 }
    Invoke-DiagnoseLog
    Remove-Item $PidFile, $ModeFile -ErrorAction SilentlyContinue
    Clear-DevUrl
    exit 1
  }
}

function Stop-Dev {
  Ensure-RunDir
  if (Test-Path $PidFile) {
    $devPid = [int](Get-Content $PidFile -Raw).Trim()
    Write-Host "[lanpm] stopping pid=$devPid ..." -ForegroundColor Cyan
    Stop-DevTree $devPid
    Remove-Item $PidFile, $ModeFile, $UrlFile, $PortFile -ErrorAction SilentlyContinue
  } else {
    Write-Host '[lanpm] no pid file; cleaning stray processes' -ForegroundColor Yellow
  }
  if (@(Get-LanpmViteProcesses).Count -gt 0) {
    Write-Host '[lanpm] cleaning electron-vite processes ...' -ForegroundColor Yellow
    Stop-LanpmVite
  }
  Clear-DevUrl
  Write-Host '[lanpm] stopped' -ForegroundColor Green
}

function Show-Status {
  Ensure-RunDir
  $ver = Get-PackageVersion
  Write-Host "[lanpm] project: $Root" -ForegroundColor Cyan
  Write-Host "[lanpm] version: v$ver" -ForegroundColor Cyan
  Write-Host ''
  if (Test-DevRunning) {
    $devPid = if (Test-Path $PidFile) { (Get-Content $PidFile -Raw).Trim() } else { '?' }
    $mode = if (Test-Path $ModeFile) { (Get-Content $ModeFile -Raw).Trim() } else { 'electron' }
    Write-Host "[lanpm] dev: running (pid=$devPid, mode=$mode)" -ForegroundColor Green
    $hintUrl = Read-DevUrl
    if ($hintUrl) {
      if ($mode -eq 'web') {
        Write-Host "[lanpm] browser preview: $hintUrl" -ForegroundColor Green
      } else {
        Write-Host "[lanpm] renderer: $hintUrl" -ForegroundColor Cyan
      }
    }
  } else {
    Write-Host '[lanpm] dev: not running' -ForegroundColor Yellow
  }
  Write-Host ''
  Write-Host '[lanpm] Vite ports:' -ForegroundColor Cyan
  Show-VitePorts
  Write-Host ''
  if (Test-Path $LogFile) {
    Write-Host "[lanpm] recent log ($LogFile):" -ForegroundColor Cyan
    Get-Content $LogFile -Tail 8 | ForEach-Object { Write-Host "  $_" }
  }
}

function Show-MenuBrief {
  if (Test-DevRunning) {
    $devPid = if (Test-Path $PidFile) { (Get-Content $PidFile -Raw).Trim() } else { '?' }
    $mode = if (Test-Path $ModeFile) { (Get-Content $ModeFile -Raw).Trim() } else { 'electron' }
    Write-Host "[lanpm] dev: running  pid=$devPid  mode=$mode" -ForegroundColor Green
  } else {
    Write-Host '[lanpm] dev: not running (use start/web)' -ForegroundColor Yellow
  }
  Show-VitePorts -Brief
}

function Tail-Logs {
  Ensure-RunDir
  if (-not (Test-Path $LogFile)) {
    Write-Host "[lanpm] no log yet: $LogFile" -ForegroundColor Yellow
    exit 1
  }
  $lines = if ($Extra -match '^\d+$') { [int]$Extra } else { 50 }
  Get-Content $LogFile -Tail $lines -Wait
}

function Invoke-Npm([string[]]$NpmArgs) {
  Push-Location $Root
  try {
    & npm @NpmArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } finally {
    Pop-Location
  }
}

function Invoke-Action([string]$Act, [string]$Ext) {
  $script:Extra = $Ext
  switch ($Act) {
    'start' { Start-Dev 'electron' }
    'web' { Start-Dev 'web' }
    'stop' { Stop-Dev }
    'restart' {
      $mode = if (Test-Path $ModeFile) { (Get-Content $ModeFile -Raw).Trim() } else { 'electron' }
      Stop-Dev
      Start-Sleep -Seconds 1
      Start-Dev $mode
    }
    'status' { Show-Status }
    'menu-brief' { Show-MenuBrief }
    'logs' { Tail-Logs }
    'build' {
      Invoke-Preflight -Quiet
      Write-Host '[lanpm] building ...' -ForegroundColor Cyan
      Invoke-Npm @('run', 'build')
      Write-Host '[lanpm] build done -> .lanpm/artifact/out/' -ForegroundColor Green
    }
    'preview' {
      Write-Host '[lanpm] preview (foreground) ...' -ForegroundColor Cyan
      Invoke-Npm @('run', 'preview')
    }
    'rebuild' {
      Write-Host '[lanpm] rebuilding native modules ...' -ForegroundColor Cyan
      Invoke-Npm @('run', 'rebuild:native')
      Write-Host '[lanpm] native deps aligned' -ForegroundColor Green
    }
    'install' {
      Write-Host '[lanpm] npm install ...' -ForegroundColor Cyan
      Invoke-Npm @('install')
      if ($LASTEXITCODE -ne 0) {
        Write-Host '[lanpm] npm install 失败 - 检查网络或 npm 源' -ForegroundColor Red
        exit 1
      }
      Write-Host '[lanpm] install done' -ForegroundColor Green
    }
    'check' {
      Invoke-Npm @('run', 'ensure:native')
      Invoke-Npm @('run', 'typecheck')
      Invoke-Npm @('run', 'lint')
      if ($Ext -ne 'quick') { Invoke-Npm @('run', 'verify:m0') }
      Write-Host '[lanpm] check passed' -ForegroundColor Green
    }
    'verify' {
      Write-Host '[lanpm] verify:m7 (long) ...' -ForegroundColor Cyan
      Invoke-Npm @('run', 'verify:m7')
      Write-Host '[lanpm] verify:m7 passed' -ForegroundColor Green
    }
    'clean' {
      if (Test-DevRunning) { Stop-Dev }
      Write-Host '[lanpm] cleaning rebuildable artifacts (keep userData) ...' -ForegroundColor Cyan
      $artifact = Join-Path $RunDir 'artifact'
      Remove-Item -Recurse -Force (Join-Path $artifact 'out'), (Join-Path $artifact 'dist'), (Join-Path $artifact 'test-results') -ErrorAction SilentlyContinue
      Remove-Item -Recurse -Force (Join-Path $Root 'out'), (Join-Path $Root 'dist'), (Join-Path $Root 'build'), (Join-Path $Root 'test-results'), (Join-Path $Root 'coverage') -ErrorAction SilentlyContinue
      Get-ChildItem $Root -Filter '*.tsbuildinfo' -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force
      if (Test-Path $RunDir) {
        Remove-Item $PidFile, $ModeFile -ErrorAction SilentlyContinue
        '' | Set-Content $LogFile -ErrorAction SilentlyContinue
        foreach ($sub in @('tmp', 'stub-bus', 'visual-screenshots', 'dev-a', 'dev-b')) {
          Remove-Item -Recurse -Force (Join-Path $RunDir $sub) -ErrorAction SilentlyContinue
        }
        foreach ($sub in @('tmp', 'stub-bus', 'visual-screenshots')) {
          New-Item -ItemType Directory -Force -Path (Join-Path $RunDir $sub) | Out-Null
        }
      }
      Get-ChildItem ([System.IO.Path]::GetTempPath()) -Filter 'lanpm*' -ErrorAction SilentlyContinue |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
      Write-Host '[lanpm] cleaned .lanpm/artifact + legacy out/dist .lanpm rebuildables' -ForegroundColor Green
      if ($Ext -eq 'deep') {
        Write-Host '[lanpm] deep clean: node_modules + electron cache ...' -ForegroundColor Yellow
        Remove-Item -Recurse -Force (Join-Path $Root 'node_modules') -ErrorAction SilentlyContinue
        $ec = Join-Path $env:LOCALAPPDATA 'electron\Cache'
        $eb = Join-Path $env:LOCALAPPDATA 'electron-builder\Cache'
        Remove-Item -Recurse -Force $ec, $eb -ErrorAction SilentlyContinue
        Write-Host '[lanpm] deep clean done; run: .\onekey_run.ps1 install' -ForegroundColor Green
      }
    }
    'pack' {
      if (-not (Test-Path (Join-Path $RunDir 'artifact\out\main'))) {
        Write-Host '[lanpm] .lanpm/artifact/out missing; building first ...' -ForegroundColor Yellow
        Invoke-Npm @('run', 'build')
      }
      Write-Host '[lanpm] packing (electron-builder) ...' -ForegroundColor Cyan
      Push-Location $Root
      try {
        & npx electron-builder --config electron-builder.yml
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
      } finally {
        Pop-Location
      }
      Write-Host '[lanpm] pack done -> .lanpm/artifact/dist/' -ForegroundColor Green
    }
    default {
      Write-Host "unknown action: $Act" -ForegroundColor Red
      exit 1
    }
  }
}

function Clear-MenuScreen {
  # 集成终端 Clear-Host 易残留叠影；用换行刷新代替
  Write-Host ''
  Write-Host ''
}

function Show-MenuHeader {
  $ver = Get-PackageVersion
  if (-not $ver) { $ver = '?' }
  Clear-MenuScreen
  Write-Host ''
  Write-Host '========================================================'
  Write-Host "  LanPM 一键运维  v$ver  [PowerShell]"
  Write-Host '========================================================'
  Write-Host ''
  Write-Host "[lanpm] 目录: $Root"
  Show-MenuBrief
  Write-Host ''
}

function Invoke-CheckPrompt {
  $runM0 = Read-Host '是否运行 verify:m0? (Y/n)'
  if ($runM0 -match '^(n|no)$') {
    Invoke-Action 'check' 'quick'
  } else {
    Invoke-Action 'check' ''
  }
}

function Invoke-CleanDeepConfirm {
  Write-Host '[lanpm] 警告: 将删除 node_modules 与 electron 缓存' -ForegroundColor Yellow
  $confirm = Read-Host '确认 clean deep? 输入 yes'
  if ($confirm -eq 'yes') {
    Invoke-Action 'clean' 'deep'
  } else {
    Write-Host '[lanpm] 已取消' -ForegroundColor Cyan
  }
}

function Show-MoreMenu {
  while ($true) {
    Show-MenuHeader
    Write-Host '  -- 更多维护 --' -ForegroundColor Yellow
    Write-Host ''
    Write-Host '  1) check       typecheck + lint [+ verify:m0]'
    Write-Host '  2) verify      全量 verify:m7'
    Write-Host '  3) rebuild     重编 native 依赖'
    Write-Host '  4) clean deep  含 node_modules + electron 缓存'
    Write-Host '  5) preview     预览构建 (前台)'
    Write-Host '  0) 返回主菜单'
    Write-Host ''
    $more = Read-Host '请选择 (0-5)'
    Write-Host ''
    switch ($more) {
      '1' { Invoke-CheckPrompt }
      '2' { Invoke-Action 'verify' '' }
      '3' { Invoke-Action 'rebuild' '' }
      '4' { Invoke-CleanDeepConfirm }
      '5' { Invoke-Action 'preview' '' }
      '0' { return }
      'b' { return }
      'back' { return }
      default { Write-Host "[lanpm] 无效选项: $more" -ForegroundColor Yellow }
    }
    Write-Host ''
    Read-Host '按 Enter 继续'
  }
}

function Show-InteractiveMenu {
  while ($true) {
    Show-MenuHeader
    Write-Host '  1) start      启动 Electron 开发'
    Write-Host '  2) web        仅渲染进程 (浏览器预览)'
    Write-Host '  3) restart    重启开发服务'
    Write-Host '  4) stop       停止开发服务'
    Write-Host '  5) status     查看状态'
    Write-Host '  6) logs       跟踪日志'
    Write-Host '  7) build      生产构建'
    Write-Host '  8) install    npm install'
    Write-Host '  9) clean      清理 out/dist/coverage/.lanpm 可重建项'
    Write-Host ' 10) pack       安装包 (electron-builder)'
    Write-Host ' 11) 更多维护   check/verify/rebuild/...'
    Write-Host '  0) exit'
    Write-Host ''
    $choice = Read-Host '请选择 (0-11)'
    Write-Host ''
    switch ($choice) {
      '1' { Invoke-Action 'start' '' }
      '2' { Invoke-Action 'web' '' }
      '3' { Invoke-Action 'restart' '' }
      '4' { Invoke-Action 'stop' '' }
      '5' { Invoke-Action 'status' '' }
      '6' {
        $n = Read-Host '日志行数 (默认50)'
        if ($n -match '^\d+$') { Invoke-Action 'logs' $n } else { Invoke-Action 'logs' '50' }
      }
      '7' { Invoke-Action 'build' '' }
      '8' { Invoke-Action 'install' '' }
      '9' { Invoke-Action 'clean' '' }
      '10' { Invoke-Action 'pack' '' }
      '11' { Show-MoreMenu }
      '0' { Write-Host '[lanpm] 再见'; return }
      'q' { Write-Host '[lanpm] 再见'; return }
      'Q' { Write-Host '[lanpm] 再见'; return }
      'exit' { Write-Host '[lanpm] 再见'; return }
      default { Write-Host "[lanpm] 无效选项: $choice" -ForegroundColor Yellow }
    }
    Write-Host ''
    Read-Host '按 Enter 继续'
  }
}
if (-not $Action -or $Action -eq 'menu') {
  Show-InteractiveMenu
} else {
  Invoke-Action $Action $Extra
}
