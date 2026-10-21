# cursor-canvas-export

<a href="https://www.npmjs.com/package/cursor-canvas-export"><img alt="npm" src="https://img.shields.io/npm/v/cursor-canvas-export.svg" height="28"></a>
<a href="https://cursor.com/install-mcp?name=canvas-export&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImN1cnNvci1jYW52YXMtZXhwb3J0IiwibWNwIl19"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/deeplink/mcp-install-dark.svg"><img alt="Add to Cursor" height="28" src="https://cursor.com/deeplink/mcp-install-light.svg"></picture></a>

Export a Cursor canvas (`.canvas.tsx`) to a self-contained HTML file and a one-page PDF.

HTML is the rendered page. The PDF is that page printed by headless Chromium, so colors, type, tables, and charts stay together. Nothing opens on screen. The page is one continuous sheet the width of the canvas panel.

The same tool is published for agents as an MCP server.

## Install

Node.js 20 or newer.

```bash
npm install
npx playwright install chromium
```

The first export downloads Chromium if it is not cached yet. Later runs reuse that copy on Windows, macOS, and Linux.

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
