---
name: strainease-change
description: Prepare and implement a focused StrainEase change using the generated repository tree, task brief, Firebase boundaries, and verification commands.
---

# StrainEase Change Skill

Use this skill for feature work, bug fixes, refactors, and cross-platform changes in this repository.

## Prepare The Brief

Start from the repository root and run:

```bash
bun run ai:task -- "<one concrete description of the requested change>"
```

This command refreshes `.ai/context.md` and creates a task brief under `.ai/tasks/`. The description is the only task-specific input required; the script supplies the tree, architecture shortcuts, project constraints, and validation expectations.

For context-only refreshes:

```bash
bun run ai:context
```

For workspace validation:

```bash
bun run ai:context:check
```

## Change Workflow

1. Read `.ai/context.md`, `AGENTS.md`, and the generated task brief.
2. Inspect the smallest set of files needed to understand the existing pattern.
3. Preserve unrelated working-tree changes.
4. Keep Firebase as the only backend. Use `useAuth`, `RequireAuth`, `src/lib/firebase.ts`, and `src/lib/strain-api.ts` where applicable.
5. For a cross-platform behavior change, inspect the matching web, iOS, Android, and Functions models before changing a shared contract.
6. Add focused tests when behavior changes or a shared utility is touched.
7. Run the relevant typecheck and tests, then summarize files changed and verification status.

## Validation Commands

- Frontend typecheck: `bun tsc -b --noEmit`
- Frontend tests: use the existing test runner configured by the repository.
- Functions build: `cd functions && npm run build`
- Functions tests: `cd functions && npm test` when available.

Never edit `functions/lib/`, generated Firebase files, environment files, or credentials.
