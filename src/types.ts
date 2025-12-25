/**
 * Content block types for multi-modal prompts.
 */

/**
 * Text content block.
 */
export interface TextBlock {
  type: "text";
  text: string;
}

/**
 * File content block for images, PDFs, and other files.
 * Use `data` for binary content (base64) or `text` for text-based formats.
 */
export interface FileBlock {
  type: "file";
  media_type: string;
  data?: string;
  text?: string;
}

/**
 * Union type of all content blocks.
 */
export type ContentBlock = TextBlock | FileBlock;

/**
 * Prompt content - either a string or array of content blocks.
 */
export type PromptContent = string | ContentBlock[];

/**
 * Event types for NDJSON streaming protocol.
 */
export type EventType = "text_chunk" | "tool_start" | "tool_done" | "error" | "done";

/**
 * Event emitted when text is generated.
 */
export interface TextChunkEvent {
  type: "text_chunk";
  text: string;
}

/**
 * Event emitted when a tool execution starts.
 */
export interface ToolStartEvent {
  type: "tool_start";
  id: string;
  name: string;
  arguments?: Record<string, unknown>;
}

/**
 * Event emitted when a tool execution completes.
 */
export interface ToolDoneEvent {
  type: "tool_done";
  id: string;
  result: string;
}

/**
 * Event emitted when an error occurs.
 */
export interface ErrorEvent {
  type: "error";
  message: string;
}

/**
 * Event emitted when processing is complete.
 */
export interface DoneEvent {
  type: "done";
  result?: string;
}

/**
 * Union type of all agent events.
 */
export type AgentEvent =
  | TextChunkEvent
  | ToolStartEvent
  | ToolDoneEvent
  | ErrorEvent
  | DoneEvent;

/**
 * Event emitter interface for streaming responses.
 */
export interface EventEmitter {
  /**
   * Emit a text chunk event.
   */
  textChunk(text: string): void;

  /**
   * Emit a tool start event.
   */
  toolStart(id: string, name: string, args?: Record<string, unknown>): void;

  /**
   * Emit a tool done event.
   */
  toolDone(id: string, result: string): void;

  /**
   * Emit an error event.
   */
  error(message: string): void;

  /**
   * Emit a done event.
   */
  done(result?: string): void;

  /**
   * Emit a custom event (any JSON-serializable object with a type field).
   */
  custom(event: Record<string, unknown>): void;
}

/**
 * Prompt handler function signature.
 */
export type PromptHandler = (
  prompt: PromptContent,
  emit: EventEmitter,
  options: Record<string, unknown>
) => Promise<void>;

/**
 * Health check handler function signature.
 */
export type HealthCheckHandler = () => Promise<Record<string, unknown>>;

/**
 * Server configuration options.
 */
export interface ServerOptions {
  /**
   * Port to listen on. Defaults to HTTP_PORT env var or 4001.
   */
  port?: number;

  /**
   * Handler for incoming prompts.
   */
  onPrompt: PromptHandler;

  /**
   * Handler for health check requests.
   */
  onHealthCheck?: HealthCheckHandler;
}

/**
 * Server instance returned by createServer.
 */
export interface Server {
  /**
   * Start the server.
   */
  start(): Promise<void>;

  /**
   * Stop the server.
   */
  stop(): Promise<void>;

  /**
   * The port the server is listening on.
   */
  readonly port: number;
}
