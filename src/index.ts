/**
 * Strider Sandbox - TypeScript runtime for agent sandboxes
 *
 * A minimal HTTP server that implements NDJSON streaming protocol
 * for agent communication inside sandbox containers.
 *
 * @example
 * ```typescript
 * import { createServer } from "strider-sandbox";
 *
 * const server = createServer({
 *   onPrompt: async (prompt, emit) => {
 *     emit.textChunk("Hello ");
 *     emit.textChunk("World!");
 *     emit.done();
 *   }
 * });
 *
 * await server.start();
 * ```
 */

// Re-export types
export type {
  EventType,
  TextChunkEvent,
  ToolStartEvent,
  ToolDoneEvent,
  ErrorEvent,
  DoneEvent,
  AgentEvent,
  EventEmitter,
  PromptHandler,
  HealthCheckHandler,
  ServerOptions,
  Server,
} from "./types.js";

// Re-export server
export { createServer, type CreateServerOptions } from "./server.js";
