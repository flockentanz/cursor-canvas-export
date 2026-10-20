#!/usr/bin/env node
process.env.CANVAS_EXPORT_FORMAT ??= "html";
const { main } = await import("../dist/cli.js");
await main();
