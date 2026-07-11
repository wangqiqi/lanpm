# `3rd/` — 改编开源组件

本目录存放**不能开箱即用**、需在本仓库内修改/裁剪/钉版本的开源模块。  
选型总则见 [`docs/MIT开源替代.md`](../docs/MIT开源替代.md) §0 / §0.1。

## 何时放入

- 必须改上游源码才能适配 LanPM（协议、UI、体积、信创等）
- 需要钉死某一 commit，避免 npm 浮动破坏
- 需要裁剪掉无关子系统

## 何时不要放入

- 可直接 `package.json` 依赖且无需改源码 → 用 npm
- 纯业务胶水、无上游 → 放 `src/`，不要假装成 `3rd/`

## 每个子目录清单

```
3rd/<name>/
  LICENSE          # 上游许可（或明确副本）
  ORIGIN.md        # 上游 URL、版本/commit、本仓改动、授权结论
  …                # 源码或子模块内容
```

`ORIGIN.md` 最小模板：

```markdown
# ORIGIN · <name>

- Upstream: <url>
- Version / commit: <tag 或 sha>
- License: MIT | Apache-2.0 | BSD-… （须无传染）
- Why not npm-only: <一句话>
- Local changes: <要点列表>
```

## 授权

仅接受 **MIT / BSD / Apache-2.0 / ISC / Unlicense** 等无传染许可。  
**禁止**将 GPL / AGPL 等传染性许可的库作为 `3rd/` 依赖使用。

## 引用方式

通过 `package.json` 的 `file:3rd/<name>`、workspace 或构建别名引入；  
禁止把 `3rd/` 代码再复制进 `src/` 冒充自研。
