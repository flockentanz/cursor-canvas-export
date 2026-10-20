import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type CanvasHit = {
  name: string;
  path: string;
  project: string;
  mtimeMs: number;
};

export function projectsRoot(): string {
  return process.env.CANVAS_PROJECTS_DIR ?? path.join(os.homedir(), ".cursor", "projects");
}

export function listCanvases(workspace?: string, root = projectsRoot()): CanvasHit[] {
  if (!fs.existsSync(root)) return [];
  const needle = workspace ? slug(workspace) : "";
  const hits: CanvasHit[] = [];
  for (const project of fs.readdirSync(root)) {
    if (needle && !slug(project).includes(needle) && !needle.includes(slug(project))) continue;
    const dir = path.join(root, project, "canvases");
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".canvas.tsx")) continue;
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (!stat.isFile()) continue;
      hits.push({
        name: file.slice(0, -".canvas.tsx".length),
        path: full,
        project,
        mtimeMs: stat.mtimeMs,
      });
    }
  }
  hits.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return hits;
}

export function resolveCanvas(query: string, root?: string): { match?: CanvasHit; matches: CanvasHit[] } {
  const direct = path.resolve(query);
  if (fs.existsSync(direct) && direct.endsWith(".canvas.tsx")) {
    return { match: hitFromFile(direct), matches: [] };
  }
  if (query.includes("/") || query.includes("\\") || query.endsWith(".canvas.tsx")) {
    return { matches: [] };
  }
  const all = listCanvases(undefined, root);
  const exact = all.filter((hit) => hit.name === query);
  if (exact.length === 1) return { match: exact[0], matches: [] };
  if (exact.length > 1) return { matches: exact };
  const partial = all.filter((hit) => hit.name.includes(query));
  if (partial.length === 1) return { match: partial[0], matches: [] };
  return { matches: partial };
}

function hitFromFile(file: string): CanvasHit {
  const stat = fs.statSync(file);
  return {
    name: path.basename(file).slice(0, -".canvas.tsx".length),
    path: file,
    project: path.basename(path.dirname(path.dirname(file))),
    mtimeMs: stat.mtimeMs,
  };
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
