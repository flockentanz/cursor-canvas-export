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

Stages 1–3 are in the repository. Publish `cursor-canvas-export` by pushing a `v*` tag. Stage 4 is specified and not started.

## 1. Portable package

The converter currently runs only from a clone. Under `npx` it breaks in three places.

- **React resolution.** `convert.ts` points esbuild at `../node_modules`. Resolve `react` and `react-dom` with `require.resolve` instead.
- **Browser, headless.** PDF needs a layout engine: Chromium prints the same DOM that became the HTML. It runs headless, so no window opens on Windows, macOS, or Linux. HTML alone can be rendered without it; PDF and PNG previews cannot, if the layout is to match the canvas. Use Playwright's bundled Chromium, one build per OS, cached after the first run. Do not depend on Edge or a system Chrome.
- **Build.** Bundle the CLI into `dist/`. Ship `src/sdk` as source, because each canvas is compiled against it at run time. Add `bin`, `files`, `engines`, and `license` to `package.json`.

Before publishing:

- Replace the private test canvas and the `report` script with a synthetic fixture that uses the same components.
- Add an MIT `LICENSE`.

## 2. MCP server

`cursor-canvas-export mcp` starts a stdio server with three tools.

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
- Publish `cursor-canvas-export` to npm.
- Add an "Add to Cursor" install link to the README.
- CI: tests on Windows and Linux; publish on `v*` tags.

## 4. Cursor plugin

A Cursor plugin is a folder the IDE installs. It is not a VS Code extension and it does not add a panel. After install, the agent receives the MCP server and a skill, so the user does not paste an `mcp.json` entry by hand.

Layout in this repo:

```
.cursor-plugin/plugin.json    name, description, license, link to mcp.json
mcp.json                      stdio: npx -y cursor-canvas-export mcp
skills/export-canvas/SKILL.md
```

`plugin.json` follows the same shape as other Cursor plugins: `name`, `displayName`, `description`, `author`, `license`, and `mcpServers` pointing at `mcp.json`. The skill tells the agent to call `export_canvas` when the user asks to send, print, save, or share a canvas, and to call `preview_canvas` before handing the file over. HTML and PDF stay aliases of one tool.

The plugin depends on stage 3: `npx` must resolve `cursor-canvas-export`. Marketplace listing can wait. Until then the folder is enough to install from the repo.

## 5. Later

- `--page a4` print layout.
- Fidelity: compare renders with IDE screenshots and tune spacing and type.
