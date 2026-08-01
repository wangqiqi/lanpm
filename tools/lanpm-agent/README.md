# lanpm-agent

Headless **LanPM Ops Agent** — runs via the main CLI (Electron-as-Node):

```bash
# from repository root
lanpm agent start --name prod-web-01 --root ./data
lanpm agent start --name prod-web-01 --root ./data --pairing-code 847293 --host 192.168.1.10
```

Handles `ops_command` / `ops_inbound` over P2P; writes to `inbound/` and reads `outbound/logs/`.

See `docs/功能扩展.md` · `npm run verify:ops-agent`.
