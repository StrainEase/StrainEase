# AI Workspace

This directory contains the repository-local AI workflow for StrainEase.

## Task briefs

Give the generator one concrete description:

```bash
bun run ai:task -- "Add a loading state to the strain directory when its data request is pending"
```

The command creates `.ai/tasks/<slug>.md` with the description plus a current repository tree and the project rules needed to implement it. Refresh the standalone context with `bun run ai:context`.

Generated `.ai/context.md` is local workspace context and is ignored by Git. Task briefs are kept as normal Markdown so they can be reviewed or shared.

## Hooks

Hooks are versioned in `.githooks/` but are opt-in. Install them for the current clone with:

```bash
bun run ai:setup
```

The hooks refresh local context after checkout/merge, run the existing lint command before commits, and run the frontend typecheck before pushes. Set `AI_SKIP_HOOKS=1` for a deliberate local bypass.

## MCP

`.mcp.json` exposes the repository root to the standard MCP filesystem server. It contains no credentials. Use an MCP client that supports project-local `.mcp.json` files, and review the client’s permission prompt before allowing write access.
