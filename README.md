# canvas2pdf

Convert a Cursor canvas (`.canvas.tsx`) into a self-contained HTML file and a one-page PDF that keep the same layout.

HTML is the rendered page. The PDF is that page printed by Chromium, so colors, type, tables, and charts stay together. The page is one continuous sheet the width of the canvas panel, not a reflowed A4 document.

## Install

Node.js 20 or newer.

```bash
npm install
npx playwright install chromium
```

## Use

```bash
npx tsx src/cli.ts path/to/report.canvas.tsx
```

This writes `report.html` and `report.pdf` next to the source file.

```bash
npx tsx src/cli.ts report.canvas.tsx --out out/report --theme light --width 960 --format both
```

| Flag | Default | |
| --- | --- | --- |
| `--out` | beside the source | Stem path. `.html` / `.pdf` are stripped. |
| `--theme` | `dark` | `dark` or `light` |
| `--width` | `800` | Page width in pixels |
| `--format` | `both` | `html`, `pdf`, or `both` |
| `--screenshot` | | Full-page PNG |

If `report.canvas.data.json` sits next to the canvas, `useCanvasState` reads it for the snapshot.

## How it works

A canvas only imports `cursor/canvas`. This tool bundles the file with esbuild against a local implementation of that SDK, mounts it in headless Chromium, and saves the DOM. Chart colors and the type scale come from the public canvas tokens.

The IDE font is private, so text uses Segoe UI on Windows and `system-ui` elsewhere. Glyphs can differ slightly from the panel in Cursor. Surfaces that the public tokens do not publish are fixed constants.

Very tall canvases can exceed Chromium’s page-size limit. The HTML file is still written.

## Test

```bash
npm test
```
