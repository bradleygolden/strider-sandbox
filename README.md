# strider-sandbox

TypeScript runtime for Strider sandbox containers with NDJSON streaming protocol.

## Installation

```bash
npm install strider-sandbox
```

## Quick Start

```typescript
import { createServer } from "strider-sandbox";

const server = createServer({
  port: 4001,

  async onPrompt(prompt, emit) {
    // Process the prompt and stream events back
    emit.textChunk("Hello ");
    emit.textChunk("World!");
    emit.done();
  }
});

await server.start();
```

## Usage with Claude SDK

```typescript
import { createServer } from "strider-sandbox";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  // Use StriderProxy URL in sandbox environments
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

const server = createServer({
  async onPrompt(prompt, emit) {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        emit.textChunk(event.delta.text);
      }
    }

    emit.done();
  }
});

await server.start();
```

## CLI Usage

Run a basic echo server:

```bash
npx strider-sandbox
```

Or with environment variables:

```bash
HTTP_PORT=4001 SANDBOX_ID=my-sandbox npx strider-sandbox
```

## HTTP Protocol

### GET /health

Returns health status.

**Response:**
```json
{
  "status": "ok",
  "sandbox_id": "my-sandbox"
}
```

### POST /prompt

Accepts a prompt and streams NDJSON events.

**Request:**
```json
{
  "prompt": "Hello, world!",
  "options": {}
}
```

**Response:** NDJSON stream of events:

```ndjson
{"type":"text_chunk","text":"Hello "}
{"type":"text_chunk","text":"World!"}
{"type":"done"}
```

## Event Types

| Type | Description |
|------|-------------|
| `text_chunk` | Text output fragment |
| `tool_start` | Tool execution started |
| `tool_done` | Tool execution completed |
| `error` | Error occurred |
| `done` | Processing complete |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HTTP_PORT` | Server port | `4001` |
| `SANDBOX_ID` | Sandbox identifier | - |
| `ANTHROPIC_BASE_URL` | StriderProxy URL | - |

## Integration with StriderSandbox

Use with the Elixir StriderSandbox library:

```elixir
alias StriderSandbox.Adapters.Docker

{:ok, sandbox} = StriderSandbox.create({Docker, %{
  image: "node:22-slim",
  ports: [{4001, 4001}],
  env: [
    {"ANTHROPIC_BASE_URL", "http://host.docker.internal:4000"},
    {"SANDBOX_ID", sandbox_id}
  ]
}})

# Install and run strider-sandbox
StriderSandbox.exec(sandbox, "npm install strider-sandbox")
StriderSandbox.exec(sandbox, "npx strider-sandbox")

# Send prompts
{:ok, url} = StriderSandbox.get_url(sandbox, 4001)
Req.post!("#{url}/prompt", json: %{prompt: "Hello"})
```

## License

Apache-2.0
