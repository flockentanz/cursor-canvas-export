#!/usr/bin/env node
process.env.CANVAS_EXPORT_FORMAT ??= "pdf";
const { main } = await import("../dist/cli.js");
await main();
