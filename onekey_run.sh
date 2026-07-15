#!/usr/bin/env bash
# LanPM 一键运维脚本 — 交互菜单 + 命令行子命令
# 用法: ./onekey_run.sh [start|restart|stop|status|build|rebuild|check|clean|...]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

RUN_DIR="$ROOT/.lanpm"
PID_FILE="$RUN_DIR/dev.pid"
LOG_FILE="$RUN_DIR/dev.log"
MODE_FILE="$RUN_DIR/dev.mode"

VERSION='?'

refresh_version() {
  VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo '?')"
}

refresh_version

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[lanpm]${NC} $*"; }
ok()    { echo -e "${GREEN}[lanpm]${NC} $*"; }
warn()  { echo -e "${YELLOW}[lanpm]${NC} $*"; }
err()   { echo -e "${RED}[lanpm]${NC} $*" >&2; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { err "缺少命令: $1"; exit 1; }
}

is_windows() {
  case "$(uname -s 2>/dev/null)" in
    MINGW*|MSYS*|CYGWIN*) return 0 ;;
  esac
  return 1
}

pid_alive() {
  local p="$1"
  [[ -n "$p" && "$p" =~ ^[0-9]+$ ]] || return 1
  if is_windows && command -v tasklist >/dev/null 2>&1; then
    tasklist //FI "PID eq $p" 2>/dev/null | grep -qE "[[:space:]]${p}[[:space:]]"
  else
    kill -0 "$p" 2>/dev/null
  fi
}

# Windows：按进程树结束 dev（Git Bash 无 setsid / pgrep）
win_kill_tree() {
  local p="$1"
  if command -v taskkill >/dev/null 2>&1; then
    taskkill //T //PID "$p" >/dev/null 2>&1 || taskkill /T /PID "$p" >/dev/null 2>&1 || true
  else
    kill "$p" 2>/dev/null || true
  fi
}

win_force_kill_tree() {
  local p="$1"
  if command -v taskkill >/dev/null 2>&1; then
    taskkill //F //T //PID "$p" >/dev/null 2>&1 || taskkill /F /T /PID "$p" >/dev/null 2>&1 || true
  else
    kill -9 "$p" 2>/dev/null || true
  fi
}

lanpm_vite_procs() {
  if command -v pgrep >/dev/null 2>&1; then
    pgrep -af "electron-vite" 2>/dev/null | grep -F "$ROOT" || true
    return
  fi
  if is_windows && command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "
      Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" -ErrorAction SilentlyContinue |
        Where-Object { \$_.CommandLine -match 'electron-vite' -and \$_.CommandLine -match 'lanpm' } |
        ForEach-Object { \$_.ProcessId.ToString() + ' ' + \$_.CommandLine }
    " 2>/dev/null || true
  fi
}

lanpm_vite_root_pid() {
  local line pid
  line="$(lanpm_vite_procs | head -1)"
  [[ -n "$line" ]] || return 1
  pid="${line%% *}"
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  echo "$pid"
}

win_stop_lanpm_vite() {
  command -v powershell.exe >/dev/null 2>&1 || return 0
  powershell.exe -NoProfile -Command "
    Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" -ErrorAction SilentlyContinue |
      Where-Object { \$_.CommandLine -match 'electron-vite' -and \$_.CommandLine -match 'lanpm' } |
      ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }
  " >/dev/null 2>&1 || true
}

ensure_run_dir() {
  mkdir -p "$RUN_DIR"
}

read_pid() {
  [[ -f "$PID_FILE" ]] || return 1
  local p
  p="$(tr -d '[:space:]' <"$PID_FILE")"
  [[ -n "$p" && "$p" =~ ^[0-9]+$ ]] || return 1
  echo "$p"
}

# 按会话 / 进程组结束 dev 树（npm → electron-vite → electron）
kill_tree() {
  local p="$1"
  if ! pid_alive "$p"; then
    return 0
  fi
  if is_windows; then
    win_kill_tree "$p"
  else
    # setsid 启动时 p 为 session leader，负 pid 结束整组
    kill -TERM -"$p" 2>/dev/null || kill -TERM "$p" 2>/dev/null || true
  fi
  local i=0
  while pid_alive "$p" && [[ $i -lt 20 ]]; do
    sleep 0.3
    i=$((i + 1))
  done
  if pid_alive "$p"; then
    if is_windows; then
      win_force_kill_tree "$p"
    else
      kill -KILL -"$p" 2>/dev/null || kill -KILL "$p" 2>/dev/null || true
    fi
  fi
}

# 兜底：清理仍监听本项目 vite 端口的残留
cleanup_stray() {
  if [[ -n "$(lanpm_vite_procs)" ]]; then
    warn "清理残留 electron-vite 进程 …"
    if command -v pkill >/dev/null 2>&1; then
      pkill -f "electron-vite" 2>/dev/null || true
    else
      win_stop_lanpm_vite
    fi
    sleep 0.5
  fi
}

is_running() {
  local p
  p="$(read_pid 2>/dev/null)" || return 1
  pid_alive "$p" && return 0
  # Git Bash：npm 父进程可能已退出，electron-vite 仍在
  lanpm_vite_running
}

lanpm_vite_running() {
  [[ -n "$(lanpm_vite_procs)" ]]
}

port_listener_summary() {
  local port="$1"
  if ! command -v lsof >/dev/null 2>&1; then
    echo "未知"
    return 0
  fi
  lsof -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR==2 { print $1, "(pid", $2 ")" }'
}

vite_ports_status() {
  local brief="${1:-}"
  if ! command -v lsof >/dev/null 2>&1; then
    echo "  (未安装 lsof，跳过端口检测)"
    return 0
  fi
  local ports="5173 5174"
  local found=0
  local lanpm_proc="no"
  lanpm_vite_running && lanpm_proc="yes"

  for port in $ports; do
    local who
    who="$(port_listener_summary "$port")"
    [[ -n "$who" ]] || continue
    found=1
    if [[ "$lanpm_proc" == "yes" && "$who" =~ ^(node|electron) ]]; then
      echo "  :$port  LanPM · $who"
    elif [[ "$brief" == "brief" ]]; then
      echo "  :$port  其他占用 · $who（非本脚本 dev，start 可能换端口）"
    else
      echo "  :$port  监听 · $who"
      if [[ "$lanpm_proc" != "yes" ]]; then
        echo "    提示: 若为 Cursor/其他 Vite，与 LanPM 无冲突时可忽略"
      fi
    fi
  done
  [[ $found -eq 0 ]] && echo "  5173/5174 无监听"
}

menu_status_brief() {
  if is_running; then
    local p mode
    p="$(read_pid)"
    mode="electron"
    [[ -f "$MODE_FILE" ]] && mode="$(<"$MODE_FILE")"
    ok "dev: 运行中  pid=$p  mode=$mode"
  else
    warn "dev: 未运行（由本脚本 start/web 启动）"
  fi
  vite_ports_status brief
}

cmd_status() {
  ensure_run_dir
  refresh_version
  info "项目: $ROOT"
  info "版本: v$VERSION"
  echo ""
  if is_running; then
    local p mode
    p="$(read_pid)"
    mode="electron"
    [[ -f "$MODE_FILE" ]] && mode="$(<"$MODE_FILE")"
    ok "开发服务: 运行中 (pid=$p, mode=$mode)"
  else
    warn "开发服务: 未运行"
  fi
  echo ""
  info "Vite 端口（5173/5174）:"
  vite_ports_status
  if ! is_running && lanpm_vite_running; then
    warn "检测到 electron-vite 在运行但未登记 pid，可执行 stop 清理"
  fi
  echo ""
  if [[ -f "$LOG_FILE" ]]; then
    info "最近日志 ($LOG_FILE):"
    tail -n 8 "$LOG_FILE" 2>/dev/null | sed 's/^/  /' || true
  fi
}

check_inotify_linux() {
  [[ "$(uname -s 2>/dev/null)" == "Linux" ]] || return 0
  [[ -r /proc/sys/fs/inotify/max_user_watches ]] || return 0
  local max
  max="$(tr -d '[:space:]' </proc/sys/fs/inotify/max_user_watches)"
  [[ "$max" =~ ^[0-9]+$ ]] || return 0
  if [[ "$max" -lt 200000 ]]; then
    export LANPM_VITE_POLLING=1
    warn "inotify max_user_watches=$max 偏低，已启用 Vite 轮询监视 (LANPM_VITE_POLLING=1)"
    warn "建议永久提升: echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/99-inotify.conf && sudo sysctl --system"
  fi
}

preflight_dev() {
  info "启动前预检（依赖 / native）…"
  if ! node "$ROOT/scripts/onekey-preflight.mjs" --fix; then
    err "预检未通过，已中止启动"
    if is_windows; then
      hint_win_onekey
    fi
    return 1
  fi
}

hint_win_onekey() {
  warn "Windows 推荐: CMD → onekey_run.bat · PowerShell → onekey_run.ps1（Git Bash 下 sh 偶发兼容问题）"
}

diagnose_start_failure() {
  [[ -f "$LOG_FILE" ]] || return 0
  node "$ROOT/scripts/onekey-preflight.mjs" --diagnose-log "$LOG_FILE" 2>/dev/null || true
}

start_dev() {
  local mode="${1:-electron}"
  ensure_run_dir
  need_cmd npm
  need_cmd node
  check_inotify_linux
  preflight_dev || return 1

  if is_running; then
    warn "已在运行 (pid=$(read_pid))，请先 stop 或 restart"
    return 1
  fi

  : >"$LOG_FILE"
  echo "$mode" >"$MODE_FILE"

  info "启动开发模式: $mode …"
  info "日志: $LOG_FILE"

  local npm_script="dev"
  [[ "$mode" == "web" ]] && npm_script="dev:web"

  # Linux setsid：npm 为 session leader，stop 时 kill -TERM -$pid 结束整棵 dev 树
  # Windows Git Bash 无 setsid，用 taskkill /T 结束进程树
  cd "$ROOT"
  export LANPM_ONEKEY=1
  if command -v setsid >/dev/null 2>&1; then
    setsid npm run "$npm_script" >>"$LOG_FILE" 2>&1 &
  else
    npm run "$npm_script" >>"$LOG_FILE" 2>&1 &
  fi
  local pid=$!
  echo "$pid" >"$PID_FILE"
  sleep 3

  if ! pid_alive "$pid" && lanpm_vite_running; then
    local vite_pid
    vite_pid="$(lanpm_vite_root_pid 2>/dev/null || true)"
    if [[ -n "$vite_pid" ]]; then
      pid="$vite_pid"
      echo "$pid" >"$PID_FILE"
    fi
  fi

  if pid_alive "$pid" || lanpm_vite_running; then
    ok "已启动 pid=$pid ($npm_script)"
    info "查看日志: ./onekey_run.sh logs"
  else
    err "启动失败，请查看日志:"
    tail -n 30 "$LOG_FILE" 2>/dev/null || true
    diagnose_start_failure
    rm -f "$PID_FILE" "$MODE_FILE"
    return 1
  fi
}

cmd_start() {
  start_dev "electron"
}

cmd_start_web() {
  start_dev "web"
}

cmd_stop() {
  ensure_run_dir
  local p
  if p="$(read_pid 2>/dev/null)"; then
    info "停止 pid=$p …"
    kill_tree "$p"
    rm -f "$PID_FILE" "$MODE_FILE"
  else
    warn "无 pid 文件，尝试清理残留进程"
  fi
  if lanpm_vite_running; then
    cleanup_stray
  fi
  ok "已停止"
}

cmd_restart() {
  local mode="electron"
  [[ -f "$MODE_FILE" ]] && mode="$(<"$MODE_FILE")"
  cmd_stop || true
  sleep 1
  start_dev "$mode"
}

cmd_logs() {
  ensure_run_dir
  if [[ ! -f "$LOG_FILE" ]]; then
    warn "尚无日志: $LOG_FILE"
    return 1
  fi
  local lines="${1:-50}"
  tail -n "$lines" -f "$LOG_FILE"
}

cmd_build() {
  need_cmd npm
  node "$ROOT/scripts/onekey-preflight.mjs" --fix --quiet || {
    err "预检未通过，已中止构建"
    return 1
  }
  info "生产构建 …"
  npm run build
  ok "构建完成 → out/"
}

cmd_preview() {
  need_cmd npm
  info "预览构建产物 (前台) …"
  npm run preview
}

cmd_rebuild() {
  need_cmd npm
  info "强制重编 native 模块 (better-sqlite3 ↔ Electron) …"
  npm run rebuild:native
  ok "native 依赖已对齐"
}

cmd_install() {
  need_cmd npm
  info "npm install …"
  if ! npm install; then
    err "npm install 失败"
    hint_win_onekey 2>/dev/null || true
    return 1
  fi
  ok "依赖安装完成 (postinstall 已 ensure native)"
}

cmd_check() {
  need_cmd npm
  local quick="${1:-}"
  info "ensure:native …"
  npm run ensure:native
  info "typecheck …"
  npm run typecheck
  info "lint …"
  npm run lint
  if [[ "$quick" != "quick" ]]; then
    info "verify:m0 (storage + suffix + network-stub) …"
    npm run verify:m0
  fi
  ok "检查通过"
}

cmd_verify() {
  need_cmd npm
  info "全量回归 verify:m7（耗时较长）…"
  npm run verify:m7
  ok "verify:m7 通过"
}

cmd_pack() {
  need_cmd npm
  need_cmd npx
  if [[ ! -d "$ROOT/out/main" ]]; then
    warn "未找到 out/，先执行 build …"
    cmd_build
  fi
  info "打包安装包 (electron-builder) …"
  npx electron-builder --config electron-builder.yml
  ok "打包完成 → dist/"
}

cmd_clean() {
  local deep="${1:-}"
  if is_running 2>/dev/null; then
    warn "检测到开发服务在运行，先停止 …"
    cmd_stop || true
  fi
  info "清理构建/测试可重建产物（保留 ~/.config/lanpm）…"
  rm -rf "$ROOT/out" "$ROOT/dist" "$ROOT/coverage"
  rm -f "$ROOT"/*.tsbuildinfo
  find "$ROOT" -name '*.tsbuildinfo' -delete 2>/dev/null || true
  # .lanpm：临时库、Stub 总线、视觉截图、双实例手验目录；保留目录骨架
  if [[ -d "$RUN_DIR" ]]; then
    rm -f "$PID_FILE" "$MODE_FILE"
    : >"$LOG_FILE" 2>/dev/null || rm -f "$LOG_FILE"
    rm -rf "$RUN_DIR/tmp" "$RUN_DIR/stub-bus" "$RUN_DIR/visual-screenshots" \
      "$RUN_DIR/dev-a" "$RUN_DIR/dev-b"
    mkdir -p "$RUN_DIR/tmp" "$RUN_DIR/stub-bus" "$RUN_DIR/visual-screenshots"
  fi
  # 系统 /tmp 残留（历史路径）
  find /tmp -maxdepth 1 -user "$(id -un)" -name 'lanpm*' -exec rm -rf {} + 2>/dev/null || true
  ok "已清理 out/ dist/ coverage/ .lanpm/{tmp,stub-bus,visual-screenshots,dev-*} 与 /tmp/lanpm*"

  if [[ "$deep" == "deep" || "$deep" == "--deep" ]]; then
    warn "深度清理: node_modules + Electron 工具链缓存（可重建）…"
    rm -rf "$ROOT/node_modules"
    rm -rf "${HOME}/.cache/electron" "${HOME}/.cache/electron-builder"
    ok "已删除 node_modules 与 ~/.cache/electron*，请执行: ./onekey_run.sh install"
  fi
}

menu_clear() {
  # 集成终端 full clear 易残留叠影；用换行刷新代替
  printf '\n%.0s' {1..2}
}

menu_pause() {
  echo ""
  read -r -p "按 Enter 继续 …" _
}

menu_check_prompt() {
  local run_m0=""
  read -r -p "是否运行 verify:m0? (Y/n): " run_m0
  case "${run_m0,,}" in
    n|no) cmd_check quick || true ;;
    *) cmd_check || true ;;
  esac
}

menu_clean_deep_confirm() {
  warn "将删除 node_modules 与 Electron 工具链缓存（可重建）"
  local confirm=""
  read -r -p "确认 clean deep? 输入 yes: " confirm
  if [[ "$confirm" == "yes" ]]; then
    cmd_clean deep || true
  else
    info "已取消"
  fi
}

show_menu_header() {
  refresh_version
  menu_clear
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  printf "${CYAN}  LanPM 一键运维${NC}  ${GREEN}v%s${NC}\n" "$VERSION"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  info "目录: $ROOT"
  if is_windows; then
    echo -e "  ${CYAN}Windows:${NC} CMD 用 ${GREEN}onekey_run.bat${NC}，PowerShell 用 ${GREEN}onekey_run.ps1${NC}（勿与本 sh 混用）"
  fi
  menu_status_brief 2>/dev/null || true
  echo ""
}

show_menu() {
  show_menu_header
  echo "  1) start      启动 Electron 开发"
  echo "  2) web        仅渲染进程 (浏览器预览)"
  echo "  3) restart    重启开发服务"
  echo "  4) stop       停止开发服务"
  echo "  5) status     查看状态"
  echo "  6) logs       跟踪日志"
  echo "  7) build      生产构建"
  echo "  8) install    npm install"
  echo "  9) clean      清理 out/dist/coverage/.lanpm 可重建项"
  echo " 10) pack       安装包 (electron-builder)"
  echo " 11) 更多维护   check/verify/rebuild/…"
  echo "  0) exit"
  echo ""
}

show_more_menu() {
  show_menu_header
  echo -e "${YELLOW}  ── 更多维护 ──${NC}"
  echo ""
  echo "  1) check       typecheck + lint [+ verify:m0]"
  echo "  2) verify      全量 verify:m7"
  echo "  3) rebuild     重编 native 依赖"
  echo "  4) clean deep  含 node_modules + electron 缓存"
  echo "  5) preview     预览构建 (前台)"
  echo "  0) 返回主菜单"
  echo ""
}

menu_more_loop() {
  while true; do
    show_more_menu
    read -r -p "请选择 (0-5): " choice
    echo ""
    case "$choice" in
      1) menu_check_prompt ;;
      2) cmd_verify || true ;;
      3) cmd_rebuild || true ;;
      4) menu_clean_deep_confirm ;;
      5) cmd_preview || true ;;
      0|b|B|back) return 0 ;;
      *) warn "无效选项: $choice" ;;
    esac
    menu_pause
  done
}

menu_loop() {
  while true; do
    show_menu
    read -r -p "请选择 (0-11): " choice
    echo ""
    case "$choice" in
      1)  start_dev electron || true ;;
      2)  start_dev web || true ;;
      3)  cmd_restart || true ;;
      4)  cmd_stop || true ;;
      5)  cmd_status ;;
      6)  read -r -p "日志行数 (默认50): " n; cmd_logs "${n:-50}" ;;
      7)  cmd_build ;;
      8)  cmd_install ;;
      9)  cmd_clean ;;
      10) cmd_pack ;;
      11) menu_more_loop ;;
      0|q|Q|exit) ok "再见"; exit 0 ;;
      *) warn "无效选项: $choice" ;;
    esac
    echo ""
    menu_pause
  done
}

usage() {
  cat <<EOF
用法: $0 [命令] [参数]

命令:
  start | start:web | web   启动开发 (Electron / 仅渲染)
  stop                      停止开发服务
  restart                   重启
  status                    状态与端口
  logs [行数]               跟踪 dev 日志 (默认 50)
  build                     npm run build
  preview                   npm run preview (前台)
  rebuild                   重编 better-sqlite3 (Electron ABI)
  install                   npm install
  check [quick]             typecheck + lint [+ verify:m0]
  verify                    npm run verify:m7
  clean [deep]              清理 out/dist/coverage/.lanpm 可重建项 [+ node_modules + electron 缓存]
  pack                      构建安装包 (electron-builder, 需先 build)
  menu                      交互菜单 (默认)
  help                      本帮助

示例:
  $0 start
  $0 restart
  $0 check quick
  $0 clean deep
EOF
}

main() {
  local cmd="${1:-menu}"
  shift || true

  case "$cmd" in
    start)        cmd_start ;;
    start:web|web) cmd_start_web ;;
    stop)         cmd_stop ;;
    restart)      cmd_restart ;;
    status)       cmd_status ;;
    logs)         cmd_logs "${1:-50}" ;;
    build)        cmd_build ;;
    preview)      cmd_preview ;;
    rebuild|rebuild:native) cmd_rebuild ;;
    install)      cmd_install ;;
    check)        cmd_check "${1:-}" ;;
    verify|verify:m7) cmd_verify ;;
    clean)        cmd_clean "${1:-}" ;;
    pack|dist)    cmd_pack ;;
    menu|"")      menu_loop ;;
    help|-h|--help) usage ;;
    *)
      err "未知命令: $cmd"
      usage
      exit 1
      ;;
  esac
}

main "$@"
