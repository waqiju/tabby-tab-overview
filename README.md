# tabby-tab-overview

Fullscreen live thumbnail grid overview (`Win+Tab` style) plugin for [Tabby Terminal](https://tabby.sh/).

## Features

- **Toggle Tab Overview** (`Ctrl+Shift+O` by default, or click the grid icon in the top toolbar)
- **Workspace Snapshots (Save & Restore)**:
  - Subtle **Save** and **Restore** pill icon buttons right next to the tab counter in the Tab Overview header (plus global `Ctrl+Shift+S` quick-save hotkey)
  - Saves full Tabby recovery tokens (including splits, CWDs, and active `pi` TUI sessions via `tabby-pi-companion`) into named JSON snapshots under `<Tabby config dir>/workspaces/`
  - **Append + Smart Deduplication**: Restoring opens missing tabs without closing existing ones, skipping already-open `pi` sessions or identical terminal tabs
  - **Staggered Launch**: Launches restored tabs sequentially with a 250ms stagger so restoring 10+ tabs stays smooth and responsive
- Renders live terminal screen thumbnails directly from `xterm.buffer.active` (works across WebGL / Canvas / DOM frontends and inactive background tabs)
- Keyboard & mouse navigation:
  - `←` `↑` `↓` `→`: Move selection across the grid
  - `Enter` or Click: Switch to the selected tab and close overview
  - `1`–`9`: Jump directly to tab 1–9
  - `Delete` / `Backspace` or `×`: Close tab
  - `Esc` or `Ctrl+Shift+O`: Dismiss overview

## Development & Local Deployment

```bash
npm install --legacy-peer-deps
npm run deploy
```

`npm run deploy` builds `dist/index.js` and copies only `package.json` + `dist/` (without `node_modules/`) into `%APPDATA%\tabby\plugins\node_modules\tabby-tab-overview`.

Restart Tabby after deploying to load changes. You can customize the shortcut anytime in Tabby **Settings → Hotkeys → Toggle Tab Overview (Thumbnail Grid)**.
