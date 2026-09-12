@echo off
rem LanPM 一键运维 — CMD 独立入口（不调用 ps1/sh；含括号行需 ^( ^)）
chcp 65001 >nul 2>&1
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
set "ROOT=%CD%"
set "RUN_DIR=%ROOT%\.lanpm"
set "PID_FILE=%RUN_DIR%\dev.pid"
set "LOG_FILE=%RUN_DIR%\dev.log"
set "MODE_FILE=%RUN_DIR%\dev.mode"
set "URL_FILE=%RUN_DIR%\dev.url"
set "PORT_FILE=%RUN_DIR%\dev.port"
set "VER="
for /f "delims=" %%v in ('node -p "require('./package.json').version" 2^>nul') do set "VER=%%v"
if "%~1"=="" goto :menu
if /i "%~1"=="menu" goto :menu
if /i "%~1"=="help" goto :help
if /i "%~1"=="-h" goto :help
if /i "%~1"=="--help" goto :help
call :dispatch "%~1" "%~2"
exit /b %ERRORLEVEL%
:dispatch
set "ACT=%~1"
set "EXT=%~2"
if /i "%ACT%"=="start" goto :cmd_start
if /i "%ACT%"=="web" goto :cmd_web
if /i "%ACT%"=="stop" goto :cmd_stop
if /i "%ACT%"=="restart" goto :cmd_restart
if /i "%ACT%"=="status" goto :cmd_status
if /i "%ACT%"=="menu-brief" goto :cmd_menu_brief
if /i "%ACT%"=="logs" goto :cmd_logs_dispatch
if /i "%ACT%"=="build" goto :cmd_build
if /i "%ACT%"=="preview" goto :cmd_preview
if /i "%ACT%"=="rebuild" goto :cmd_rebuild
if /i "%ACT%"=="install" goto :cmd_install
if /i "%ACT%"=="check" goto :cmd_check_dispatch
if /i "%ACT%"=="verify" goto :cmd_verify
if /i "%ACT%"=="clean" goto :cmd_clean_dispatch
if /i "%ACT%"=="pack" goto :cmd_pack
echo [lanpm] unknown action: %ACT%
exit /b 1
:print
echo %~1
exit /b 0
:ensure_run_dir
if not exist "%RUN_DIR%" mkdir "%RUN_DIR%"
exit /b 0
:pid_alive
set "CHKPID=%~1"
if not defined CHKPID exit /b 1
tasklist /FI "PID eq %CHKPID%" 2>nul | findstr /b /i "%CHKPID%" >nul
exit /b %ERRORLEVEL%
:count_vite
set "VITE_COUNT=0"
for /f "skip=1 tokens=1" %%p in ('wmic process where "Name='node.exe' and CommandLine like '%%electron-vite%%' and CommandLine like '%%lanpm%%'" get ProcessId 2^>nul') do (
  echo %%p| findstr /r "^[0-9][0-9]*$" >nul && set /a VITE_COUNT+=1
)
exit /b 0
:test_dev_running
call :ensure_run_dir
if exist "%PID_FILE%" (
  set /p "DPID=" <"%PID_FILE%"
  call :pid_alive !DPID!
  if not errorlevel 1 exit /b 0
)
call :count_vite
if !VITE_COUNT! gtr 0 exit /b 0
exit /b 1
:find_vite_pid
set "VITE_PID="
for /f "skip=1 tokens=1" %%p in ('wmic process where "Name='node.exe' and CommandLine like '%%electron-vite%%' and CommandLine like '%%lanpm%%'" get ProcessId 2^>nul') do (
  if not "%%p"=="" (
    set "VITE_PID=%%p"
    goto :find_vite_pid_done
  )
)
:find_vite_pid_done
exit /b 0
:stop_vite_all
for /f "skip=1 tokens=1" %%p in ('wmic process where "Name='node.exe' and CommandLine like '%%electron-vite%%' and CommandLine like '%%lanpm%%'" get ProcessId 2^>nul') do (
  if not "%%p"=="" taskkill /F /PID %%p >nul 2>&1
)
ping 127.0.0.1 -n 2 >nul
exit /b 0
:stop_dev_tree
set "KILLPID=%~1"
if not defined KILLPID exit /b 0
call :pid_alive %KILLPID%
if errorlevel 1 exit /b 0
taskkill /T /PID %KILLPID% >nul 2>&1
ping 127.0.0.1 -n 2 >nul
call :pid_alive %KILLPID%
if not errorlevel 1 taskkill /F /T /PID %KILLPID% >nul 2>&1
exit /b 0
:show_vite_ports
set "PORT_FOUND=0"
for %%P in (5173 5174) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr /C:":%%P " ^| findstr LISTENING') do (
    set "PORT_FOUND=1"
    set "LPID=%%a"
    for /f "tokens=1" %%n in ('tasklist /FI "PID eq %%a" /NH 2^>nul') do echo   :%%P  %%n pid=%%a
  )
)
if "%PORT_FOUND%"=="0" echo   5173/5174 not listening
exit /b 0
:preflight_dev
echo [lanpm] 启动前预检（依赖 / native）...
node "%ROOT%\scripts\onekey-preflight.mjs" --fix
if errorlevel 1 (
  echo [lanpm] 预检未通过，已中止启动
  echo [lanpm] 提示: onekey_run.bat install  或  npm install
  exit /b 1
)
exit /b 0
:diagnose_failure
if not exist "%LOG_FILE%" exit /b 0
node "%ROOT%\scripts\onekey-preflight.mjs" --diagnose-log "%LOG_FILE%" 2>nul
exit /b 0
:clear_dev_url
node "%ROOT%\scripts\onekey-dev-url.mjs" clear >nul 2>&1
if exist "%URL_FILE%" del "%URL_FILE%" 2>nul
if exist "%PORT_FILE%" del "%PORT_FILE%" 2>nul
exit /b 0
:show_dev_url
set "DEV_URL="
for /f "delims=" %%u in ('node "%ROOT%\scripts\onekey-dev-url.mjs" read 2^>nul') do set "DEV_URL=%%u"
if defined DEV_URL echo   LanPM  -^>  !DEV_URL!
exit /b 0
:wait_dev_url
for /f "delims=" %%u in ('node "%ROOT%\scripts\onekey-dev-url.mjs" wait --timeout=45 2^>nul') do set "DEV_URL=%%u"
if defined DEV_URL call :print "[lanpm] renderer: !DEV_URL!"
exit /b 0
:start_dev
set "DEV_MODE=%~1"
call :ensure_run_dir
call :preflight_dev
if errorlevel 1 exit /b 1
call :test_dev_running
if not errorlevel 1 (
  echo [lanpm] already running; stop or restart first
  exit /b 1
)
if /i "%DEV_MODE%"=="web" (set "NPM_SCRIPT=dev:web") else (set "NPM_SCRIPT=dev")
call :clear_dev_url
type nul >"%LOG_FILE%"
>"%MODE_FILE%" echo(%DEV_MODE%)
echo [lanpm] starting dev mode: %DEV_MODE% ...
echo [lanpm] log: %LOG_FILE%
set "LANPM_ONEKEY=1"
set "ELECTRON_RUN_AS_NODE="
start "lanpm-dev" /MIN cmd /c "cd /d "%ROOT%" && set ELECTRON_RUN_AS_NODE= && npm run %NPM_SCRIPT% >> "%LOG_FILE%" 2>&1"
ping 127.0.0.1 -n 4 >nul
call :find_vite_pid
if defined VITE_PID (
  echo !VITE_PID!| findstr /r "^[0-9][0-9]*$" >nul
  if not errorlevel 1 goto :start_dev_pid_ok
)
call :test_dev_running
if not errorlevel 1 (
  echo [lanpm] started - vite detected
  exit /b 0
)
echo [lanpm] start failed; see log:
if exist "%LOG_FILE%" call :log_tail 30
call :diagnose_failure
del "%PID_FILE%" "%MODE_FILE%" 2>nul
exit /b 1
:start_dev_pid_ok
>"%PID_FILE%" echo(!VITE_PID!)
call :print "[lanpm] started pid=!VITE_PID! mode=!NPM_SCRIPT!"
call :wait_dev_url
call :print "[lanpm] logs: onekey_run.bat logs"
exit /b 0
:cmd_start
call :start_dev electron
exit /b %ERRORLEVEL%
:cmd_web
call :start_dev web
exit /b %ERRORLEVEL%
:cmd_stop
call :ensure_run_dir
if exist "%PID_FILE%" (
  set /p "SPID=" <"%PID_FILE%"
  set "SPID=!SPID: =!"
  echo !SPID!| findstr /r "^[0-9][0-9]*$" >nul
  if not errorlevel 1 (
    call :print "[lanpm] stopping pid=!SPID! ..."
    call :stop_dev_tree !SPID!
  ) else (
    call :print "[lanpm] invalid pid file; cleaning stray processes"
  )
  del "%PID_FILE%" "%MODE_FILE%" "%URL_FILE%" "%PORT_FILE%" 2>nul
) else (
  call :print "[lanpm] no pid file; cleaning stray processes"
)
call :count_vite
if !VITE_COUNT! gtr 0 (
  echo [lanpm] cleaning electron-vite processes ...
  call :stop_vite_all
)
call :clear_dev_url
echo [lanpm] stopped
exit /b 0
:cmd_restart
set "RMODE=electron"
if exist "%MODE_FILE%" set /p "RMODE=" <"%MODE_FILE%"
call :cmd_stop
ping 127.0.0.1 -n 2 >nul
call :start_dev !RMODE!
exit /b %ERRORLEVEL%
:cmd_status
call :ensure_run_dir
echo [lanpm] project: %ROOT%
echo [lanpm] version: v%VER%
echo.
call :test_dev_running
if not errorlevel 1 (
  set "SPID=?"
  if exist "%PID_FILE%" set /p "SPID=" <"%PID_FILE%"
  set "SMODE=electron"
  if exist "%MODE_FILE%" set /p "SMODE=" <"%MODE_FILE%"
  echo [lanpm] dev: running pid=!SPID! mode=!SMODE!
  call :show_dev_url
) else (
  echo [lanpm] dev: not running
)
echo.
echo [lanpm] Vite ports:
call :show_dev_url
call :show_vite_ports
echo.
if exist "%LOG_FILE%" (
  echo [lanpm] recent log: %LOG_FILE%
  call :log_tail 8
)
exit /b 0
:cmd_menu_brief
call :test_dev_running
if not errorlevel 1 (
  set "SPID=?"
  if exist "%PID_FILE%" set /p "SPID=" <"%PID_FILE%"
  set "SMODE=electron"
  if exist "%MODE_FILE%" set /p "SMODE=" <"%MODE_FILE%"
  echo [lanpm] dev: running  pid=!SPID!  mode=!SMODE!
  call :show_dev_url
) else (
  echo [lanpm] dev: not running - 选项 1 或 2 可启动
)
call :show_dev_url
call :show_vite_ports
exit /b 0
:log_tail
set "TAIL_N=%~1"
if not defined TAIL_N set "TAIL_N=30"
node -e "const fs=require('fs');const f=process.argv[1];const n=+process.argv[2]||30;try{const l=fs.readFileSync(f,'utf8').split(/\r?\n/);console.log(l.slice(-n).join('\n'))}catch(e){console.error(e.message);process.exit(1)}" "%LOG_FILE%" %TAIL_N%
exit /b %ERRORLEVEL%

:cmd_logs_dispatch
set "LOG_LINES=%EXT%"
goto :cmd_logs

:cmd_logs
call :ensure_run_dir
if not exist "%LOG_FILE%" (
  echo [lanpm] no log yet: %LOG_FILE%
  exit /b 1
)
if not defined LOG_LINES set "LOG_LINES=%~1"
if not defined LOG_LINES set "LOG_LINES=50"
where tail >nul 2>&1
if not errorlevel 1 (
  tail -n %LOG_LINES% -f "%LOG_FILE%"
) else (
  echo [lanpm] 未找到 tail，显示最近 %LOG_LINES% 行 - 实时跟踪请用 onekey_run.ps1 logs
  call :log_tail %LOG_LINES%
)
exit /b 0

:cmd_check_dispatch
goto :cmd_check

:cmd_clean_dispatch
goto :cmd_clean
:cmd_build
node "%ROOT%\scripts\onekey-preflight.mjs" --fix --quiet
if errorlevel 1 (
  echo [lanpm] 预检未通过，已中止构建
  exit /b 1
)
echo [lanpm] building ...
call npm run build
if errorlevel 1 exit /b %ERRORLEVEL%
echo [lanpm] build done -^> .lanpm/artifact/out/
exit /b 0
:cmd_preview
echo [lanpm] preview - foreground ...
call npm run preview
exit /b %ERRORLEVEL%
:cmd_rebuild
echo [lanpm] rebuilding native modules ...
call npm run rebuild:native
if errorlevel 1 exit /b %ERRORLEVEL%
echo [lanpm] native deps aligned
exit /b 0
:cmd_install
echo [lanpm] npm install ...
call npm install
if errorlevel 1 (
  echo [lanpm] npm install 失败 - 检查网络或 npm 源
  exit /b 1
)
echo [lanpm] install done - postinstall ensure native
exit /b 0
:cmd_check
set "CHK_MODE=%~1"
if not defined CHK_MODE set "CHK_MODE=!EXT!"
call npm run ensure:native
if errorlevel 1 exit /b %ERRORLEVEL%
call npm run typecheck
if errorlevel 1 exit /b %ERRORLEVEL%
call npm run lint
if errorlevel 1 exit /b %ERRORLEVEL%
if /i not "!CHK_MODE!"=="quick" (
  call npm run verify:m0
  if errorlevel 1 exit /b %ERRORLEVEL%
)
echo [lanpm] check passed
exit /b 0
:cmd_verify
echo [lanpm] verify:m7 - long ...
call npm run verify:m7
exit /b %ERRORLEVEL%
:cmd_clean
set "CLEAN_DEEP=%~1"
if not defined CLEAN_DEEP if defined EXT set "CLEAN_DEEP=!EXT!"
call :test_dev_running
if not errorlevel 1 call :cmd_stop
echo [lanpm] cleaning rebuildable artifacts (keep userData) ...
if exist "%RUN_DIR%\artifact\out" rmdir /s /q "%RUN_DIR%\artifact\out"
if exist "%RUN_DIR%\artifact\dist" rmdir /s /q "%RUN_DIR%\artifact\dist"
if exist "%RUN_DIR%\artifact\test-results" rmdir /s /q "%RUN_DIR%\artifact\test-results"
if exist "%ROOT%\out" rmdir /s /q "%ROOT%\out"
if exist "%ROOT%\dist" rmdir /s /q "%ROOT%\dist"
if exist "%ROOT%\build" rmdir /s /q "%ROOT%\build"
if exist "%ROOT%\test-results" rmdir /s /q "%ROOT%\test-results"
if exist "%RUN_DIR%\coverage" rmdir /s /q "%RUN_DIR%\coverage"
if exist "%ROOT%\coverage" rmdir /s /q "%ROOT%\coverage"
del "%PID_FILE%" "%MODE_FILE%" 2>nul
type nul >"%LOG_FILE%" 2>nul
if exist "%RUN_DIR%\tmp" rmdir /s /q "%RUN_DIR%\tmp"
if exist "%RUN_DIR%\stub-bus" rmdir /s /q "%RUN_DIR%\stub-bus"
if exist "%RUN_DIR%\visual-screenshots" rmdir /s /q "%RUN_DIR%\visual-screenshots"
if exist "%RUN_DIR%\dev-a" rmdir /s /q "%RUN_DIR%\dev-a"
if exist "%RUN_DIR%\dev-b" rmdir /s /q "%RUN_DIR%\dev-b"
mkdir "%RUN_DIR%\tmp" 2>nul
mkdir "%RUN_DIR%\stub-bus" 2>nul
mkdir "%RUN_DIR%\visual-screenshots" 2>nul
echo [lanpm] cleaned .lanpm rebuildables and legacy root out/dist/coverage
if /i "%CLEAN_DEEP%"=="deep" (
  echo [lanpm] deep clean: node_modules + electron cache ...
  if exist "%ROOT%\node_modules" rmdir /s /q "%ROOT%\node_modules"
  if exist "%LOCALAPPDATA%\electron\Cache" rmdir /s /q "%LOCALAPPDATA%\electron\Cache"
  if exist "%LOCALAPPDATA%\electron-builder\Cache" rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache"
  echo [lanpm] deep clean done; run: onekey_run.bat install
)
exit /b 0
:cmd_pack
if not exist "%RUN_DIR%\artifact\out\main" (
  echo [lanpm] .lanpm/artifact/out missing; building first ...
  call npm run build
  if errorlevel 1 exit /b %ERRORLEVEL%
)
echo [lanpm] packing - electron-builder ...
call npx electron-builder --config electron-builder.yml
exit /b %ERRORLEVEL%
:menu_clear
echo.
echo.
exit /b 0
:menu_header
rem 每次进菜单重读版本，避免长驻菜单卡在旧 package.json
set "VER="
for /f "delims=" %%v in ('node -p "require('./package.json').version" 2^>nul') do set "VER=%%v"
if not defined VER set "VER=?"
call :menu_clear
echo.
echo ========================================================
echo   LanPM 一键运维  v%VER%  [CMD]
echo ========================================================
echo.
echo [lanpm] 目录: %ROOT%
call :cmd_menu_brief
echo.
exit /b 0
:menu_check_prompt
set /p "runm0=是否运行 verify:m0? (Y/n): "
if /i "!runm0!"=="n" (call :cmd_check quick) else if /i "!runm0!"=="no" (call :cmd_check quick) else (call :cmd_check)
exit /b 0
:menu_clean_deep_confirm
echo [lanpm] 警告: 将删除 node_modules 与 electron 缓存
set /p "deepconfirm=确认 clean deep? 输入 yes: "
if /i not "!deepconfirm!"=="yes" (
  echo [lanpm] 已取消
  exit /b 0
)
call :cmd_clean deep
exit /b 0
:menu_more
call :menu_header
echo   -- 更多维护 --
echo.
call :print "  1) check       typecheck + lint [+ verify:m0]"
call :print "  2) verify      全量 verify:m7"
call :print "  3) rebuild     重编 native 依赖"
call :print "  4) clean deep  含 node_modules + electron 缓存"
call :print "  5) preview     预览构建 - 前台"
call :print "  0) 返回主菜单"
echo.
set /p "morechoice=请选择 (0-5): "
if defined morechoice set "morechoice=!morechoice: =!"
echo.
if "!morechoice!"=="1" call :menu_check_prompt & goto :menu_more_pause
if "!morechoice!"=="2" call :cmd_verify & goto :menu_more_pause
if "!morechoice!"=="3" call :cmd_rebuild & goto :menu_more_pause
if "!morechoice!"=="4" call :menu_clean_deep_confirm & goto :menu_more_pause
if "!morechoice!"=="5" call :cmd_preview & goto :menu_more_pause
if "!morechoice!"=="0" goto :menu
echo [lanpm] 无效选项: !morechoice!
:menu_more_pause
echo.
pause
goto :menu_more
:menu
call :menu_header
call :print "  1) start      启动 Electron 开发"
call :print "  2) web        仅渲染进程 - 浏览器预览"
call :print "  3) restart    重启开发服务"
call :print "  4) stop       停止开发服务"
call :print "  5) status     查看状态"
call :print "  6) logs       跟踪日志"
call :print "  7) build      生产构建"
call :print "  8) install    npm install"
call :print "  9) clean      清理 .lanpm 可重建项与遗留根 out/dist/coverage"
call :print " 10) pack       安装包 - electron-builder"
call :print " 11) 更多维护   check/verify/rebuild/..."
call :print "  0) exit"
echo.
set /p "choice=请选择 (0-11): "
if defined choice set "choice=!choice: =!"
echo.
if "%choice%"=="11" goto :menu_more
if "%choice%"=="10" call :cmd_pack & goto :menu_pause
if "%choice%"=="1"  call :cmd_start & goto :menu_pause
if "%choice%"=="2"  call :cmd_web & goto :menu_pause
if "%choice%"=="3"  call :cmd_restart & goto :menu_pause
if "%choice%"=="4"  call :cmd_stop & goto :menu_pause
if "%choice%"=="5"  call :cmd_status & goto :menu_pause
if "%choice%"=="6"  set /p "loglines=日志行数 (默认50): " & if not defined loglines set "loglines=50" & call :cmd_logs !loglines! & goto :menu_pause
if "%choice%"=="7"  call :cmd_build & goto :menu_pause
if "%choice%"=="8"  call :cmd_install & goto :menu_pause
if "%choice%"=="9"  call :cmd_clean & goto :menu_pause
if "%choice%"=="0"  echo [lanpm] 再见 & exit /b 0
echo [lanpm] 无效选项: %choice%
:menu_pause
echo.
pause
goto :menu
:help
echo 用法: %~nx0 [命令] [参数]
echo.
echo 命令:
echo   start ^| web ^| stop ^| restart ^| status ^| logs [行数]
echo   build ^| preview ^| rebuild ^| install
echo   check [quick] ^| verify ^| clean [deep] ^| pack ^| menu
echo.
echo 示例:
echo   %~nx0 start
echo   %~nx0 restart
echo   %~nx0 check quick
echo.
echo 说明: 本脚本为 CMD 专用；PowerShell 请用 onekey_run.ps1，Git Bash 请用 onekey_run.sh
exit /b 0
