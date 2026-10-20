import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { convert } from "../src/convert";

const gallery = path.resolve("fixtures/gallery.canvas.tsx");

test("gallery canvas becomes one HTML page and one PDF page", { timeout: 180_000 }, async () => {
  const stem = path.resolve("out/gallery");
  const screenshot = path.resolve("out/gallery.png");
  const result = await convert({
    input: gallery,
    out: stem,
    screenshot,
    theme: "dark",
    width: 800,
    format: "both",
  });

  assert.ok(result.html);
  const html = fs.readFileSync(result.html, "utf8");
  for (const needle of ["Export gallery", "Synthetic canvas", "No production data", "18 ms"]) {
    assert.ok(html.includes(needle), `missing ${needle}`);
  }

  assert.ok(result.pdf);
  const pdf = fs.readFileSync(result.pdf);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  const latin = pdf.toString("latin1");
  assert.equal(maxPages(latin), 1);
  const box = mediaBox(latin);
  assert.ok(box);
  const widthPt = box[2] - box[0];
  assert.ok(widthPt > 560 && widthPt < 640, `width ${widthPt}pt`);

  assert.equal(fs.readFileSync(screenshot).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
    await page.goto(pathToFileURL(result.html).href);
    assert.equal(await page.locator("h1").evaluate((node) => getComputedStyle(node).fontSize), "24px");
    assert.equal(await page.locator("[data-chart='bar'] [data-bar]").count(), 3);
    assert.deepEqual(await page.locator("[data-bar-value]").allTextContents(), ["18 ms", "12 ms", "9 ms"]);
    assert.equal(await page.locator("[data-card]").count(), 1);
    assert.deepEqual(
      await page.locator("[data-table]").evaluateAll((tables) =>
        tables.map((table) => table.querySelectorAll("tbody tr").length),
      ),
      [2],
    );
    assert.equal(await page.locator("[data-row-tone]").count(), 2);
    const statColors = await page.locator("[data-stat-value]").evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).color),
    );
    assert.equal(statColors[0], "rgb(31, 138, 101)");
    assert.equal(statColors[3], "rgb(192, 96, 40)");
    const barColor = await page
      .locator("[data-bar]")
      .first()
      .evaluate((node) => getComputedStyle(node).backgroundColor);
    assert.equal(barColor, "rgb(46, 121, 181)");
  } finally {
    await browser.close();
  }
});

test("sidecar state replaces the canvas default", { timeout: 180_000 }, async () => {
  const result = await convert({
    input: path.resolve("fixtures/state.canvas.tsx"),
    out: path.resolve("out/state"),
    format: "html",
  });
  assert.ok(result.html);
  assert.match(fs.readFileSync(result.html, "utf8"), /from-sidecar/);
});

function maxPages(pdf: string): number {
  const counts = [...pdf.matchAll(/\/Type\s*\/Pages\b[\s\S]{0,120}?\/Count\s+(\d+)/g)].map((match) =>
    Number(match[1]),
  );
  if (counts.length > 0) return Math.max(...counts);
  return pdf.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}

function mediaBox(pdf: string): [number, number, number, number] | undefined {
  const match = /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(pdf);
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
}
