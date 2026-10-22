# cursor-canvas-export

[![npm](https://img.shields.io/npm/v/cursor-canvas-export.svg)](https://www.npmjs.com/package/cursor-canvas-export)
[![Add to Cursor](https://img.shields.io/badge/Add_to_Cursor-111111?logo=cursor&logoColor=white)](https://cursor.com/install-mcp?name=canvas-export&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImN1cnNvci1jYW52YXMtZXhwb3J0IiwibWNwIl19)

Command-line tool and MCP server. It exports a Cursor canvas (`.canvas.tsx`) to a self-contained HTML file and a one-page PDF.

HTML is the rendered page. The PDF is that page printed by headless Chromium, so colors, type, tables, and charts stay together. Nothing opens on screen. The page is one continuous sheet the width of the canvas panel.

## Install

Node.js 20 or newer.

```bash
npm install
npx playwright install chromium
```

The first export downloads Chromium if it is not cached yet. On the command line that download happens inside the command. The MCP tools return immediately and ask for a short wait while the download continues in the background. Later runs reuse that copy on Windows, macOS, and Linux.

## Command line

```bash
npx tsx src/cli.ts path/to/report.canvas.tsx
```

After `npm run build`, or once the package is installed:

```bash
cursor-canvas-export path/to/report.canvas.tsx
canvas-to-html path/to/report.canvas.tsx
canvas-to-pdf path/to/report.canvas.tsx
```

`canvas-to-html` and `canvas-to-pdf` are aliases. They default to one format. `--format` still overrides that.

Files are written next to the canvas: `report.html` and `report.pdf`.

```bash
cursor-canvas-export report.canvas.tsx --out out/report --theme light --width 960 --format both
```

| Flag | Default | |
| --- | --- | --- |
| `--out` | beside the source | Stem path. `.html` / `.pdf` are stripped. |
| `--theme` | `dark` | `dark` or `light` |
| `--width` | `800` | Page width in pixels |
| `--format` | `both` | `html`, `pdf`, or `both` |
| `--screenshot` | | Full-page PNG |

If `report.canvas.data.json` sits next to the canvas, `useCanvasState` reads it for the snapshot.

## MCP

Add this to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "canvas-export": {
      "command": "npx",
      "args": ["-y", "cursor-canvas-export", "mcp"]
    }
  }
}
```

<a href="https://cursor.com/install-mcp?name=canvas-export&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImN1cnNvci1jYW52YXMtZXhwb3J0IiwibWNwIl19"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/deeplink/mcp-install-dark.svg"><img alt="Add to Cursor" src="https://cursor.com/deeplink/mcp-install-light.svg"></picture></a>

The server exposes three tools:

| Tool | Purpose |
| --- | --- |
| `list_canvases` | Find `.canvas.tsx` files under `~/.cursor/projects`, newest first. |
| `export_canvas` | Write HTML and PDF next to the canvas. Accepts a path or a name. |
| `preview_canvas` | Return a PNG of the page. Tall pages are clipped to the top. |

Ask the agent to export a canvas. It calls the tool and returns the file paths.

The first time Chromium is not cached, `export_canvas` and `preview_canvas` return at once and tell the agent to wait about 30 seconds, then call the same tool again with the same arguments. That reply is not a failed export. The file appears when a later call returns the output paths.

## How it works

A canvas only imports `cursor/canvas`. This package bundles the file with esbuild against a local implementation of that SDK, mounts it in headless Chromium, and saves the DOM. Chart colors and the type scale come from the public canvas tokens.

The IDE font is private, so text uses Segoe UI on Windows and `system-ui` elsewhere. Glyphs can differ slightly from the panel in Cursor.

Very tall canvases can exceed Chromium’s page-size limit. The HTML file is still written.

## Test

```bash
npm test
```

## License

MIT
