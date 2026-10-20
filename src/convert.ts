import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright";
import { buildTheme, fontStack, type ThemeKind } from "./sdk/tokens";

const sdkEntry = fileURLToPath(new URL("./sdk/index.tsx", import.meta.url));
const projectNodeModules = fileURLToPath(new URL("../node_modules", import.meta.url));

export type Format = "html" | "pdf" | "both";

export type ConvertOptions = {
  input: string;
  out?: string;
  theme?: ThemeKind;
  width?: number;
  format?: Format;
  screenshot?: string;
};

export type ConvertResult = {
  html?: string;
  pdf?: string;
  screenshot?: string;
  width: number;
  height: number;
};

function readState(input: string): Record<string, unknown> {
  const sidecar = input.replace(/\.canvas\.tsx$/, ".canvas.data.json");
  if (!fs.existsSync(sidecar)) return {};
  const parsed: unknown = JSON.parse(fs.readFileSync(sidecar, "utf8"));
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return {};
}

function outputStem(out: string | undefined, input: string): string {
  if (!out) return input.replace(/\.canvas\.tsx$/, "");
  const resolved = path.resolve(out);
  if (/\.(html|pdf)$/i.test(resolved)) return resolved.replace(/\.(html|pdf)$/i, "");
  return resolved;
}

export async function convert(options: ConvertOptions): Promise<ConvertResult> {
  const input = path.resolve(options.input);
  if (!fs.existsSync(input)) throw new Error(`Файл не найден: ${input}`);

  const theme = options.theme ?? "dark";
  const width = options.width ?? 800;
  const format = options.format ?? "both";
  const tokens = buildTheme(theme);
  const specifier = input.replaceAll("\\", "/");
  const wrapper = [
    'import { createRoot } from "react-dom/client";',
    'import { setCanvasStateSeed, setExportTheme } from "cursor/canvas";',
    `import Canvas from ${JSON.stringify(specifier)};`,
    `setExportTheme(${JSON.stringify(theme)});`,
    `setCanvasStateSeed(${JSON.stringify(readState(input))});`,
    'const root = document.getElementById("root");',
    'if (!root) throw new Error("Canvas root element was not found.");',
    "createRoot(root).render(<Canvas />);",
    "",
  ].join("\n");

  const built = await esbuild.build({
    stdin: {
      contents: wrapper,
      resolveDir: path.dirname(input),
      sourcefile: "canvas-entry.tsx",
      loader: "tsx",
    },
    bundle: true,
    format: "iife",
    platform: "browser",
    write: false,
    jsx: "automatic",
    target: "es2022",
    alias: { "cursor/canvas": sdkEntry },
    nodePaths: [projectNodeModules],
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
  });
  const script = built.outputFiles[0]?.text?.replaceAll("</script", "<\\/script");
  if (!script) throw new Error("Сборка canvas не вернула код.");

  const shell = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${width}" />
<title>Canvas</title>
<style>
  :root { color-scheme: ${theme}; }
  html, body { margin: 0; padding: 0; background: ${tokens.bg.editor}; }
  body { font-family: ${fontStack}; }
  #root { width: ${width}px; box-sizing: border-box; padding: 24px 28px 32px; }
</style>
</head>
<body>
<div id="root"></div>
<script>${script}</script>
</body>
</html>`;

  const browser = await launchChromium();
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.setContent(shell, { waitUntil: "load" });
    await page.waitForSelector("#root > *", { timeout: 15_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });
    if (errors.length > 0) throw new Error(errors.join("\n"));

    await page.evaluate(() => {
      const heading = document.querySelector("h1");
      if (heading?.textContent) document.title = heading.textContent.trim();
      document.querySelectorAll("script").forEach((node) => node.remove());
    });

    const size = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
    await page.setViewportSize({ width: size.width, height: Math.max(size.height, 1) });

    const stem = outputStem(options.out, input);
    fs.mkdirSync(path.dirname(stem), { recursive: true });
    const result: ConvertResult = { width: size.width, height: size.height };

    if (format === "html" || format === "both") {
      const file = `${stem}.html`;
      fs.writeFileSync(file, await page.content(), "utf8");
      result.html = file;
    }
    if (options.screenshot) {
      const shot = path.resolve(options.screenshot);
      fs.mkdirSync(path.dirname(shot), { recursive: true });
      await page.screenshot({ path: shot, fullPage: true });
      result.screenshot = shot;
    }
    if (format === "pdf" || format === "both") {
      const file = `${stem}.pdf`;
      await page.emulateMedia({ media: "screen" });
      await page.pdf({
        path: file,
        width: `${size.width}px`,
        height: `${size.height + 1}px`,
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      result.pdf = file;
    }
    return result;
  } finally {
    await browser.close();
  }
}

async function launchChromium(): Promise<Browser> {
  try {
    return await chromium.launch();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Executable doesn't exist") || message.includes("Please run")) {
      throw new Error(
        "Chromium для Playwright не установлен. Выполните: npx playwright install chromium",
        { cause: error },
      );
    }
    throw error;
  }
}
