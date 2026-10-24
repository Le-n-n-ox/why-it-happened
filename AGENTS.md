# How to work in this repo

The user's standing instruction: **scan the project through graphify, not by grepping or reading source files first.**

Every time you need to understand, find, trace, or change something here:

1. `graphify query "<the question or task>"` — start here, always.
2. `graphify explain "path::Symbol"` for one concept; `graphify path "A" "B"` (add `--undirected` when no directed path is found) for relationships; `graphify god-nodes` for the hubs.
3. Ambiguous names return exit 3 with candidates — retry as `path::Symbol`.
4. Only after the graph points at a file/line do you open the real file, and only those lines.
5. After any code change: `graphify update .` and say whether the graph was refreshed.
6. Any subagent prompt that explores this codebase must carry rule 1 verbatim.
7. If `graphify-out/graph.json` is older than `git rev-parse HEAD`, mention the graph may be stale instead of silently trusting it.

Scope: the graph covers all 205 code files plus the docs (`README.md`, `API_REFERENCE.md`, `REAL_DATA_WORKFLOW.md`, `web/README.md`, `web/index.html`) as `document`/`rationale`/`concept` nodes — so "why was it built this way" questions are graph questions too. Not indexed: the 8 `.svg` icons, `requirements*.txt`, and `graphify-out/` itself. Query with concrete terms from the domain (`FastAPI`, `SQLite`, `narrator`, `momentum`); vague phrasings like "what does this project do" match no seeds — search "Why It Happened" instead.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
