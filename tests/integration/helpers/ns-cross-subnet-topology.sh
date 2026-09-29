#!/usr/bin/env bash
# 跨网段「三节点」命名空间拓扑：A/B 两个端点 + R 路由器（真实 L2/L3 隔离）。
#
# 由 tests/integration/verify-cross-subnet-namespaces.ts 以
#   unshare -rn bash tests/integration/helpers/ns-cross-subnet-topology.sh <BASE> <REPO> <NODE> [WAIT_MS] [UDP_MS] [ISO_WAIT_MS]
# 调用；也可以手工执行同一命令行调试。需要非特权 user+net namespace（`unshare -rn`）。
#
# 拓扑（单个 userns 内）：
#   A: 192.168.20.10/24 (veth-ab ── 直连段，仅阶段 1 使用) · 192.168.30.10/24 (veth-ar → R)
#   B: 192.168.20.11/24 (veth-ba ── 同上)              · 192.168.31.10/24 (veth-br → R)
#   R: 192.168.30.1/24 + 192.168.31.1/24，ip_forward=1
#
# 三阶段（对应 docs/08 §3.1 / §3.2 / §3.3）：
#   1 同网段：直连段 UP → UDP 广播发现应当互相可见（对照组，证明探针能发现）
#   2 跨网段可达：直连段 DOWN，走 R 路由 → ping 通 · UDP 广播不跨段 · 连接码 + 完整 IP 走 TCP 成功
#   3 跨网段隔离：关转发 + 删默认路由 → ping 不通 · 连接码同样失败（产品不适用）
#
# 每个端点进程用独立 LANPM_USER_DATA，避免共享密钥库/实例锁互相干扰。
# 结论写为 JSON/文本到 <BASE>/，由 orchestrator 断言；本脚本不判断通过与否。
set -u

BASE="${1:?usage: ns-cross-subnet-topology.sh BASE REPO NODE [WAIT_MS] [UDP_MS] [ISO_WAIT_MS]}"
REPO="${2:?repo root required}"
NODE_BIN="${3:?node binary required}"
WAIT_MS="${4:-15000}"
UDP_MS="${5:-6000}"
ISO_WAIT_MS="${6:-6000}"

PROBE="$REPO/tests/integration/pairingNamespaceProbe.ts"
PORT=43124
SAME_A=192.168.20.10
SAME_B=192.168.20.11
A_IP=192.168.30.10
B_IP=192.168.31.10
R_A_IP=192.168.30.1
R_B_IP=192.168.31.1

mkdir -p "$BASE"
: >"$BASE/script.log"

log() { echo "[ns] $*" | tee -a "$BASE/script.log"; }

# --- 三个 netns 持有进程（命令结束即随 userns 一起消失） ---
unshare -n sleep 900 & PID_A=$!
unshare -n sleep 900 & PID_B=$!
unshare -n sleep 900 & PID_R=$!
cleanup() {
  kill "$PID_A" "$PID_B" "$PID_R" 2>/dev/null || true
}
trap cleanup EXIT
sleep 0.5

in_a() { nsenter -t "$PID_A" -n "$@"; }
in_b() { nsenter -t "$PID_B" -n "$@"; }
in_r() { nsenter -t "$PID_R" -n "$@"; }

# --- 拓扑 ---
ip link add veth-ab type veth peer name veth-ba
ip link add veth-ar type veth peer name veth-ra
ip link add veth-br type veth peer name veth-rb
ip link set veth-ab netns "$PID_A"
ip link set veth-ba netns "$PID_B"
ip link set veth-ar netns "$PID_A"
ip link set veth-br netns "$PID_B"
ip link set veth-ra netns "$PID_R"
ip link set veth-rb netns "$PID_R"

in_a bash -c "ip link set lo up; ip link set veth-ab up; ip addr add $SAME_A/24 dev veth-ab; ip addr add $A_IP/24 dev veth-ar"
in_b bash -c "ip link set lo up; ip link set veth-ba up; ip addr add $SAME_B/24 dev veth-ba; ip addr add $B_IP/24 dev veth-br"
in_r bash -c "ip link set lo up; ip link set veth-ra up; ip addr add $R_A_IP/24 dev veth-ra; ip link set veth-rb up; ip addr add $R_B_IP/24 dev veth-rb; echo 1 > /proc/sys/net/ipv4/ip_forward"
log "topology ready: A=$A_IP/$SAME_A B=$B_IP/$SAME_B R=$R_A_IP,$R_B_IP (直连段 UP，路由段 DOWN)"

run_probe() { # PID label role out extra...
  local pid="$1" label="$2" role="$3" out="$4"
  shift 4
  timeout 90 nsenter -t "$pid" -n env "LANPM_USER_DATA=$BASE/data-$label" \
    "$NODE_BIN" --experimental-strip-types "$PROBE" --role "$role" --label "$label" \
    --port "$PORT" --json-out "$out" "$@" >>"$BASE/script.log" 2>&1
  echo $? >"$out.rc"
}

# ---------------- 阶段 1：同网段（对照组） ----------------
# Linux 上发 255.255.255.255 需要一条默认路由才会选接口；同网段阶段默认网关就是对端本身。
in_a ip route add default via "$SAME_B"
in_b ip route add default via "$SAME_A"
log "phase 1: same /24 segment — UDP discovery control (default via peer)"
run_probe "$PID_A" p1a udp-probe "$BASE/phase1-a.json" --wait-ms "$UDP_MS" &
P1A=$!
run_probe "$PID_B" p1b udp-probe "$BASE/phase1-b.json" --wait-ms "$UDP_MS" &
P1B=$!
wait "$P1A" "$P1B"

# ---------------- 阶段 2：跨网段可达 ----------------
# 直连段下、路由段起：此时唯一的默认路由走 veth-ar/veth-br，
# 与真实「各主机广播只出自己的网段、路由器不转发广播」一致。
in_a ip link set veth-ab down
in_b ip link set veth-ba down
in_a bash -c "ip link set veth-ar up; ip route replace default via $R_A_IP"
in_b bash -c "ip link set veth-br up; ip route replace default via $R_B_IP"
log "phase 2: distinct /24 behind router — direct link down"

if in_a ping -c1 -W2 "$B_IP" >/dev/null 2>&1; then
  echo OK >"$BASE/phase2-ping.txt"
else
  echo FAIL >"$BASE/phase2-ping.txt"
fi
log "phase 2 ping A->B: $(cat "$BASE/phase2-ping.txt")"

run_probe "$PID_A" p2a udp-probe "$BASE/phase2-a.json" --wait-ms "$UDP_MS" &
P2A=$!
run_probe "$PID_B" p2b udp-probe "$BASE/phase2-b.json" --wait-ms "$UDP_MS" &
P2B=$!
wait "$P2A" "$P2B"

run_probe "$PID_A" p2host host "$BASE/phase2-host.json" \
  --code-file "$BASE/phase2-code.json" --wait-ms "$WAIT_MS" &
P2HOST=$!
for _ in $(seq 1 100); do
  [ -s "$BASE/phase2-code.json" ] && break
  sleep 0.1
done
run_probe "$PID_B" p2join join "$BASE/phase2-join.json" \
  --peer-host "$A_IP" --peer-port "$PORT" --code-file "$BASE/phase2-code.json" --wait-ms "$WAIT_MS"
wait "$P2HOST" 2>/dev/null || true
log "phase 2 pairing: join rc=$(cat "$BASE/phase2-join.json.rc" 2>/dev/null) host rc=$(cat "$BASE/phase2-host.json.rc" 2>/dev/null)"

# ---------------- 阶段 3：跨网段隔离 ----------------
in_r bash -c "echo 0 > /proc/sys/net/ipv4/ip_forward"
in_a ip route del default >/dev/null 2>&1 || true
in_b ip route del default >/dev/null 2>&1 || true
log "phase 3: forwarding off + default routes removed"

if in_a ping -c1 -W2 "$B_IP" >/dev/null 2>&1; then
  echo OK >"$BASE/phase3-ping.txt"
else
  echo FAIL >"$BASE/phase3-ping.txt"
fi
log "phase 3 ping A->B: $(cat "$BASE/phase3-ping.txt")"

run_probe "$PID_A" p3host host "$BASE/phase3-host.json" \
  --code-file "$BASE/phase3-code.json" --wait-ms "$ISO_WAIT_MS" &
P3HOST=$!
for _ in $(seq 1 100); do
  [ -s "$BASE/phase3-code.json" ] && break
  sleep 0.1
done
run_probe "$PID_B" p3join join "$BASE/phase3-join.json" \
  --peer-host "$A_IP" --peer-port "$PORT" --code-file "$BASE/phase3-code.json" --wait-ms "$ISO_WAIT_MS"
wait "$P3HOST" 2>/dev/null || true
log "phase 3 pairing: join rc=$(cat "$BASE/phase3-join.json.rc" 2>/dev/null) host rc=$(cat "$BASE/phase3-host.json.rc" 2>/dev/null)"

log "done"
