# MCP Guide for TeleMon

## Overview

All MCP servers below are globally installed and configured across **Claude Code CLI**
(`~/.claude/.mcp.json`), **Cursor** (`~/.cursor/mcp.json`), **Cline / VS Code**
(`%APPDATA%\Code\User\mcp.json`), and **Kilo** (`~/.config/kilo/kilo.jsonc`).

Ask the AI agent to "use X MCP" or simply include the tool name in your prompt.

---

## Development

### `filesystem` — File read/write/search
**Package**: `@modelcontextprotocol/server-filesystem`  
**Scope**: `C:\Dev`, `C:\Users\jaeli\OneDrive\Desktop`, `C:\Users\jaeli\Projects`  
**When to use**:
- Read/write files outside the project (config files, scripts, assets)
- Search for files by pattern across multiple directories
- Get file metadata (size, timestamps)
- **Note**: Replaces standalone `codebase-memory-mcp` for general file ops

### `git` — Git repository operations
**Package**: `mcp-server-git` (pip, via `uvx`)  
**When to use**:
- Show working tree status (`git_status`)
- View staged/unstaged diffs (`git_diff_staged` / `git_diff_unstaged`)
- Commit changes (`git_commit`)
- View commit log (`git_log`)
- Create/switch branches (`git_create_branch`, `git_checkout`)
- **Do NOT use** for GitHub API operations (PRs, issues) — use `github` MCP

### `sequential-thinking` — Structured problem solving
**Package**: `@modelcontextprotocol/server-sequential-thinking`  
**When to use**:
- Complex debugging scenarios
- Architecture design decisions
- Multi-step problem decomposition
- Trade-off analysis between approaches

### `memory` — Persistent knowledge graph
**Package**: `@modelcontextprotocol/server-memory`  
**When to use**:
- Store project conventions and patterns for future sessions
- Remember cross-session context about build issues
- Cache architectural decisions
- **Note**: Local-first knowledge graph, not shared across machines

### `openapi` — OpenAPI spec proxy
**Package**: `openapi-mcp-proxy`  
**When to use**:
- Convert any REST API with an OpenAPI spec into MCP tools
- Interact with FastAPI's auto-generated OpenAPI docs
- **Requires**: `--spec ./openapi.json` argument (adjust path per project)
- Currently configured for TeleMon's API

---

## UI / Design

### `playwright` — Browser automation (Microsoft official)
**Package**: `@playwright/mcp` (npm)  
**When to use**:
- Navigate web pages for debugging/testing
- Take screenshots of specific pages
- Extract structured data from web pages (accessibility tree)
- Test UI component behavior
- **Note**: Uses accessibility snapshots, not pixel-based vision

### `context7` — Up-to-date documentation lookup
**Package**: `@upstash/context7-mcp`  
**When to use**:
- When you need current, version-specific docs for a library
- Before writing code using a recently-updated framework/API
- Prompt: "use context7" in your instruction
- **Covers**: Major libraries (Next.js, React, FastAPI, TailwindCSS, etc.)
- **Why**: Eliminates stale-training-data hallucinations

---

## Database

### `postgres` — PostgreSQL read-only queries
**Package**: `@yawlabs/postgres-mcp` (Yaw Labs, maintained fork)  
**When to use**:
- Inspect database schemas and tables
- Run SELECT queries against PostgreSQL
- Analyze query patterns and relationships
- **Note**: Read-only by default (writes require explicit opt-in)
- **Security**: Patched against the SQL injection CVE in the deprecated
  `@modelcontextprotocol/server-postgres`

### `redis` — Redis key-value store
**Package**: `@gongrzhe/server-redis-mcp`  
**Connection**: `redis://localhost:6379`  
**When to use**:
- Inspect cached data or session state
- Set/get keys for testing
- Manage rate limiter counters
- **Note**: Only works if a Redis server is running locally

---

## Infrastructure

### `github` — GitHub API (official by GitHub)
**Binary**: `github-mcp-server.exe` v1.6.0 (Go, prebuilt)  
**Requires**: `GITHUB_PERSONAL_ACCESS_TOKEN` env var  
**When to use**:
- List/search repositories
- Create/manage issues and pull requests
- Search code across repositories
- Browse GitHub Actions workflows
- **Note**: Covers GitHub API operations that `git` MCP cannot

### `codebase-memory-mcp` — Codebase graph & trace
**Package**: `codebase-memory-mcp` (npm global)  
**When to use**:
- Search the codebase with graph-based queries
- Trace data flow across files
- Detect recent changes
- Get architecture summaries
- **Note**: Best paired with `filesystem` for deeper file exploration

### `ai-knowledge-mcp` — Custom AI knowledge store (Kilo only)
**Server**: `C:\Dev\ai-knowledge-mcp\dist\server.js`  
**Scope**: Kilo platform only  
**When to use**: Internal AI knowledge retrieval specific to Kilo workflows

---

## Recommended MCP Workflows

### Debug a failing test
```
1. context7 → check latest FastAPI/pytest docs
2. sequential-thinking → analyze failure pattern
3. git → check recent changes and diffs
4. codebase-memory-mcp → trace the code path
5. openapi → verify API endpoint behavior
```

### New feature implementation
```
1. context7 → check latest API docs for dependencies
2. memory → retrieve project conventions
3. filesystem → read existing similar implementations
4. openapi → understand API contract
5. postgres → verify schema compatibility
```

### Deploy and verify
```
1. git → commit and review changes
2. github → create PR
3. playwright → run E2E tests against the build
4. memory → store deployment hash and notes
```

### Database debugging
```
1. postgres → inspect schema and run diagnostic queries
2. redis → check cached values
3. sequential-thinking → analyze data flow
4. context7 → check ORM documentation
```

### Code review
```
1. git → get staged diff
2. codebase-memory-mcp → trace affected code paths
3. sequential-thinking → evaluate correctness
4. github → post review comments
```
