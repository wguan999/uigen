# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup       # Install deps, generate Prisma client, run migrations (first time)
npm run dev         # Start dev server with Turbopack at http://localhost:3000
npm run dev:daemon  # Start dev server in background (logs to logs.txt)
npm run build       # Production build
npm run lint        # ESLint
npm run test        # Vitest unit tests
npm run db:reset    # Reset SQLite database (destructive)

# Run a single test file
npx vitest run src/lib/__tests__/auth.test.ts

# Run tests matching a pattern
npx vitest run --reporter=verbose -t "createSession"
```

Path alias `@/*` maps to `./src/*`.

## Code Style

Use comments sparingly. Only comment complex code.

## References

- Database schema: `prisma/schema.prisma` — reference it whenever understanding data stored in the database.

## Architecture

UIGen is an AI-powered React component generator. Users describe components in chat; Claude generates JSX; the app renders a live preview in an iframe using a virtual file system (nothing written to disk).

### Request Flow

1. User sends a message via `ChatInterface` → `useChat()` (Vercel AI SDK) in `chat-context.tsx`
2. POST `/api/chat` — sends messages + serialized virtual FS state
3. Server streams Claude response with tool calls (`str_replace_editor`, `file_manager`)
4. Tool calls land in `FileSystemContext.handleToolCall()` which dispatches to VirtualFileSystem methods
5. `triggerRefresh()` causes `PreviewFrame` to re-render:
   - Babel transpiles all JSX/TSX in-memory
   - `createImportMap()` builds an ES module import map (local files → blob URLs, npm packages → esm.sh CDN)
   - `createPreviewHTML()` injects the import map into an iframe HTML document

### Key Modules

| File | Role |
|------|------|
| `src/app/api/chat/route.ts` | Streaming AI endpoint; applies prompt caching to system message |
| `src/lib/file-system.ts` | `VirtualFileSystem` — in-memory Map of path → content |
| `src/lib/contexts/file-system-context.tsx` | React context; `handleToolCall()` routes AI tool calls to FS |
| `src/lib/contexts/chat-context.tsx` | Wraps Vercel AI SDK `useChat()`; bridges tool results to FS |
| `src/lib/provider.ts` | Selects Anthropic Claude (if `ANTHROPIC_API_KEY` set) or `MockLanguageModel` |
| `src/lib/transform/jsx-transformer.ts` | Babel transpilation + multi-pass import map builder |
| `src/lib/tools/str-replace.ts` | AI tool: view/create/str_replace/insert/undo on virtual files |
| `src/lib/tools/file-manager.ts` | AI tool: rename/delete virtual files |
| `src/lib/prompts/generation.tsx` | System prompt — AI must create `/App.jsx`, use Tailwind, use `@/` alias |
| `src/components/preview/PreviewFrame.tsx` | iframe renderer; prefers `App.jsx` as entry point |
| `src/lib/auth.ts` | JWT sessions via cookie `auth-token` (7-day expiry) |
| `prisma/schema.prisma` | SQLite: `User` + `Project` (messages and file tree stored as JSON strings) |

### Testing

Default Vitest environment is `jsdom`. Tests that use Node-only APIs (e.g. `jose` JWT crypto, `server-only`) must add `// @vitest-environment node` as the first line. Auth tests require mocking `server-only` and `next/headers` before dynamically importing the module under test.

### Non-Obvious Behaviors

- **Mock provider**: Without `ANTHROPIC_API_KEY`, `MockLanguageModel` generates a realistic 4-step workflow so the app works for local dev without credentials.
- **Import resolution**: `createImportMap()` does two passes — first collects all third-party imports across all files, then builds blob URLs for local files and esm.sh URLs for packages. Missing imports auto-generate empty placeholder React components.
- **Anonymous work**: `anon-work-tracker.ts` persists unsynced FS state to localStorage so anonymous users don't lose work on refresh.
- **File serialization**: `VirtualFileSystem.serialize()` / `deserializeFromNodes()` converts the in-memory Map to/from JSON for storage in Prisma and transmission to the API.
- **Prompt caching**: The system message in `route.ts` uses Anthropic ephemeral cache control to reduce token costs on repeated requests.
- **Node 25 compat**: `node-compat.cjs` is loaded via `NODE_OPTIONS` in all scripts. It deletes `globalThis.localStorage/sessionStorage` on the server to prevent Node 25's experimental Web Storage globals from breaking SSR guards in dependencies.
