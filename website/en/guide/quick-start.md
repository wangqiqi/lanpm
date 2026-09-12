# Quick Start

**Prerequisites:** Node.js 20+, npm 10+, Git.

```bash
git clone https://github.com/wangqiqi/lanpm.git
cd lanpm
chmod +x onekey_run.sh    # first time (Unix)
./onekey_run.sh start     # or: npm install && npm run dev
```

| OS | Command |
|----|---------|
| Windows CMD | `onekey_run.bat start` |
| PowerShell | `.\onekey_run.ps1 start` |
| Git Bash / WSL | `./onekey_run.sh start` |

First launch runs a short setup wizard, then opens the demo group at `#/g/demo-project/chat`.

**Navigation:** Gantt, calendar, and **Files** are hidden from the bottom bar by default—enable them under **avatar → Profile → Navigation & views**. **Whiteboard** is only available from the chat collaboration drawer or a direct URL (not a bottom tab).

## Verify locally

```bash
npm run lint && npm run typecheck && npm run test
npm run verify:p0
```

**Note:** Acceptance source of truth is **Electron** (`npm run dev`), not the browser stub (`npm run dev:web`). See [Contributing — Verification](/en/guide/contributing#verification-common) for more guards.

## Downloads

Pre-built installers are published via [GitHub Releases](https://github.com/wangqiqi/lanpm/releases). Pick the package for your OS and architecture.

## Next steps

- [Features](/en/guide/features)
- [Contributing](/en/guide/contributing)
