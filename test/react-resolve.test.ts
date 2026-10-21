import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { convert } from "../src/convert";

test("canvas compile uses this package's react, not a node_modules next to the file", { timeout: 180_000 }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "canvas-react-"));
  const reactDir = path.join(root, "node_modules", "react");
  const reactDomDir = path.join(root, "node_modules", "react-dom");
  fs.mkdirSync(reactDir, { recursive: true });
  fs.mkdirSync(reactDomDir, { recursive: true });
  fs.writeFileSync(path.join(reactDir, "package.json"), JSON.stringify({ name: "react", version: "0.0.0" }));
  fs.writeFileSync(path.join(reactDomDir, "package.json"), JSON.stringify({ name: "react-dom", version: "0.0.0" }));
  fs.writeFileSync(
    path.join(reactDir, "index.js"),
    "export function useState(){throw new Error('wrong react')}\nexport function useContext(){throw new Error('wrong react')}\nexport function useMemo(fn){return fn()}\nexport function useRef(){return {current:null}}\nexport function useEffect(){}\nexport function createContext(){return {}}\n",
  );
  fs.writeFileSync(
    path.join(reactDir, "jsx-runtime.js"),
    "export function jsx(){throw new Error('wrong react')}\nexport function jsxs(){throw new Error('wrong react')}\nexport const Fragment = Symbol.for('react.fragment')\n",
  );
  fs.writeFileSync(path.join(reactDir, "jsx-dev-runtime.js"), "export * from './jsx-runtime.js'\n");
  fs.writeFileSync(
    path.join(reactDomDir, "client.js"),
    "export function createRoot(){throw new Error('wrong react-dom')}\n",
  );
  const canvas = path.join(root, "canvases", "local.canvas.tsx");
  fs.mkdirSync(path.dirname(canvas), { recursive: true });
  fs.writeFileSync(
    canvas,
    'import { H1 } from "cursor/canvas";\nexport default function Local(){ return <H1>Package react</H1>; }\n',
  );

  const stem = path.join(root, "out", "local");
  const result = await convert({ input: canvas, out: stem, format: "html" });
  assert.ok(result.html);
  assert.match(fs.readFileSync(result.html, "utf8"), /Package react/);
});
