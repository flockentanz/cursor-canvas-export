import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { convert } from "../src/convert";

const input =
  "C:/Users/Misha/.cursor/projects/c-Users-Misha-PhpstormProjects-gpt-gateway/canvases/mysql-load-report.canvas.tsx";

test("mysql-load-report canvas becomes one HTML page and one PDF page", { timeout: 180_000 }, async () => {
  const stem = path.resolve("out/mysql-load-report");
  const screenshot = path.resolve("out/mysql-load-report.png");
  const result = await convert({
    input,
    out: stem,
    screenshot,
    theme: "dark",
    width: 800,
    format: "both",
  });

  assert.ok(result.html);
  const html = fs.readFileSync(result.html, "utf8");
  for (const needle of [
    "Снижение нагрузки MySQL",
    "986 ч",
    "401 ч",
    "CREATE INDEX idx_messages_filial_calldate_to",
    "idx_messages_actual_calldate_from",
    "37%",
    "innodb_buffer_pool_size",
    "STRAIGHT_JOIN messages m",
  ]) {
    assert.ok(html.includes(needle), `в HTML нет фрагмента: ${needle}`);
  }

  assert.ok(result.pdf);
  const pdf = fs.readFileSync(result.pdf);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  const latin = pdf.toString("latin1");
  const pageCount = maxPages(latin);
  assert.equal(pageCount, 1, `ожидалась одна страница PDF, получено ${pageCount}`);
  const box = mediaBox(latin);
  assert.ok(box, "в PDF нет MediaBox");
  const widthPt = box[2] - box[0];
  assert.ok(widthPt > 560 && widthPt < 640, `ширина PDF ${widthPt}pt`);
  assert.ok(box[3] - box[1] > 1000, "PDF слишком короткий для этого отчёта");

  assert.ok(fs.existsSync(screenshot));
  assert.equal(fs.readFileSync(screenshot).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
    await page.goto(pathToFileURL(result.html).href);
    assert.equal(await page.locator("h1").evaluate((node) => getComputedStyle(node).fontSize), "24px");
    assert.equal(await page.locator("[data-chart='bar'] [data-bar]").count(), 7);
    assert.deepEqual(
      await page.locator("[data-bar-value]").allTextContents(),
      ["986 ч", "401 ч", "125 ч", "92 ч", "57 ч", "47 ч", "16 ч"],
    );
    assert.equal(await page.locator("[data-card]").count(), 3);
    assert.deepEqual(
      await page.locator("[data-table]").evaluateAll((tables) =>
        tables.map((table) => table.querySelectorAll("tbody tr").length),
      ),
      [14, 6],
    );
    assert.equal(await page.locator("[data-row-tone]").count(), 6);
    const statColors = await page.locator("[data-stat-value]").evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).color),
    );
    assert.equal(statColors[0], "rgb(31, 138, 101)");
    assert.equal(statColors[3], "rgb(192, 96, 40)");
    const barColor = await page.locator("[data-bar]").first().evaluate((node) => getComputedStyle(node).backgroundColor);
    assert.equal(barColor, "rgb(46, 121, 181)");
  } finally {
    await browser.close();
  }
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
