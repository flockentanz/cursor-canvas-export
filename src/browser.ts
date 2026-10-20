import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { chromium, type Browser } from "playwright";

const require = createRequire(import.meta.url);

let browserPromise: Promise<Browser> | undefined;
let users = 0;
let hold = false;

/** Keep the headless browser alive between MCP tool calls. */
export function holdBrowserProcess(): void {
  hold = true;
}

export function acquireBrowser(): Promise<Browser> {
  users += 1;
  if (!browserPromise) {
    browserPromise = launchChromium().catch((error: unknown) => {
      browserPromise = undefined;
      throw error;
    });
  }
  return browserPromise;
}

export async function releaseBrowser(): Promise<void> {
  users = Math.max(0, users - 1);
  if (users === 0 && !hold) await shutdown();
}

export async function closeBrowser(): Promise<void> {
  hold = false;
  if (users === 0) await shutdown();
}

async function shutdown(): Promise<void> {
  if (users > 0 || hold || !browserPromise) return;
  const pending = browserPromise;
  browserPromise = undefined;
  const browser = await pending.catch(() => undefined);
  if (users > 0 && browser) {
    browserPromise = Promise.resolve(browser);
    return;
  }
  await browser?.close().catch(() => {});
}

async function launchChromium(): Promise<Browser> {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    if (!isMissingBrowser(error)) throw error;
    await installChromium();
    return await chromium.launch({ headless: true });
  }
}

function isMissingBrowser(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Executable doesn't exist") || message.includes("Please run");
}

function installChromium(): Promise<void> {
  const cli = path.join(path.dirname(require.resolve("playwright/package.json")), "cli.js");
  process.stderr.write("Downloading headless Chromium. No browser window will open.\n");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, "install", "chromium"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk: Buffer) => process.stderr.write(chunk));
    child.stderr.on("data", (chunk: Buffer) => process.stderr.write(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`playwright install chromium exited with code ${code ?? "unknown"}`));
    });
  });
}
