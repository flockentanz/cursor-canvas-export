import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { closeBrowser } from "../src/browser";
import { createServer } from "../src/mcp";

const require = createRequire(import.meta.url);

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
    assertPng(preview);
  } finally {
    await client.close();
    await closeBrowser();
    if (previous === undefined) delete process.env.CANVAS_PROJECTS_DIR;
    else process.env.CANVAS_PROJECTS_DIR = previous;
  }
});

test("mcp returns candidates for an ambiguous name and a file:line build error", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "canvas-mcp-"));
  const alpha = path.join(root, "alpha-workspace", "canvases");
  const beta = path.join(root, "beta-workspace", "canvases");
  fs.mkdirSync(alpha, { recursive: true });
  fs.mkdirSync(beta, { recursive: true });
  fs.copyFileSync(path.resolve("fixtures/gallery.canvas.tsx"), path.join(alpha, "notes.canvas.tsx"));
  fs.copyFileSync(path.resolve("fixtures/gallery.canvas.tsx"), path.join(beta, "notes.canvas.tsx"));
  fs.copyFileSync(path.resolve("fixtures/broken.canvas.tsx"), path.join(beta, "broken.canvas.tsx"));
  const previous = process.env.CANVAS_PROJECTS_DIR;
  process.env.CANVAS_PROJECTS_DIR = root;

  const client = new Client({ name: "test", version: "0" });
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  try {
    const ambiguous = await client.callTool({ name: "export_canvas", arguments: { canvas: "notes", format: "html" } });
    const ambiguousText = textOf(ambiguous);
    assert.equal(isError(ambiguous), false);
    assert.match(ambiguousText, /Several canvases match "notes"/);
    assert.match(ambiguousText, /alpha-workspace/);
    assert.match(ambiguousText, /beta-workspace/);

    const broken = await client.callTool({ name: "export_canvas", arguments: { canvas: "broken", format: "html" } });
    const brokenText = textOf(broken);
    assert.equal(isError(broken), true);
    assert.match(brokenText, /broken\.canvas\.tsx:\d+:/);
    assert.match(brokenText, /NotAComponent/);

    const missing = await client.callTool({ name: "export_canvas", arguments: { canvas: "missing-canvas" } });
    assert.equal(isError(missing), true);
    assert.match(textOf(missing), /No canvas found/);
  } finally {
    await client.close();
    await closeBrowser();
    if (previous === undefined) delete process.env.CANVAS_PROJECTS_DIR;
    else process.env.CANVAS_PROJECTS_DIR = previous;
  }
});

test("stdio mcp server calls all three tools and keeps stdout for the protocol", { timeout: 180_000 }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "canvas-mcp-stdio-"));
  const dir = path.join(root, "demo-workspace", "canvases");
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.resolve("fixtures/gallery.canvas.tsx"), path.join(dir, "gallery.canvas.tsx"));
  const tsxCli = path.join(path.dirname(require.resolve("tsx/package.json")), "dist", "cli.mjs");

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [tsxCli, path.resolve("src/cli.ts"), "mcp"],
    cwd: path.resolve("."),
    env: childEnv({ CANVAS_PROJECTS_DIR: root }),
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr?.on("data", (chunk: Buffer | string) => {
    stderr += typeof chunk === "string" ? chunk : chunk.toString("utf8");
  });

  const client = new Client({ name: "test", version: "0" });
  await client.connect(transport);
  try {
    const listed = await client.callTool({ name: "list_canvases", arguments: {} });
    assert.match(textOf(listed), /gallery/);

    const exported = await client.callTool({
      name: "export_canvas",
      arguments: { canvas: "gallery", format: "html" },
    });
    const exportedText = textOf(exported);
    assert.match(exportedText, /html: /);
    assert.match(exportedText, /page: \d+x\d+px/);
    const htmlPath = exportedText.match(/html: (.+)/)?.[1]?.trim();
    assert.ok(htmlPath);
    assert.match(fs.readFileSync(htmlPath, "utf8"), /Export gallery/);

    const preview = await client.callTool({ name: "preview_canvas", arguments: { canvas: "gallery" } });
    assertPng(preview);
    assert.equal(stderr.includes('"jsonrpc"'), false);
  } finally {
    await client.close();
  }
});

function childEnv(extra: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  return { ...env, ...extra };
}

function assertPng(result: unknown): void {
  const image = contentOf(result).find((item) => item.type === "image");
  const data = image?.data;
  assert.equal(image?.mimeType, "image/png");
  assert.ok(data && data.length > 100);
}

function isError(result: unknown): boolean {
  return Boolean(result && typeof result === "object" && "isError" in result && (result as { isError?: boolean }).isError);
}

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
