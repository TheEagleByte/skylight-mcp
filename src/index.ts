#!/usr/bin/env node

import { createServer } from "./server.js";

async function main() {
  const server = await createServer();
  await server.start();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
