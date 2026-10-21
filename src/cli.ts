import path from "node:path";
import { fileURLToPath } from "node:url";
import { convert, type Format } from "./convert";
import { serveStdio } from "./mcp";
import type { ThemeKind } from "./sdk/tokens";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const { flags, positionals } = readArgs(argv);
  if (positionals[0] === "mcp") {
    await serveStdio();
    return;
  }

  if (flags.has("help") || positionals.length === 0) {
    process.stdout.write(help());
    process.exit(positionals.length === 0 && !flags.has("help") ? 1 : 0);
  }

  const themeFlag = flags.get("theme");
  if (themeFlag != null && themeFlag !== true && themeFlag !== "dark" && themeFlag !== "light") {
    process.stderr.write("Theme must be dark or light.\n");
    process.exit(1);
  }
  const theme: ThemeKind = themeFlag === "light" ? "light" : "dark";

  const envFormat = process.env.CANVAS_EXPORT_FORMAT;
  const formatFlag = flags.get("format") ?? (envFormat === "html" || envFormat === "pdf" ? envFormat : "both");
  if (formatFlag !== "html" && formatFlag !== "pdf" && formatFlag !== "both") {
    process.stderr.write("Format must be html, pdf, or both.\n");
    process.exit(1);
  }

  const widthFlag = flags.get("width");
  const width = widthFlag == null || widthFlag === true ? 800 : Number(widthFlag);
  if (!Number.isFinite(width) || width < 320) {
    process.stderr.write("Width must be a number of pixels, at least 320.\n");
    process.exit(1);
  }

  const outFlag = flags.get("out");
  const shotFlag = flags.get("screenshot");
  try {
    const result = await convert({
      input: positionals[0],
      out: outFlag === true ? undefined : outFlag,
      theme,
      width,
      format: formatFlag as Format,
      screenshot: shotFlag === true ? undefined : shotFlag,
    });
    if (result.html) process.stdout.write(`${result.html}\n`);
    if (result.pdf) process.stdout.write(`${result.pdf}\n`);
    if (result.screenshot) process.stdout.write(`${result.screenshot}\n`);
    for (const warning of result.warnings) process.stderr.write(`warning: ${warning}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

function help(): string {
  return `cursor-canvas-export <file.canvas.tsx> [options]
cursor-canvas-export mcp

  --out <path>             output stem; .html and .pdf are stripped
  --theme dark|light       default dark
  --width <px>             page width, default 800
  --format html|pdf|both   default both
  --screenshot <png>       full-page PNG

canvas-to-html and canvas-to-pdf are the same command with --format defaulting to html or pdf.
The browser runs headless. Exports are written next to the canvas.
`;
}

function readArgs(tokens: string[]) {
  const flags = new Map<string, string | true>();
  const positionals: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = tokens[index + 1];
    if (next == null || next.startsWith("--")) flags.set(key, true);
    else {
      flags.set(key, next);
      index += 1;
    }
  }
  return { flags, positionals };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked === fileURLToPath(import.meta.url)) {
  await main();
}
