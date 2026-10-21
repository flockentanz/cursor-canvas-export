import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { closeBrowser, holdBrowserProcess } from "./browser";
import { convert, type Format } from "./convert";
import { listCanvases, resolveCanvas } from "./discover";
import type { ThemeKind } from "./sdk/tokens";

const themeSchema = z.enum(["dark", "light"]).describe("Canvas theme. Defaults to dark.");
const widthSchema = z.number().int().min(320).optional().describe("Page width in pixels. Defaults to 800.");

export function createServer(): McpServer {
  holdBrowserProcess();
  const server = new McpServer({ name: "cursor-canvas-export", version: "0.1.0" });

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
      description:
        "Render a Cursor canvas to HTML and/or a one-page PDF. Pass a full path or a canvas name. Files are written next to the canvas unless out is set. Returns output paths, page size, and warnings. The browser runs headless.",
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
      const result = await convert({
        input: resolved.match.path,
        out,
        format: (format ?? "both") as Format,
        theme: theme as ThemeKind | undefined,
        width,
      });
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
      description:
        "Render a canvas and return a PNG of the page so you can check layout before handing the file over. Tall pages are clipped to the top 1600px. Nothing is written next to the canvas.",
      inputSchema: {
        canvas: z.string().describe("Absolute path to a .canvas.tsx file, or its name without the extension."),
        theme: themeSchema.optional(),
        width: widthSchema,
      },
    },
    async ({ canvas, theme, width }) => {
      const resolved = resolveCanvas(canvas);
      if (!resolved.match) return unresolvedCanvas(canvas, resolved.matches);
      const result = await convert({
        input: resolved.match.path,
        preview: true,
        theme: theme as ThemeKind | undefined,
        width,
      });
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

function text(value: string) {
  return { content: [{ type: "text" as const, text: value }] };
}
