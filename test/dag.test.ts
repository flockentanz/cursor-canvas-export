import assert from "node:assert/strict";
import test from "node:test";
import { computeDAGLayout } from "../src/sdk/extras";

test("ranks a straight chain top to bottom", () => {
  const layout = computeDAGLayout({
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ],
  });
  const rank = Object.fromEntries(layout.nodes.map((node) => [node.id, node.rank]));
  assert.deepEqual(rank, { a: 0, b: 1, c: 2 });
  assert.equal(layout.edges.every((edge) => edge.isBackEdge), false);
  assert.ok(layout.nodes[1].y > layout.nodes[0].y);
});

test("flags a cycle edge and still assigns ranks", () => {
  const layout = computeDAGLayout({
    nodes: [{ id: "a" }, { id: "b" }],
    edges: [
      { from: "a", to: "b" },
      { from: "b", to: "a" },
    ],
  });
  const back = layout.edges.filter((edge) => edge.isBackEdge);
  assert.equal(back.length, 1);
  assert.equal(back[0]?.from, "b");
  assert.equal(back[0]?.to, "a");
  assert.deepEqual(
    layout.nodes.map((node) => node.rank).sort(),
    [0, 1],
  );
});
