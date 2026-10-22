import * as esbuild from "esbuild";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { acquireBrowser, browserGate, BrowserNotReady, releaseBrowser } from "./browser";
import { buildTheme, fontStack, type ThemeKind } from "./sdk/tokens";

const require = createRequire(import.meta.url);

export type Format = "html" | "pdf" | "both";

export type ConvertOptions = {
  input: string;
  out?: string;
  theme?: ThemeKind;
  width?: number;
  format?: Format;
  screenshot?: string;
  /** Return a PNG buffer and do not write HTML or PDF. */
  preview?: boolean;
  /**
   * MCP only. Return as soon as a Chromium download starts instead of holding the tool call.
   * The command line omits this and waits for the install.
   */
  deferBrowser?: boolean;
};

export type ConvertResult = {
  html?: string;
  pdf?: string;
  screenshot?: string;
  preview?: Buffer;
  previewClipped?: boolean;
  width: number;
  height: number;
  warnings: string[];
};

/** Chromium refuses a PDF page larger than 200 inches (96 CSS px per inch). */
export const PDF_MAX_PX = 200 * 96;

export function pdfTooLarge(width: number, height: number): boolean {
  return width > PDF_MAX_PX || height + 1 > PDF_MAX_PX;
}

export function pdfLimitWarning(width: number, height: number): string {
  return `PDF skipped: page ${width}x${height}px exceeds Chromium's 200 inch limit.`;
}

function readState(input: string): Record<string, unknown> {
  const sidecar = input.replace(/\.canvas\.tsx$/, ".canvas.data.json");
  if (!fs.existsSync(sidecar)) return {};
  const parsed: unknown = JSON.parse(fs.readFileSync(sidecar, "utf8"));
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return {};
}

/** Центрирование только в файле HTML: PDF и скриншот снимаются со страницы шириной canvas, без этого правила. */
function centerHtmlForBrowser(html: string): string {
  const head = html.lastIndexOf("</head>");
  if (head === -1) return html;
  return `${html.slice(0, head)}<style>#root{margin-left:auto;margin-right:auto}</style>${html.slice(head)}`;
}

function outputStem(out: string | undefined, input: string): string {
  if (!out) return input.replace(/\.canvas\.tsx$/, "");
  const resolved = path.resolve(out);
  if (/\.(html|pdf)$/i.test(resolved)) return resolved.replace(/\.(html|pdf)$/i, "");
  return resolved;
}

export async function convert(options: ConvertOptions): Promise<ConvertResult> {
  const input = path.resolve(options.input);
  if (!fs.existsSync(input)) throw new Error(`Canvas file not found: ${input}`);

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

  let built: esbuild.BuildResult;
  try {
    built = await esbuild.build({
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
      alias: { "cursor/canvas": sdkEntryPath() },
      plugins: [reactFromPackage()],
      define: { "process.env.NODE_ENV": '"production"' },
      logLevel: "silent",
    });
  } catch (error) {
    const formatted = formatEsbuildError(error);
    if (formatted) throw new Error(formatted);
    throw error;
  }
  const script = built.outputFiles?.[0]?.text?.replaceAll("</script", "<\\/script");
  if (!script) throw new Error("Canvas build produced no code.");

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

  if (options.deferBrowser) {
    const gate = await browserGate();
    if (gate.state !== "ready") throw new BrowserNotReady(gate);
  }

  const browser = await acquireBrowser();
  let page: Awaited<ReturnType<typeof browser.newPage>> | undefined;
  try {
    page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const errors: string[] = [];
    let settleRuntime: (error?: Error) => void = () => {};
    const runtimeFailure = new Promise<void>((resolve, reject) => {
      settleRuntime = (error) => (error ? reject(error) : resolve());
    });
    void runtimeFailure.catch(() => {});
    const reportRuntime = (message: string) => {
      errors.push(message);
      settleRuntime(new Error(errors.join("\n")));
    };
    page.on("pageerror", (error) => reportRuntime(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") reportRuntime(message.text());
    });
    try {
      await Promise.race([
        (async () => {
          await page!.setContent(shell, { waitUntil: "load" });
          await page!.waitForSelector("#root > *", { timeout: 15_000 });
          await page!.evaluate(async () => {
            await document.fonts.ready;
            await new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            });
          });
        })(),
        runtimeFailure,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const extra = errors.filter((entry) => !message.includes(entry));
      throw new Error(extra.length > 0 ? `${message}\n${extra.join("\n")}` : message);
    } finally {
      settleRuntime();
    }
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
    const warnings: string[] = [];
    const wantsPdf = !options.preview && (format === "pdf" || format === "both");
    const tooLarge = wantsPdf && pdfTooLarge(size.width, size.height);
    if (!tooLarge) {
      await page.setViewportSize({ width: size.width, height: Math.max(size.height, 1) });
    }

    const stem = outputStem(options.out, input);
    const result: ConvertResult = { width: size.width, height: size.height, warnings };
    if (!options.preview) fs.mkdirSync(path.dirname(stem), { recursive: true });

    if (!options.preview && (format === "html" || format === "both")) {
      const file = `${stem}.html`;
      fs.writeFileSync(file, centerHtmlForBrowser(await page.content()), "utf8");
      result.html = file;
    }
    if (options.preview) {
      const limit = 1600;
      result.previewClipped = size.height > limit;
      result.preview = await page.screenshot(
        size.height > limit
          ? { clip: { x: 0, y: 0, width: size.width, height: limit } }
          : { fullPage: true },
      );
    }
    if (options.screenshot) {
      const shot = path.resolve(options.screenshot);
      fs.mkdirSync(path.dirname(shot), { recursive: true });
      await page.screenshot({ path: shot, fullPage: true });
      result.screenshot = shot;
    }
    if (wantsPdf && tooLarge) {
      warnings.push(pdfLimitWarning(size.width, size.height));
      if (format === "pdf") throw new Error(warnings[0]);
    } else if (wantsPdf) {
      const file = `${stem}.pdf`;
      try {
        await page.emulateMedia({ media: "screen" });
        await page.pdf({
          path: file,
          width: `${size.width}px`,
          height: `${size.height + 1}px`,
          printBackground: true,
          margin: { top: "0", right: "0", bottom: "0", left: "0" },
        });
        result.pdf = file;
      } catch (error) {
        fs.rmSync(file, { force: true });
        const message = error instanceof Error ? error.message : String(error);
        if (result.html) warnings.push(`PDF was not written: ${message}`);
        else throw error;
      }
    }
    return result;
  } finally {
    await page?.close().catch(() => {});
    await releaseBrowser();
  }
}

function sdkEntryPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, "sdk", "index.tsx"),
    path.join(here, "../src/sdk/index.tsx"),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("Canvas SDK sources were not found in the package.");
  return found;
}

function reactFromPackage(): esbuild.Plugin {
  return {
    name: "react-from-package",
    setup(build) {
      build.onResolve({ filter: /^react(-dom)?(\/|$)/ }, (args) => ({
        path: require.resolve(args.path),
      }));
    },
  };
}

function formatEsbuildError(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("errors" in error)) return undefined;
  const errors = (error as { errors: unknown }).errors;
  if (!Array.isArray(errors)) return undefined;
  return errors
    .map((item) => {
      const entry = item as { text?: string; location?: { file?: string; line?: number; column?: number } | null };
      const loc = entry.location;
      const where = loc?.file ? `${loc.file}:${loc.line ?? 1}:${loc.column ?? 0}` : "build";
      return `${where}: ${entry.text ?? "build failed"}`;
    })
    .join("\n");
}
