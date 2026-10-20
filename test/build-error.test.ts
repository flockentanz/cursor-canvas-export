import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { convert } from "../src/convert";

test("a missing component is reported with file and line", async () => {
  await assert.rejects(
    () => convert({ input: path.resolve("fixtures/broken.canvas.tsx"), format: "html" }),
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      assert.match(message, /broken\.canvas\.tsx:\d+:/);
      assert.match(message, /NotAComponent/);
      return true;
    },
  );
});
