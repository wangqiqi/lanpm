#!/usr/bin/env python3
"""Generate index.html for Cloudflare R2 download page from release-assets/."""
from __future__ import annotations

import datetime
import os
import pathlib

TAG = os.environ["TAG"]
_raw_url = os.environ["BASE_URL"].rstrip("/")
BASE_URL = _raw_url if _raw_url.startswith("http") else f"https://{_raw_url}"
REPO = os.environ["REPO"]
ASSETS_DIR = pathlib.Path("release-assets")
NOW = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d %H:%M UTC")

PLATFORM_ORDER = ["Windows", "macOS", "Linux", "Checksums", "Other"]


def classify(name: str) -> tuple[str, str]:
    n = name.lower()
    if n.endswith(".exe"):
        sub = "MSI Installer" if "msi" in n else "NSIS Installer"
        return ("Windows", sub)
    if n.endswith(".msi"):
        return ("Windows", "MSI Installer")
    if n.endswith(".dmg"):
        if "arm64" in n or "aarch64" in n:
            arch = "Apple Silicon"
        elif "x64" in n or "x86" in n:
            arch = "Intel x86_64"
        else:
            arch = "Universal"
        return ("macOS", f"DMG · {arch}")
    if n.endswith(".appimage"):
        arch = "ARM64" if ("arm64" in n or "aarch64" in n) else "x86_64"
        return ("Linux", f"AppImage · {arch}")
    if n.endswith(".deb"):
        return ("Linux", "DEB Package")
    if n.endswith(".blockmap"):
        return ("Checksums", "Blockmap")
    if n.endswith((".yml", ".yaml")) and "latest" in n:
        return ("Checksums", "Auto-update metadata")
    if n.endswith(".sha256"):
        return ("Checksums", "SHA-256")
    return ("Other", "")


def render_card(idx: int, cat: str, items: list[tuple[str, str, str]]) -> str:
    icons = {"Windows": "WIN", "macOS": "MAC", "Linux": "LNX", "Checksums": "CHK", "Other": "PKG"}
    label = icons.get(cat, "PKG")
    rows = ""
    for name, size, desc in items:
        rows += f"""
            <a class="file-row" href="{BASE_URL}/{name}" download>
              <div class="file-info">
                <span class="file-name">{name}</span>
                <span class="file-desc">{desc}</span>
              </div>
              <span class="file-size">{size}</span>
              <span class="dl-btn">↓ Download</span>
            </a>"""
    plural = "files" if len(items) != 1 else "file"
    return f"""
        <div class="card">
          <div class="card-header">
            <span class="card-label">PLATFORM_{idx:03d}</span>
            <span class="card-badge">LATEST</span>
          </div>
          <h2 class="card-title">{cat}</h2>
          <p class="card-sub">{label} · {len(items)} {plural}</p>
          <div class="file-list">{rows}
          </div>
        </div>"""


def main() -> None:
    groups: dict[str, list[tuple[str, str, str]]] = {}
    for f in sorted(ASSETS_DIR.iterdir(), key=lambda p: p.name):
        if not f.is_file() or f.name == "index.html":
            continue
        size_bytes = f.stat().st_size
        size_mb = size_bytes / 1024 / 1024
        size_str = f"{size_mb:.1f} MB" if size_mb >= 0.1 else f"{size_bytes} B"
        cat, desc = classify(f.name)
        groups.setdefault(cat, []).append((f.name, size_str, desc))

    ordered = [(k, groups[k]) for k in PLATFORM_ORDER if k in groups]
    ordered += [(k, groups[k]) for k in groups if k not in PLATFORM_ORDER]
    cards = "\n".join(render_card(i + 1, cat, items) for i, (cat, items) in enumerate(ordered))

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LanPM — Download {TAG}</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    :root {{
      --bg: #0a0a0a; --surface: #111111; --border: #222222;
      --accent: #3b82f6; --accent2: #60a5fa;
      --text: #e8e8e8; --muted: #666666;
      --mono: "SF Mono", "Fira Code", "Consolas", monospace;
    }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg); color: var(--text); min-height: 100vh; }}
    nav {{ display: flex; align-items: center; justify-content: space-between;
      padding: 1.2rem 2.5rem; border-bottom: 1px solid var(--border); }}
    .logo {{ font-family: var(--mono); font-size: .8rem; letter-spacing: .15em;
      text-transform: uppercase; color: var(--accent); font-weight: 700; }}
    .nav-tag {{ font-family: var(--mono); font-size: .75rem; color: var(--muted);
      border: 1px solid var(--border); padding: .2rem .6rem; border-radius: 3px; }}
    .hero {{ padding: 5rem 2.5rem 3.5rem; max-width: 900px; margin: 0 auto; }}
    .hero-eyebrow {{ font-family: var(--mono); font-size: .7rem; letter-spacing: .2em;
      color: var(--accent); text-transform: uppercase; margin-bottom: 1rem; }}
    .hero h1 {{ font-size: clamp(2.2rem, 5vw, 3.5rem); font-weight: 700; line-height: 1.1; margin-bottom: 1rem; }}
    .hero h1 em {{ font-style: normal; color: var(--accent); }}
    .hero p {{ color: var(--muted); max-width: 520px; line-height: 1.7; font-size: .95rem; margin-bottom: 2rem; }}
    .hero-links {{ display: flex; gap: 1rem; flex-wrap: wrap; }}
    .btn-primary {{ display: inline-block; background: var(--accent); color: #fff;
      font-weight: 700; padding: .65rem 1.5rem; font-size: .875rem; text-decoration: none; }}
    .btn-primary:hover {{ background: var(--accent2); }}
    .btn-ghost {{ display: inline-block; color: var(--muted); border: 1px solid var(--border);
      padding: .65rem 1.5rem; font-size: .875rem; text-decoration: none; }}
    .btn-ghost:hover {{ border-color: var(--accent); color: var(--text); }}
    .section {{ max-width: 1100px; margin: 0 auto; padding: 0 2.5rem 5rem; }}
    .section-label {{ font-family: var(--mono); font-size: .7rem; letter-spacing: .2em;
      color: var(--muted); text-transform: uppercase;
      border-top: 1px solid var(--border); padding-top: 2rem; margin-bottom: 2rem; }}
    .grid {{ display: grid; gap: 1px;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); border: 1px solid var(--border); }}
    .card {{ background: var(--surface); padding: 1.75rem 1.5rem; border: 1px solid var(--border);
      display: flex; flex-direction: column; gap: .75rem; }}
    .card:hover {{ border-color: var(--accent); }}
    .card-header {{ display: flex; justify-content: space-between; align-items: center; }}
    .card-label {{ font-family: var(--mono); font-size: .65rem; letter-spacing: .15em;
      color: var(--muted); text-transform: uppercase; }}
    .card-badge {{ font-family: var(--mono); font-size: .6rem; color: var(--accent);
      border: 1px solid var(--accent); padding: .1rem .4rem; }}
    .card-title {{ font-size: 1.3rem; font-weight: 700; }}
    .card-sub {{ font-family: var(--mono); font-size: .7rem; color: var(--accent);
      letter-spacing: .08em; text-transform: uppercase; }}
    .file-list {{ display: flex; flex-direction: column; gap: .3rem; margin-top: .5rem; }}
    .file-row {{ display: flex; align-items: center; gap: .75rem; text-decoration: none;
      color: var(--text); padding: .6rem .5rem; border: 1px solid transparent; }}
    .file-row:hover {{ border-color: var(--border); background: #161616; }}
    .file-info {{ flex: 1; min-width: 0; }}
    .file-name {{ display: block; font-family: var(--mono); font-size: .72rem; word-break: break-all; }}
    .file-desc {{ display: block; font-size: .7rem; color: var(--muted); margin-top: .2rem; }}
    .file-size {{ font-family: var(--mono); font-size: .65rem; color: var(--muted); white-space: nowrap; }}
    .dl-btn {{ color: var(--accent); border: 1px solid var(--accent); padding: .2rem .55rem;
      font-size: .7rem; font-family: var(--mono); }}
    .file-row:hover .dl-btn {{ background: var(--accent); color: #fff; }}
    footer {{ border-top: 1px solid var(--border); padding: 1.5rem 2.5rem;
      display: flex; justify-content: space-between; flex-wrap: wrap; gap: .5rem; }}
    footer span {{ font-family: var(--mono); font-size: .7rem; color: var(--muted); }}
    footer a {{ color: var(--accent); text-decoration: none; }}
  </style>
</head>
<body>
  <nav>
    <span class="logo">LanPM · Downloads</span>
    <span class="nav-tag">{TAG}</span>
  </nav>
  <div class="hero">
    <p class="hero-eyebrow">分布式局域网协作客户端</p>
    <h1>Download <em>LanPM</em></h1>
    <p>聊天、看板、甘特与任务树 — 数据留在局域网，无需中心服务器。</p>
    <div class="hero-links">
      <a class="btn-primary" href="https://github.com/{REPO}/releases/tag/{TAG}" target="_blank">Release Notes</a>
      <a class="btn-ghost" href="https://github.com/{REPO}" target="_blank">View on GitHub →</a>
    </div>
  </div>
  <div class="section">
    <p class="section-label">Available Downloads · {TAG} · {NOW}</p>
    <div class="grid">{cards}
    </div>
  </div>
  <footer>
    <span>© LanPM · <a href="https://github.com/{REPO}" target="_blank">github.com/{REPO}</a></span>
    <span>Updated {NOW}</span>
  </footer>
</body>
</html>"""

    out = ASSETS_DIR / "index.html"
    out.write_text(html, encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
