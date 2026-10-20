import { convert, type Format } from "./convert";
import type { ThemeKind } from "./sdk/tokens";

const argv = process.argv.slice(2);

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

function help(): string {
  return `canvas2pdf <file.canvas.tsx> [опции]

  --out <путь>             файл без расширения или каталог назначения
  --theme dark|light       тема, по умолчанию dark
  --width <px>             ширина страницы, по умолчанию 800
  --format html|pdf|both   что записать, по умолчанию both
  --screenshot <png>       полный снимок страницы
`;
}

const { flags, positionals } = readArgs(argv);

if (flags.has("help") || positionals.length === 0) {
  process.stdout.write(help());
  process.exit(positionals.length === 0 && !flags.has("help") ? 1 : 0);
}

const themeFlag = flags.get("theme");
const theme: ThemeKind = themeFlag === "light" ? "light" : "dark";
if (themeFlag != null && themeFlag !== true && themeFlag !== "dark" && themeFlag !== "light") {
  process.stderr.write("Тема должна быть dark или light.\n");
  process.exit(1);
}

const formatFlag = flags.get("format") ?? "both";
if (formatFlag !== "html" && formatFlag !== "pdf" && formatFlag !== "both") {
  process.stderr.write("Формат должен быть html, pdf или both.\n");
  process.exit(1);
}

const widthFlag = flags.get("width");
const width = widthFlag == null || widthFlag === true ? 800 : Number(widthFlag);
if (!Number.isFinite(width) || width < 320) {
  process.stderr.write("Ширина должна быть числом от 320.\n");
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
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
