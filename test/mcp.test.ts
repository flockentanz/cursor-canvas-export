import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { closeBrowser } from "../src/browser";
import { createServer } from "../src/mcp";

test("mcp lists and exports a canvas by name", { timeout: 180_000 }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "canvas-mcp-"));
  const dir = path.join(root, "demo-workspace", "canvases");
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.resolve("fixtures/gallery.canvas.tsx"), path.join(dir, "gallery.canvas.tsx"));
  const previous = process.env.CANVAS_PROJECTS_DIR;
  process.env.CANVAS_PROJECTS_DIR = root;

  const client = new Client({ name: "test", version: "0" });
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  try {
    const listed = await client.callTool({ name: "list_canvases", arguments: {} });
    const listedText = textOf(listed);
    assert.match(listedText, /gallery/);

    const exported = await client.callTool({
      name: "export_canvas",
      arguments: { canvas: "gallery", format: "html" },
    });
    const exportedText = textOf(exported);
    assert.match(exportedText, /html: /);
    const htmlPath = exportedText.match(/html: (.+)/)?.[1]?.trim();
    assert.ok(htmlPath);
    assert.match(fs.readFileSync(htmlPath, "utf8"), /Export gallery/);

    const preview = await client.callTool({ name: "preview_canvas", arguments: { canvas: "gallery" } });
    const image = contentOf(preview).find((item) => item.type === "image");
    assert.equal(image?.mimeType, "image/png");
    assert.ok(image && "data" in image && image.data.length > 100);
  } finally {
    await client.close();
    await closeBrowser();
    if (previous === undefined) delete process.env.CANVAS_PROJECTS_DIR;
    else process.env.CANVAS_PROJECTS_DIR = previous;
  }
});

function contentOf(result: unknown): Array<{ type: string; text?: string; data?: string; mimeType?: string }> {
  if (!result || typeof result !== "object" || !("content" in result)) return [];
  const content = (result as { content: unknown }).content;
  return Array.isArray(content) ? (content as Array<{ type: string; text?: string; data?: string; mimeType?: string }>) : [];
}

function textOf(result: unknown): string {
  return contentOf(result)
    .filter((item) => item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n");
}
