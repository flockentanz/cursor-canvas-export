import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PDF_MAX_PX, convert, pdfTooLarge } from "../src/convert";

test("pdf page limit is 200 inches", () => {
  assert.equal(PDF_MAX_PX, 19200);
  assert.equal(pdfTooLarge(800, 1000), false);
  assert.equal(pdfTooLarge(800, PDF_MAX_PX - 1), false);
  assert.equal(pdfTooLarge(800, PDF_MAX_PX), true);
  assert.equal(pdfTooLarge(PDF_MAX_PX + 1, 100), true);
});

test("a page past the Chromium limit keeps HTML and warns", { timeout: 180_000 }, async () => {
  const stem = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "canvas-tall-")), "tall");
  const result = await convert({
    input: path.resolve("fixtures/tall.canvas.tsx"),
    out: stem,
    format: "both",
  });

  assert.ok(result.html);
  assert.equal(result.pdf, undefined);
  assert.equal(fs.existsSync(`${stem}.pdf`), false);
  assert.match(fs.readFileSync(result.html, "utf8"), /Tall canvas/);
  assert.ok(result.height > PDF_MAX_PX, `height ${result.height}`);
  assert.match(result.warnings.join("\n"), /PDF skipped: page \d+x\d+px exceeds Chromium's 200 inch limit/);
});
