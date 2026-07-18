# Memory

Two memory-related MCP servers are available (see `.mcp.json` / global MCP settings):

- **`graphiti`** — long-term, cross-session knowledge graph (backed by Neo4j at
  `127.0.0.1:8001`). Use this for anything that should be recalled in a *future* session:
  durable facts about this project (deploy targets, recurring bugs and their root causes,
  architectural decisions), not ephemeral task state. Search it at the start of
  investigation-heavy tasks before re-deriving facts from scratch.
- **`memory`** — simple in-session entity/relation store. Use for working notes within the
  current task when a lightweight scratch structure is more useful than prose.

## Conventions for this repo

- Before starting VPS/deployment work, check `graphiti` for prior notes on deploy targets and
  known migration/build issues (e.g. the Docker-build-context issue documented in
  `docs/deployment/known-issues.md` — that fact belongs in graphiti too, not just the file).
- Save durable findings to `graphiti` with enough context that a future session doesn't need
  to re-investigate: what was true, why, and how to verify it's still true.
- Don't save ephemeral/one-off task details (a specific PR under review, today's error
  message) — that belongs in the conversation, not long-term memory.
