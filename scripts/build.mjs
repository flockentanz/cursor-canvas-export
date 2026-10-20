import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/cli.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/cli.js",
  packages: "external",
  banner: { js: "#!/usr/bin/env node" },
});
