import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { chromium, type Browser } from "playwright";

const require = createRequire(import.meta.url);

export type BrowserGate =
  | { state: "ready" }
  | { state: "downloading" }
  | { state: "failed"; message: string };

export class BrowserNotReady extends Error {
  readonly gate: Exclude<BrowserGate, { state: "ready" }>;

  constructor(gate: BrowserNotReady["gate"]) {
    super(gate.state === "failed" ? gate.message : "Chromium is still downloading");
    this.name = "BrowserNotReady";
    this.gate = gate;
  }
}

let browserPromise: Promise<Browser> | undefined;
let users = 0;
let hold = false;
let phase: "idle" | "launching" | "downloading" | "ready" | "failed" = "idle";
let failureMessage = "";
let downloadListeners: Array<() => void> = [];
let forcedGate: BrowserGate | undefined;
let launchGeneration = 0;
let installChild: ChildProcess | undefined;

/** Keep the headless browser alive between MCP tool calls. */
export function holdBrowserProcess(): void {
  hold = true;
}

/** Start launch or install without waiting. MCP calls this before the client handshake returns. */
export function warmBrowser(): void {
  if (forcedGate) return;
  if (phase === "failed" || browserPromise) return;
  startLaunch();
}

/**
 * Ready when Chromium is open. Downloading as soon as an install starts, without waiting for it.
 * A failed install is reported once and started again in the background.
 */
export function browserGate(): Promise<BrowserGate> {
  if (forcedGate) return Promise.resolve(forcedGate);
  if (phase === "failed") {
    const message = failureMessage;
    startLaunch();
    return Promise.resolve({ state: "failed", message });
  }
  if (phase === "downloading") return Promise.resolve({ state: "downloading" });
  if (!browserPromise) startLaunch();
  if (phase === "ready") return Promise.resolve({ state: "ready" });
  return waitForLaunch(browserPromise!);
}

/** Blocks through a first-time Chromium download. Used by the CLI and after the gate is ready. */
export function acquireBrowser(): Promise<Browser> {
  users += 1;
  if (!browserPromise) startLaunch();
  return browserPromise!;
}

export async function releaseBrowser(): Promise<void> {
  users = Math.max(0, users - 1);
  if (users === 0 && !hold) await shutdown();
}

export async function closeBrowser(): Promise<void> {
  hold = false;
  if (users === 0) await shutdown();
}

/** Pin the MCP gate so tests can read the wait reply without downloading Chromium. */
export function forceBrowserGateForTests(gate: BrowserGate): () => void {
  const previous = forcedGate;
  forcedGate = gate;
  return () => {
    forcedGate = previous;
  };
}

/** Awaits the browser warm-up, including a first-time download. Render tests use this. */
export function whenBrowserReadyForTests(): Promise<void> {
  if (!browserPromise) startLaunch();
  return browserPromise!.then(() => {});
}

/**
 * Covers the moment a download is announced. The returned gate resolves without waiting
 * for the download itself.
 */
export function browserGateDuringDownloadForTests(): Promise<BrowserGate> {
  const previousPromise = browserPromise;
  const previousPhase = phase;
  const previousFailure = failureMessage;
  const previousForce = forcedGate;
  forcedGate = undefined;
  phase = "launching";
  let rejectHang: (error: Error) => void = () => {};
  const hung = new Promise<Browser>((_resolve, reject) => {
    rejectHang = reject;
  });
  void hung.catch(() => {});
  browserPromise = hung;
  const gate = waitForLaunch(hung);
  notifyDownloading();
  return gate.finally(() => {
    rejectHang(new Error("download gate test finished"));
    browserPromise = previousPromise;
    phase = previousPhase;
    failureMessage = previousFailure;
    forcedGate = previousForce;
  });
}

function startLaunch(): Promise<Browser> {
  if (browserPromise) return browserPromise;
  const generation = launchGeneration;
  phase = "launching";
  failureMessage = "";
  const pending = launchChromium(generation).then(
    (browser) => {
      if (browserPromise === pending) phase = "ready";
      return browser;
    },
    (error: unknown) => {
      if (browserPromise !== pending) throw error;
      browserPromise = undefined;
      phase = "failed";
      failureMessage = error instanceof Error ? error.message : String(error);
      throw error;
    },
  );
  void pending.catch(() => {});
  browserPromise = pending;
  return pending;
}

function waitForLaunch(pending: Promise<Browser>): Promise<BrowserGate> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (gate: BrowserGate) => {
      if (settled) return;
      settled = true;
      downloadListeners = downloadListeners.filter((listener) => listener !== onDownload);
      resolve(gate);
    };
    const onDownload = () => finish({ state: "downloading" });
    downloadListeners.push(onDownload);
    if (phase === "downloading") {
      finish({ state: "downloading" });
      return;
    }
    pending.then(
      () => finish({ state: "ready" }),
      (error: unknown) => {
        const message = failureMessage || (error instanceof Error ? error.message : String(error));
        const alreadySettled = settled;
        finish({ state: "failed", message });
        if (!alreadySettled && phase === "failed" && !browserPromise) startLaunch();
      },
    );
  });
}

function notifyDownloading(): void {
  phase = "downloading";
  const listeners = downloadListeners;
  downloadListeners = [];
  for (const listener of listeners) listener();
}

async function shutdown(): Promise<void> {
  if (users > 0 || hold || !browserPromise) return;
  launchGeneration += 1;
  stopInstallChild();
  const pending = browserPromise;
  const wasReady = phase === "ready";
  browserPromise = undefined;
  downloadListeners = [];
  if (!wasReady) {
    phase = "idle";
    failureMessage = "";
    return;
  }
  const browser = await pending.catch(() => undefined);
  if (users > 0 && browser) {
    browserPromise = Promise.resolve(browser);
    phase = "ready";
    return;
  }
  await browser?.close().catch(() => {});
  if (!browserPromise && phase !== "failed") phase = "idle";
}

async function launchChromium(generation: number): Promise<Browser> {
  try {
    const browser = await chromium.launch({ headless: true });
    if (generation !== launchGeneration) {
      await browser.close().catch(() => {});
      throw new Error("browser launch cancelled");
    }
    return browser;
  } catch (error) {
    if (generation !== launchGeneration) throw error;
    if (!isMissingBrowser(error)) throw error;
    notifyDownloading();
    if (generation !== launchGeneration) throw new Error("browser launch cancelled");
    await installChromium();
    if (generation !== launchGeneration) throw new Error("browser launch cancelled");
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
    installChild = child;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (installChild === child) installChild = undefined;
      if (error) reject(error);
      else resolve();
    };
    child.stdout.on("data", (chunk: Buffer) => process.stderr.write(chunk));
    child.stderr.on("data", (chunk: Buffer) => process.stderr.write(chunk));
    child.on("error", (error) => finish(error));
    child.on("close", (code) => {
      if (code === 0) finish();
      else finish(new Error(`playwright install chromium exited with code ${code ?? "unknown"}`));
    });
  });
}

function stopInstallChild(): void {
  const child = installChild;
  installChild = undefined;
  if (!child?.pid || child.killed) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  child.kill("SIGKILL");
}
