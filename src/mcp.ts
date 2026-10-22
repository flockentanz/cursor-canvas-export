import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BrowserNotReady, closeBrowser, holdBrowserProcess, warmBrowser } from "./browser";
import { convert, type ConvertResult, type Format } from "./convert";
import { listCanvases, resolveCanvas } from "./discover";
import type { ThemeKind } from "./sdk/tokens";

const themeSchema = z.enum(["dark", "light"]).describe("Canvas theme. Defaults to dark.");
const widthSchema = z.number().int().min(320).optional().describe("Page width in pixels. Defaults to 800.");
const browserWait =
  "If the result tells you to wait because Chromium is downloading, that is not an error. Wait about 30 seconds and call this tool again with the same arguments. Nothing is written until a later call finishes the render.";

export function createServer(): McpServer {
  holdBrowserProcess();
  warmBrowser();
  const server = new McpServer(
    { name: "cursor-canvas-export", version: "0.1.0" },
    {
      instructions:
        "If export_canvas or preview_canvas tells you to wait because Chromium is downloading, that is not an error. Wait about 30 seconds and call the same tool again with the same arguments. The file or preview is ready only when that later call returns it.",
    },
  );

  server.registerTool(
    "list_canvases",
    {
      title: "List canvases",
      description:
        "Find Cursor canvas files (.canvas.tsx) under ~/.cursor/projects. Newest first. Pass workspace to keep only that project's canvases.",
      inputSchema: {
        workspace: z
          .string()
          .optional()
          .describe("Workspace path or name fragment. Omit to list every local canvas."),
      },
    },
    async ({ workspace }) => {
      const hits = listCanvases(workspace);
      return text(
        hits.length === 0
          ? "No canvases found."
          : hits
              .map((hit) => `${hit.name}\t${hit.path}`)
              .join("\n"),
      );
    },
  );

  server.registerTool(
    "export_canvas",
    {
      title: "Export canvas",
      description: `Render a Cursor canvas to HTML and/or a one-page PDF. Pass a full path or a canvas name. Files are written next to the canvas unless out is set. Returns output paths, page size, and warnings. The browser runs headless. ${browserWait}`,
      inputSchema: {
        canvas: z.string().describe("Absolute path to a .canvas.tsx file, or its name without the extension."),
        format: z.enum(["html", "pdf", "both"]).optional().describe("Defaults to both."),
        theme: themeSchema.optional(),
        width: widthSchema,
        out: z.string().optional().describe("Output stem. Extension is ignored. Defaults to beside the canvas."),
      },
    },
    async ({ canvas, format, theme, width, out }) => {
      const resolved = resolveCanvas(canvas);
      if (!resolved.match) return unresolvedCanvas(canvas, resolved.matches);
      let result: ConvertResult;
      try {
        result = await convert({
          input: resolved.match.path,
          out,
          format: (format ?? "both") as Format,
          theme: theme as ThemeKind | undefined,
          width,
          deferBrowser: true,
        });
      } catch (error) {
        const waiting = browserWaitReply("export_canvas", error);
        if (waiting) return waiting;
        throw error;
      }
      const lines = [
        result.html ? `html: ${result.html}` : "",
        result.pdf ? `pdf: ${result.pdf}` : "",
        `page: ${result.width}x${result.height}px`,
        ...result.warnings.map((warning) => `warning: ${warning}`),
      ].filter(Boolean);
      return text(lines.join("\n"));
    },
  );

  server.registerTool(
    "preview_canvas",
    {
      title: "Preview canvas",
      description: `Render a canvas and return a PNG of the page so you can check layout before handing the file over. Tall pages are clipped to the top 1600px. Nothing is written next to the canvas. ${browserWait}`,
      inputSchema: {
        canvas: z.string().describe("Absolute path to a .canvas.tsx file, or its name without the extension."),
        theme: themeSchema.optional(),
        width: widthSchema,
      },
    },
    async ({ canvas, theme, width }) => {
      const resolved = resolveCanvas(canvas);
      if (!resolved.match) return unresolvedCanvas(canvas, resolved.matches);
      let result: ConvertResult;
      try {
        result = await convert({
          input: resolved.match.path,
          preview: true,
          theme: theme as ThemeKind | undefined,
          width,
          deferBrowser: true,
        });
      } catch (error) {
        const waiting = browserWaitReply("preview_canvas", error);
        if (waiting) return waiting;
        throw error;
      }
      const note = result.previewClipped
        ? `Preview clipped to the top 1600px of a ${result.height}px page.`
        : `Preview of ${resolved.match.name}, ${result.width}x${result.height}px.`;
      return {
        content: [
          { type: "text" as const, text: note },
          {
            type: "image" as const,
            data: (result.preview ?? Buffer.alloc(0)).toString("base64"),
            mimeType: "image/png" as const,
          },
        ],
      };
    },
  );

  return server;
}

export async function serveStdio(): Promise<void> {
  const server = createServer();
  process.stdin.on("end", () => {
    void closeBrowser();
  });
  await server.connect(new StdioServerTransport());
}

function unresolvedCanvas(canvas: string, matches: Array<{ path: string }>) {
  if (matches.length === 0) {
    throw new Error(`No canvas found for "${canvas}". Call list_canvases to see available files.`);
  }
  return text(
    `Several canvases match "${canvas}". Pass one full path:\n${matches.map((hit) => hit.path).join("\n")}`,
  );
}

function browserWaitReply(tool: "export_canvas" | "preview_canvas", error: unknown) {
  if (!(error instanceof BrowserNotReady)) return;
  return text(error.gate.state === "downloading" ? downloadingMessage(tool) : failedDownloadMessage(tool, error.gate.message));
}

function downloadingMessage(tool: "export_canvas" | "preview_canvas"): string {
  const until = tool === "export_canvas" ? "it returns the output paths" : "it returns the preview image";
  return [
    `Wait about 30 seconds, then call ${tool} again with the same arguments. Chromium is still downloading.`,
    "This is not an error. The canvas and the arguments are fine. Nothing was rendered or written yet.",
    "The download is already running. Calling the tool again does not start a second download.",
    `After waiting, call ${tool} once more with the same arguments. Repeat until ${until}.`,
  ].join("\n");
}

function failedDownloadMessage(tool: "export_canvas" | "preview_canvas", message: string): string {
  return [
    `Chromium download failed: ${message}`,
    `Wait about 30 seconds, then call ${tool} again with the same arguments. A new download is already running.`,
    "This is not a problem with the canvas or the arguments.",
    "If the same failure comes back, install Chromium from a terminal and call the tool again:",
    "npx playwright install chromium",
  ].join("\n");
}

function text(value: string) {
  return { content: [{ type: "text" as const, text: value }] };
}
