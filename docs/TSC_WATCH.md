# AGENTS.md — TeleMon AI Agent Workflow
...
## tsc watch daemon
Run `npm run tsc:watch` in a separate terminal. It performs incremental type-checking on every save
and reports only NEW errors (not the full pre-existing error list). The first run may take a while;
subsequent runs are sub-second for typical edits.
