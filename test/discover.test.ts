import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { listCanvases, resolveCanvas } from "../src/discover";

test("lists canvases newest first and resolves a unique name", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "canvas-export-"));
  const older = path.join(root, "alpha-workspace", "canvases");
  const newer = path.join(root, "beta-workspace", "canvases");
  fs.mkdirSync(older, { recursive: true });
  fs.mkdirSync(newer, { recursive: true });
  const oldFile = path.join(older, "notes.canvas.tsx");
  const newFile = path.join(newer, "notes.canvas.tsx");
  const only = path.join(newer, "gallery.canvas.tsx");
  fs.writeFileSync(oldFile, "export default function A(){return null}");
  fs.writeFileSync(newFile, "export default function B(){return null}");
  fs.writeFileSync(only, "export default function C(){return null}");
  const past = new Date("2020-01-01");
  const recent = new Date("2024-01-01");
  fs.utimesSync(oldFile, past, past);
  fs.utimesSync(newFile, recent, recent);

  const listed = listCanvases(undefined, root);
  assert.deepEqual(
    listed.map((hit) => `${hit.project}:${hit.name}`),
    ["beta-workspace:gallery", "beta-workspace:notes", "alpha-workspace:notes"],
  );

  const filtered = listCanvases("alpha-workspace", root);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.project, "alpha-workspace");

  const unique = resolveCanvas("gallery", root);
  assert.equal(unique.match?.path, only);

  const ambiguous = resolveCanvas("notes", root);
  assert.equal(ambiguous.match, undefined);
  assert.equal(ambiguous.matches.length, 2);
});
