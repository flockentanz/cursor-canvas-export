# Roadmap

Goal: an agent in Cursor can turn a canvas into HTML or PDF when the user asks, through an MCP server installed with one line.

```json
{
  "mcpServers": {
    "canvas-export": { "command": "npx", "args": ["-y", "cursor-canvas-export", "mcp"] }
  }
}
```

Exports are written next to the canvas, in its `canvases/` folder.

Stages 1–3 are in the repository. `npm publish` still needs the repo to be public and an `NPM_TOKEN` secret. Stage 4 is not started.

## 1. Portable package

The converter currently runs only from a clone. Under `npx` it breaks in three places.

- **React resolution.** `convert.ts` points esbuild at `../node_modules`. Resolve `react` and `react-dom` with `require.resolve` instead.
- **Browser, headless.** PDF needs a layout engine: Chromium prints the same DOM that became the HTML. It runs headless, so no window opens on Windows, macOS, or Linux. HTML alone can be rendered without it; PDF and PNG previews cannot, if the layout is to match the canvas. Use Playwright's bundled Chromium, one build per OS, cached after the first run. Do not depend on Edge or a system Chrome.
- **Build.** Bundle the CLI into `dist/`. Ship `src/sdk` as source, because each canvas is compiled against it at run time. Add `bin`, `files`, `engines`, and `license` to `package.json`.

Before publishing:

- Replace the private test canvas and the `report` script with a synthetic fixture that uses the same components.
- Add an MIT `LICENSE`.

## 2. MCP server

`cursor-canvas-2-pdf mcp` starts a stdio server with three tools.

| Tool | Purpose |
| --- | --- |
| `list_canvases` | Find `.canvas.tsx` files under `~/.cursor/projects/*/canvases`, optionally for one workspace, newest first. |
| `export_canvas` | Take a path or canvas name plus format, theme, and width. Return output paths, page size, and warnings. |
| `preview_canvas` | Return a PNG so the agent can check the render before handing the file over. |

- **Lookup by name.** `export_canvas("mysql-load-report")` resolves the file. An ambiguous name returns the candidates.
- **Actionable errors.** Build errors come back as `file:line: message`, so the agent can fix the canvas and retry.
- **Warm browser.** One browser per server process. Repeat exports take about a second.
- **Clean stdout.** Logs go to stderr only; stdout carries the protocol.

Tests start the server with the MCP SDK client and call all three tools on the fixture.

## 3. Release

- Make the repository public.
- Publish `cursor-canvas-2-pdf` to npm.
- Add an "Add to Cursor" install link to the README.
- CI: tests on Windows and Linux; publish on `v*` tags.

## 4. Later

- Cursor plugin bundling the MCP server with a short skill, so the agent exports when asked to send, print, or save a canvas as PDF.
- `--page a4` print layout.
- Fidelity: compare renders with IDE screenshots and tune spacing and type.
