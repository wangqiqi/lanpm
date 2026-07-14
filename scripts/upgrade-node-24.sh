#!/usr/bin/env bash
# LanPM — 将系统 Node.js 升级到 v24（Ubuntu/Debian · NodeSource）
#
# 用法:
#   ./scripts/upgrade-node-24.sh              # 交互确认后安装
#   ./scripts/upgrade-node-24.sh --yes      # 跳过确认
#   ./scripts/upgrade-node-24.sh --dry-run  # 仅打印将执行的步骤
#   ./scripts/upgrade-node-24.sh --yes --rebuild   # 升级后在本项目 npm rebuild
#   ./scripts/upgrade-node-24.sh --method nvm      # 用户级 nvm（无需改系统 node）
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_MAJOR=24
METHOD="nodesource"
ASSUME_YES=0
DRY_RUN=0
REBUILD_PROJECT=0
QUIET=0
STEP_CURRENT=0
STEP_TOTAL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'

info()  { echo -e "${CYAN}[node24]${NC} $*"; }
ok()    { echo -e "${GREEN}[node24]${NC} $*"; }
warn()  { echo -e "${YELLOW}[node24]${NC} $*"; }
err()   { echo -e "${RED}[node24]${NC} $*" >&2; }
detail() { [[ "$QUIET" -eq 1 ]] || echo -e "${DIM}         $*${NC}"; }

step_plan() {
  STEP_TOTAL="$1"
  STEP_CURRENT=0
}

step_begin() {
  STEP_CURRENT=$((STEP_CURRENT + 1))
  echo
  info "[${STEP_CURRENT}/${STEP_TOTAL}] $*"
}

step_done() {
  ok "[${STEP_CURRENT}/${STEP_TOTAL}] 完成"
}

# 长耗时且无输出的命令：后台转圈，结束即停
with_spinner() {
  local msg="$1"
  shift
  if [[ "$DRY_RUN" -eq 1 ]]; then
    info "[dry-run] $msg"
    info "[dry-run] $*"
    return 0
  fi
  detail "$msg"
  local spin='|/-\'
  local i=0
  printf '%s  ' "$msg"
  (
    while true; do
      i=$(((i + 1) % 4))
      printf '\r%s %s ' "$msg" "${spin:$i:1}"
      sleep 0.12
    done
  ) &
  local spin_pid=$!
  if "$@"; then
    kill "$spin_pid" 2>/dev/null || true
    wait "$spin_pid" 2>/dev/null || true
    printf '\r\033[K'
    return 0
  else
    kill "$spin_pid" 2>/dev/null || true
    wait "$spin_pid" 2>/dev/null || true
    printf '\r\033[K'
    return 1
  fi
}

usage() {
  cat <<'EOF'
将 Node.js 升级到 v24。

选项:
  --yes, -y          跳过确认提示
  --dry-run          只显示步骤，不实际安装
  --rebuild          升级后在项目根目录执行 npm rebuild（需已 npm install）
  --method <name>    安装方式: nodesource（默认，需 sudo）| nvm（用户目录，推荐开发机）
  --quiet, -q        减少 apt/curl 详细输出（仍显示步骤进度）
  -h, --help         显示本帮助

示例:
  ./scripts/upgrade-node-24.sh --yes
  sudo ./scripts/upgrade-node-24.sh --yes --rebuild
  ./scripts/upgrade-node-24.sh --method nvm --yes
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y) ASSUME_YES=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --rebuild) REBUILD_PROJECT=1; shift ;;
    --quiet|-q) QUIET=1; shift ;;
    --method)
      METHOD="${2:-}"
      [[ -n "$METHOD" ]] || { err "--method 需要参数: nodesource | nvm"; exit 1; }
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    *) err "未知参数: $1"; usage; exit 1 ;;
  esac
done

case "$METHOD" in
  nodesource|nvm) ;;
  *) err "不支持的 --method: $METHOD（仅 nodesource | nvm）"; exit 1 ;;
esac

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    info "[dry-run] $*"
    return 0
  fi
  "$@"
}

run_sudo() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    info "[dry-run] sudo $*"
    return 0
  fi
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    err "需要 root 或 sudo 权限: $*"
    exit 1
  fi
}

apt_run() {
  local label="$1"
  shift
  local -a apt_args=("$@")
  if [[ "$QUIET" -eq 1 ]]; then
    run_sudo env DEBIAN_FRONTEND=noninteractive apt-get "${apt_args[@]}" -o Dpkg::Progress-Fancy=0
  else
    detail "$label（下方为 apt 下载/安装进度）"
    run_sudo env DEBIAN_FRONTEND=noninteractive apt-get "${apt_args[@]}"
  fi
}

current_node_version() {
  command -v node >/dev/null 2>&1 || return 1
  node -v 2>/dev/null | sed 's/^v//'
}

node_major() {
  local ver="${1:-}"
  [[ -n "$ver" ]] || return 1
  echo "${ver%%.*}"
}

confirm() {
  [[ "$ASSUME_YES" -eq 1 ]] && return 0
  local prompt="$1"
  read -r -p "$prompt [y/N] " ans
  [[ "${ans,,}" == "y" || "${ans,,}" == "yes" ]]
}

require_linux() {
  case "$(uname -s)" in
    Linux) ;;
    *)
      err "当前仅支持 Linux；macOS/Windows 请用 nvm/fnm 或官网安装包。"
      exit 1
      ;;
  esac
}

require_apt() {
  command -v apt-get >/dev/null 2>&1 || {
    err "未找到 apt-get，nodesource 方式仅适用于 Debian/Ubuntu。"
    exit 1
  }
}

print_env() {
  info "项目目录: $ROOT"
  if ver="$(current_node_version)"; then
    info "当前 Node: v$ver ($(command -v node))"
    info "当前 npm:  $(npm -v 2>/dev/null || echo '?')"
  else
    warn "未检测到 node 命令"
  fi
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    info "系统: ${PRETTY_NAME:-$NAME}"
  fi
  info "安装方式: $METHOD → Node.js ${TARGET_MAJOR}.x"
}

install_nodesource() {
  require_linux
  require_apt

  local setup_url="https://deb.nodesource.com/setup_${TARGET_MAJOR}.x"
  step_plan 5

  step_begin "更新 apt 软件源索引"
  detail "若此处停顿，请在终端输入 sudo 密码"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    info "[dry-run] sudo apt-get update"
  elif [[ "$QUIET" -eq 1 ]]; then
    with_spinner "正在 apt-get update …" run_sudo apt-get update -qq
  else
    apt_run "拉取软件包列表" update
  fi
  step_done

  step_begin "安装 curl / gnupg 等基础工具"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    info "[dry-run] sudo apt-get install -y ca-certificates curl gnupg"
  else
    apt_run "安装依赖" install -y ca-certificates curl gnupg
  fi
  step_done

  step_begin "下载 NodeSource 配置脚本 (${TARGET_MAJOR}.x)"
  local tmp=""
  if [[ "$DRY_RUN" -eq 1 ]]; then
    info "[dry-run] curl -fsSL $setup_url"
  else
    tmp="$(mktemp)"
    if [[ "$QUIET" -eq 1 ]]; then
      with_spinner "正在下载 $setup_url …" curl -fsSL "$setup_url" -o "$tmp"
    else
      detail "来源: $setup_url"
      curl -fSL --progress-bar "$setup_url" -o "$tmp"
      echo
    fi
  fi
  step_done

  step_begin "配置 NodeSource 仓库并写入 apt 源"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    info "[dry-run] bash NodeSource setup 脚本"
  else
    detail "执行 NodeSource setup（可能再次调用 apt，请稍候）"
    if [[ "$(id -u)" -eq 0 ]]; then
      bash "$tmp"
    else
      run_sudo bash "$tmp"
    fi
    rm -f "$tmp"
  fi
  step_done

  step_begin "安装 / 升级 nodejs 到 ${TARGET_MAJOR}.x"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    info "[dry-run] sudo apt-get install -y nodejs"
  else
    apt_run "安装 nodejs" install -y nodejs
  fi
  step_done

  hash -r 2>/dev/null || true
}

install_nvm() {
  require_linux
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  step_plan 4

  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    step_begin "安装 nvm 到 $NVM_DIR"
    local install_url="https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      info "[dry-run] curl -fsSL $install_url | bash"
    elif [[ "$QUIET" -eq 1 ]]; then
      with_spinner "正在安装 nvm …" bash -c "curl -fsSL '$install_url' | bash"
    else
      curl -fSL --progress-bar "$install_url" | bash
      echo
    fi
    step_done
  else
    step_begin "检测 nvm"
    detail "已存在: $NVM_DIR"
    step_done
  fi

  # shellcheck disable=SC1091
  [[ "$DRY_RUN" -eq 1 ]] || source "$NVM_DIR/nvm.sh"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    step_begin "安装 Node.js ${TARGET_MAJOR}"
    info "[dry-run] nvm install $TARGET_MAJOR"
    step_done
    return 0
  fi

  step_begin "下载并安装 Node.js ${TARGET_MAJOR}.x（nvm）"
  detail "nvm 会显示官方下载进度"
  nvm install "$TARGET_MAJOR"
  step_done

  step_begin "设置默认 Node 版本"
  nvm alias default "$TARGET_MAJOR"
  nvm use default
  step_done

  warn "请将以下内容加入 ~/.bashrc（install.sh 通常已自动追加）:"
  echo '  export NVM_DIR="$HOME/.nvm"'
  echo '  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'
}

rebuild_project_deps() {
  [[ "$REBUILD_PROJECT" -eq 1 ]] || return 0
  [[ "$DRY_RUN" -eq 1 ]] && { info "[dry-run] cd $ROOT && npm rebuild"; return 0; }

  if [[ ! -d "$ROOT/node_modules" ]]; then
    warn "未找到 $ROOT/node_modules，跳过 rebuild。可先执行: npm install"
    return 0
  fi

  STEP_TOTAL=$((STEP_TOTAL + 1))
  step_begin "重建项目 native 模块 (npm rebuild)"
  (cd "$ROOT" && npm rebuild)
  step_done
}

verify_install() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    info "[dry-run] 跳过版本校验"
    return 0
  fi

  STEP_TOTAL=$((STEP_TOTAL + 1))
  step_begin "校验 Node.js 版本"
  hash -r 2>/dev/null || true

  local ver major
  ver="$(current_node_version || true)"
  [[ -n "$ver" ]] || { err "升级后仍无法运行 node"; exit 1; }

  major="$(node_major "$ver")"
  if [[ "$major" != "$TARGET_MAJOR" ]]; then
    err "期望 Node ${TARGET_MAJOR}.x，实际 v$ver ($(command -v node))"
    if [[ "$METHOD" == "nvm" ]]; then
      warn "请在新 shell 中 source nvm，或确认 PATH 中 nvm 的 node 优先于 /usr/bin/node"
    fi
    exit 1
  fi

  ok "Node.js v$ver"
  ok "npm $(npm -v)"
  ok "路径: $(command -v node)"
  step_done
}

main() {
  print_env

  local cur major=""
  if cur="$(current_node_version)"; then
    major="$(node_major "$cur")"
    if [[ "$major" == "$TARGET_MAJOR" ]]; then
      ok "已是 Node ${TARGET_MAJOR}.x (v$cur)，无需升级。"
      rebuild_project_deps
      exit 0
    fi
    warn "将从 Node v$cur 升级到 ${TARGET_MAJOR}.x"
  fi

  if [[ "$METHOD" == "nodesource" ]]; then
    warn "nodesource 方式会修改系统级 /usr/bin/node（需要 sudo）。"
    warn "若仅需本项目开发，可考虑: $0 --method nvm --yes"
  fi

  confirm "继续安装?" || { info "已取消"; exit 0; }

  case "$METHOD" in
    nodesource) install_nodesource ;;
    nvm)        install_nvm ;;
  esac

  verify_install
  rebuild_project_deps

  echo
  ok "Node.js ${TARGET_MAJOR} 安装完成。"
  if [[ "$METHOD" == "nodesource" && "$REBUILD_PROJECT" -eq 0 ]]; then
    info "建议在本项目执行: npm rebuild  或  ./onekey_run.sh install"
  fi
  if [[ "$METHOD" == "nvm" ]]; then
    info "请执行: source ~/.nvm/nvm.sh  或重新打开终端"
  fi
}

main "$@"
