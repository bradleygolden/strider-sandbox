/**
 * Strider Sandbox HTTP Server
 *
 * Creates an HTTP server that implements an NDJSON streaming protocol
 * for agent communication inside sandbox containers.
 *
 * Protocol endpoints:
 * - GET /health - Returns 200 when ready
 * - POST /prompt - Accepts prompt, streams NDJSON events
 */

import * as http from "node:http";
import type {
  EventEmitter,
  PromptHandler,
  HealthCheckHandler,
  ServerOptions,
  Server,
  AgentEvent,
} from "./types.js";

interface PromptRequest {
  prompt: string;
  options?: Record<string, unknown>;
}

function log(message: string, debug: boolean): void {
  if (debug) {
    console.error(`[strider-sandbox] ${message}`);
  }
}

/**
 * Creates an NDJSON event emitter that writes to an HTTP response.
 */
function createEmitter(res: http.ServerResponse): EventEmitter {
  const write = (event: AgentEvent): void => {
    const line = JSON.stringify(event) + "\n";
    res.write(line);
  };

  return {
    textChunk(text: string): void {
      write({ type: "text_chunk", text });
    },

    toolStart(id: string, name: string, args?: Record<string, unknown>): void {
      write({ type: "tool_start", id, name, arguments: args });
    },

    toolDone(id: string, result: string): void {
      write({ type: "tool_done", id, result });
    },

    error(message: string): void {
      write({ type: "error", message });
    },

    done(result?: string): void {
      write({ type: "done", result });
    },
  };
}

/**
 * Parses JSON request body.
 */
async function parseBody(req: http.IncomingMessage): Promise<PromptRequest> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf-8");
        const parsed = JSON.parse(body) as PromptRequest;
        resolve(parsed);
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

export interface CreateServerOptions extends ServerOptions {
  /**
   * Called when the server starts listening.
   */
  onReady?: () => void;

  /**
   * Enable debug logging.
   */
  debug?: boolean;
}

/**
 * Creates a strider-sandbox HTTP server.
 *
 * @example
 * ```typescript
 * import { createServer } from "strider-sandbox";
 * import Anthropic from "@anthropic-ai/sdk";
 *
 * const server = createServer({
 *   port: 4001,
 *   async onPrompt(prompt, emit) {
 *     const client = new Anthropic();
 *     const stream = client.messages.stream({
 *       model: "claude-sonnet-4-20250514",
 *       messages: [{ role: "user", content: prompt }],
 *     });
 *
 *     for await (const event of stream) {
 *       if (event.type === "content_block_delta") {
 *         emit.textChunk(event.delta.text);
 *       }
 *     }
 *
 *     emit.done("Complete");
 *   }
 * });
 *
 * await server.start();
 * ```
 */
export function createServer(options: CreateServerOptions): Server {
  const port = options.port ?? parseInt(process.env.HTTP_PORT ?? "4001", 10);
  const debug = options.debug ?? false;

  let httpServer: http.Server | null = null;

  const server: Server = {
    get port() {
      return port;
    },

    start(): Promise<void> {
      return new Promise((resolve) => {
        httpServer = http.createServer(async (req, res) => {
          const url = req.url || "/";
          const method = req.method || "GET";

          log(`${method} ${url}`, debug);

          try {
            if (url === "/health" && method === "GET") {
              const healthData = options.onHealthCheck
                ? await options.onHealthCheck()
                : { status: "ok" };

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(healthData));
              return;
            }

            if (url === "/prompt" && method === "POST") {
              const body = await parseBody(req);
              const { prompt, options: promptOptions = {} } = body;

              if (!prompt || typeof prompt !== "string") {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Missing or invalid 'prompt' field" }));
                return;
              }

              res.writeHead(200, {
                "Content-Type": "application/x-ndjson",
                "Transfer-Encoding": "chunked",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              });

              const emit = createEmitter(res);

              try {
                await options.onPrompt(prompt, emit, promptOptions);
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                log(`Prompt handler error: ${message}`, true);
                emit.error(message);
              }

              res.end();
              return;
            }

            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Not found" }));
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            log(`Request error: ${message}`, true);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: message }));
          }
        });

        httpServer.listen(port, () => {
          log(`Server listening on port ${port}`, true);
          options.onReady?.();
          resolve();
        });
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!httpServer) {
          resolve();
          return;
        }

        httpServer.close((err) => {
          if (err) {
            reject(err);
          } else {
            log("Server stopped", debug);
            httpServer = null;
            resolve();
          }
        });
      });
    },
  };

  return server;
}
