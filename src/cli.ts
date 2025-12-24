#!/usr/bin/env node
/**
 * CLI entry point for strider-sandbox
 *
 * Starts a default server that echoes prompts back.
 * Override with your own handler by importing createServer.
 */

import { createServer } from "./index.js";

const port = parseInt(process.env.HTTP_PORT ?? "4001", 10);

const server = createServer({
  port,
  debug: true,

  async onPrompt(prompt, emit) {
    emit.textChunk(`Echo: ${prompt}`);
    emit.done();
  },

  async onHealthCheck() {
    return {
      status: "ok",
      sandbox_id: process.env.SANDBOX_ID,
      timestamp: new Date().toISOString(),
    };
  },
});

console.log(`Starting strider-sandbox server on port ${port}...`);
await server.start();
console.log(`Server running at http://localhost:${port}`);
console.log("Endpoints:");
console.log(`  GET  /health - Health check`);
console.log(`  POST /prompt - Send prompt, receive NDJSON stream`);
