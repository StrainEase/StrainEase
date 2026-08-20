# Naming conventions for branches, PRs, commits, files, and identifiers

**Date:** 2026-08-19
**Scope:** `strain-finder` repo (web + `functions/` + `ios/`) — i.e. every place an AI agent
or a human needs to pick a name for a new thing.
**Status:** Draft. Mirrors the conventions already in use across the repo's git history; codifies
the bits that were implicit, and adds a few small rules to keep AI agents from drifting.

This is a **spec, not a config file**. Nothing here is enforced by `eslint`, `prettier`, or
`commitlint` today (the repo doesn't ship `commitlint`); it's a contract AI agents should follow
when naming things, and a reference for humans during code review.

---

## TL;DR

| Thing | Format | Example |
| --- | --- | --- |
| Branch | `<type>/<kebab-slug>` | `fix/ios-tailored-description-pr2` |
| Auto branch (agent-generated, **placeholder only**) | `<type>/auto-YYYYMMDD-<id>` | `feat/auto-20260819-15661046` — rename before any work, see § 1 |
| Worktree dir | `<type>-auto-YYYYMMDD-<id>` (slash → dash) | `feat-auto-20260819-15661046` |
| Commit subject | `<type>(<scope>): <summary>` | `feat(auth): refresh firebase token after age verification` |
| PR title | Same as commit subject (one PR = one logical change) | `fix(web): tighten spacing on the Compare / Saved nav pills` |
| Spec / plan file | `docs/superpowers/specs/YYYY-MM-DD--<slug>.md` | `docs/superpowers/specs/2026-08-16--strain-compare-tray.md` |
| React component file | `PascalCase.tsx` | `CompareTray.tsx` |
| Hook file | `use-kebab-case.ts` | `use-compare-selection.ts` |
| Plain module (lib / util) | `kebab-case.ts` | `strain-catalog.ts` |
| Test file | `<unit>.test.ts(x)` next to the unit | `use-compare-selection.test.ts` |
| Env var / secret | `SCREAMING_SNAKE_CASE` | `GROQ_API_KEY`, `VITE_GOOGLE_CLIENT_ID` |
| Firestore collection | `camelCase` (already conventioned in `firestore.rules`) | `savedStrains` |
| Firebase callable | `camelCase` (Cloud Function export) | `compareStrains`, `setAgeVerified` |
| URL path / route | `kebab-case` | `/strain-detail`, `/account-settings` |

---

## 1. Branch names

### Format

```
<type>/<short-kebab-slug>
```

`<type>` is one of:

| Type | Use for |
| --- | --- |
| `feat` | New user-facing capability |
| `fix` | Bug fix |
| `chore` | Tooling, deps, refactors with no user-visible change |
| `docs` | Documentation only |
| `refactor` | Code restructuring with no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests only |
| `build` | Build system / CI changes |
| `ci` | CI workflow changes only |
| `style` | Visual/cosmetic only (formatting, spacing) — see note below |
| `hotfix` | Urgent production fix off `main` (rare) |

`<short-kebab-slug>` is lowercase, dash-separated, ≤ ~40 chars, no trailing dash, no double dash.

### Suffixes

- `-pr<N>` — append when the branch is the Nth iteration of the same logical change. The repo
  already does this: `fix/ios-gradient-image-cache-ask-maya-pr5`,
  `fix/web-quick-fixes-pr1`, `feat/description-cards-and-ask-maya-pr3`. Use it when a PR is sent
  back for review and a follow-up push is needed before merge; bump the number rather than
  mutating the slug.
- `-auto-YYYYMMDD-<id>` — append when an AI agent (or any automated flow) generated the branch
  with no human-readable intent at the time of creation. The date is the branch's *creation
  date* and `<id>` is a short stable identifier (8 hex chars is enough). The repo uses this for
  every AI-generated branch on `feat/auto-*` and `fix/auto-*`.

### Examples already in the repo

```
feat/auto-20260819-15661046
feat/description-cards-and-ask-maya-pr3
fix/ios-gradient-image-cache-ask-maya-pr5
fix/ios-tailored-description-pr2
fix/web-notes-and-image-cache-pr4
fix/web-quick-fixes-pr1
chore/add-agent-instructions-parity
chore/all-firebase-convex-removal
feat/apple-signin
```

### Rules

- **No `main` work directly.** `main` is protected; everything goes through a branch + PR.
- **No personal names, ticket IDs from external trackers, or build numbers in the slug.** The
  `-pr<N>` suffix is the only numeric suffix allowed, and it tracks PR iteration, not Jira.
- **Scope goes in the slug if it matters.** Prefer `fix/ios-...` / `feat/web-...` over bare
  `fix/...` when the change is platform-specific. Web is the default — no scope needed if the
  change is web-only and obvious from the slug; iOS always gets the `ios-` prefix.
- **Slash → dash for filesystem paths.** Git worktree directories and any non-git filesystem
  reference (CI artifacts, scratch dirs) drop the slash. The current worktree for
  `feat/auto-20260819-15661046` lives at `.worktrees/feat-auto-20260819-15661046`. Keep this
  rule — bash/PowerShell/some Windows tools misbehave on `/` in paths.

### AI agent behavior — auto branches are placeholders, always rename

The Mavis / mavis runtime hands every AI session a worktree on a placeholder
branch named `<type>/auto-YYYYMMDD-<id>`. That name is **not a real branch
name** — it's a session handle. The first thing an AI agent must do on a new
worktree is rename the branch to a spec-compliant name before doing any work:

```bash
# from inside the worktree, before the first commit
git branch -m <current-auto-name> <type>/<scope>-<short-kebab-description>
# then push the new name (and clean up the placeholder on origin if it was ever pushed)
git push -u origin <new-name>
```

This rule is **unconditional** — every worktree, every session, every commit,
every PR, every agent (Mavis, worker, explorer, anything that opens a
worktree). Rationale:

- The auto name is opaque in `git log --all`, in the GitHub branch list, in
  the merge commit message, and in code review ("what does
  `feat/auto-20260819-15661046` even do?").
- Renaming locally costs zero work. Not renaming pays off as confusion on
  every downstream surface.
- There is **no "small enough to skip" exception**. A single typo fix is
  still a real change worth a real name. A pure-docs housekeeping commit
  (e.g. updating this spec) still goes on `docs/<slug>`, not on
  `chore/auto-...`.
- Even a no-op turn (the agent decides not to do the work) should leave the
  branch in a renamed state, so the next session that picks it up sees a
  meaningful name.

When to rename:

- **Before the first commit.** Renaming after a commit still works
  (`git branch -m`), but it makes `git log` confusing if anyone else has
  already pulled the auto name.
- **Before the first push.** Pushing the auto name and then renaming on
  origin is a 4-command dance (`-m` locally, `push --delete` on origin,
  `push -u new`, update tracking). Renaming locally first is one command.

How to pick the new name — same rules as § 1:

- Match the type to the work: `feat` for new capability, `fix` for a bug,
  `docs` for docs only, `chore` for tooling, `refactor` for restructuring,
  `perf` for performance, `test` for tests, `build` for build, `ci` for CI.
- Match the scope: `fix/ios-...`, `feat/web-...`, `docs/...`, etc. Web is
  the default — no scope needed if the change is web-only and obvious from
  the slug; iOS always gets the `ios-` prefix.
- If the work spans more than one type, pick the dominant one and let the
  commit subjects carry the rest.
- Self-referential example: a commit that updates this very spec goes on
  `docs/naming-conventions-spec`, not on `chore/auto-...`.

Follow-up work:

- When an AI agent fixes a follow-up to an existing PR, branch from the
  existing PR branch and bump the suffix: `fix/...-pr3` → `fix/...-pr4`.
  The auto-rename rule still applies to whatever new branch you create.

---

## 2. Commit messages

The repo follows **Conventional Commits**. Subject line:

```
<type>(<scope>): <summary>
```

- **`<type>`** — same set as the branch `<type>`, plus `revert` for backouts.
- **`<scope>`** — optional, lowercase, one of:
  `web`, `iOS`, `auth`, `ai`, `home`, `dashboard`, `images`, `compliance`, `ui`, `data`,
  `deps`, `ci`, `infra`, `landing`, `compare`, `saved`, `auth`, `notes`, `cache`, `groq`,
  `firebase`, `firestore`. Compound scopes are allowed with `+`: `feat(iOS+web): ...`.
- **`<summary>`** — imperative mood, lowercase first letter, no trailing period, ≤ 72 chars.
  Reference the *what* and *why*, not the diff.

### Examples already in the repo

```
feat(auth): refresh firebase token after age verification
test(web): lock the full-width contract on the relief log trigger
feat(iOS+web): make the relief log trigger a real button on the strain view
fix(iOS): restore a compiling iOS target for the age gate
feat(web): personalize home sections with ailment carousel + for-you rail
style(ui): grey/white/silver left-to-right shimmer on loading copy
fix(web): tighten spacing on the Compare / Saved nav pills
perf(ai): trim compare + recommend prompts to stay under Groq on-demand TPM
fix(dashboard): remove double space in Compare and Saved tab labels
feat(compliance): region-aware age gate + server-side custom claim enforcement
fix(images): serve cached strain images via permanent public storage URL
feat(ai): switch backend to Groq Llama 3.3 70B and introduce Dr. Kaya persona
feat(home): preload mock detail view for featured rail strains
fix(iOS): drop the note badge from the StrainDetailView hero + toolbar heart
```

### Notes

- `style(ui)` is the conventional prefix for visual-only changes that don't fit `feat` or
  `fix`. Use it for shimmers, spacing, color tweaks, font changes, copy polish. Reserve `fix`
  for actual broken behavior.
- Emojis are allowed (see the `✨` in `feat(iOS): day/night gradient parity, ... ✨ Ask Maya
  elaboration`). Use them sparingly and only when they help a human scanning the log.
- Body and footer (Breaking change, Refs) are optional. Use a `BREAKING CHANGE:` footer when
  shipping a public-API change (callable signature, Firestore schema, env var).

### AI agent behavior

- One commit per logical change when possible. Squash a series of `wip` / `fix typo` /
  `rebase` commits before opening a PR.
- Don't use the branch type as the commit type. A `fix/*` branch can have `feat` commits if
  the fix also adds a small capability. Types describe the *commit*, not the *branch*.
- If you must ship a WIP, prefix the subject with `wip: ` and tighten it up before merge.

---

## 3. PR titles

**Same format as the commit subject: `<type>(<scope>): <summary>`.** The repo's history shows
the PR title mirrors the subject of the squashed/merged commit. One PR = one logical change
(squash-merge friendly).

- If the PR spans multiple commits, the title summarizes the *headline* change. Don't enumerate
  sub-changes in the title — that's what the PR description is for.
- Title-only (no body) is acceptable for trivial PRs; non-trivial PRs should reference the
  matching `docs/superpowers/specs/...` or `docs/superpowers/plans/...` file in the body.
- Use the `feat(*)` type even if the underlying branch is `fix/*` when the *net* change is a
  new capability. Match the title to the *change*, not the *branch*.

---

## 4. Worktree directories

```
.worktrees/<branch-name-with-slash-replaced-by-dash>
```

Examples (already in use):

```
.worktrees/feat-auto-20260819-15661046/
.worktrees/feat-description-cards-and-ask-maya-pr3/
```

AI agents that create a worktree must name the directory with `-` instead of `/`. Don't embed
extra metadata (no timestamps, no usernames); the branch already has it.

---

## 5. File and module names

These rules are not enforced by `eslint` today. They're a contract for AI agents and a
review checklist for humans.

| Kind | Format | Example | Notes |
| --- | --- | --- | --- |
| React component | `PascalCase.tsx` | `CompareTray.tsx` | One default export per file; filename matches the component. |
| React component test | `PascalCase.test.tsx` | `CompareTray.test.tsx` | Lives next to the component. |
| Hook | `use-kebab-case.ts` | `use-compare-selection.ts` | Default export pattern in this repo. |
| Hook test | `use-kebab-case.test.ts` | `use-compare-selection.test.ts` | Next to the hook. |
| Pure module (lib, util) | `kebab-case.ts` | `strain-catalog.ts` | Named exports; no default. |
| Pure module test | `kebab-case.test.ts` | `strain-catalog.test.ts` | Next to the module. |
| Cloud Function entrypoint | `index.ts` | `functions/src/index.ts` | One file, the deployable entry. |
| Helper inside `functions/src` | `kebab-case.ts` | `image-cache.ts`, `groq.ts` | Same as the lib rule. |
| Type-only file | `kebab-case.ts` | `functions/src/types.ts` | Exports only `type` / `interface`. |
| iOS SwiftUI view | `PascalCaseView.swift` | `StrainDetailView.swift` | Matches the type inside. |
| Spec / plan markdown | `docs/superpowers/{specs,plans}/YYYY-MM-DD--<slug>.md` | `docs/superpowers/specs/2026-08-16--strain-compare-tray.md` | See § 6. |
| Config / data at repo root | lowercase, dotfile or one-word | `firestore.rules`, `firebase.json`, `vite.config.ts` | Project root only. |

### Forbidden

- No nested `Card` inside `Card` — that's a UI rule from `AGENTS.md`, not a naming rule, but
  it constrains component split names: prefer `*Section` / `*Panel` / `*Header` over a `*Card`
  containing a `*Card`.
- No `index.ts` re-export barrels inside `src/components/` or `src/pages/`. Import the module
  directly (`import { Foo } from '@/components/Foo'`, not `from '@/components'`).

---

## 6. Spec / plan / docs filenames

The repo uses `docs/superpowers/` for project planning. Two sub-trees, identical naming
convention:

- `docs/superpowers/specs/YYYY-MM-DD--<slug>.md` — the *what / why / how* of a feature.
- `docs/superpowers/plans/YYYY-MM-DD--<slug>.md` — the *step-by-step execution plan* derived
  from a spec.

`<slug>` is the same kebab-case slug as the branch (e.g. `strain-compare-tray`). When a PR
implements a spec, link the spec from the PR body. When a branch is for a spec but isn't
described in the slug, link the spec from the commit body and the PR body.

---

## 7. Identifiers inside code

### Env vars / secrets

`SCREAMING_SNAKE_CASE`. Two namespaces:

- `VITE_*` — exposed to the client (Vite-bundled). Examples: `VITE_GOOGLE_CLIENT_ID`.
- Anything else — server-only. Firebase Functions secrets (`GROQ_API_KEY`) and integration
  keys (`VLY_INTEGRATION_KEY`) follow this convention.

Document new env vars in `README.md` and add them to `.github/workflows/cloudflare-pages.yml`
before shipping the PR that consumes them. That's a hard rule from `AGENTS.md`.

### Firestore collections / document fields

`camelCase`. Already enforced in `firestore.rules` paths: `users/{uid}/savedStrains/{strainId}`,
`users/{uid}/ageVerification/{region}`. When adding a new collection, add the matching rule in
the same PR.

### Firebase callable names

`camelCase`. Examples already exported from `functions/src/index.ts`: `compareStrains`,
`recommendStrainsForConditions`, `describeStrainForUser`, `findDoctors`, `setAgeVerified`.
The matching client wrapper lives in `src/lib/strain-api.ts` as a typed function with the same
name.

### TypeScript types / interfaces

`PascalCase`. Keep them in the file that owns them; lift to `types.ts` only when 2+ files need
them. The shared callable response types live in `functions/src/types.ts` and are re-exported
to the client (do not redefine the same shape on both sides — import).

### URL paths and route names

`kebab-case`. React Router paths in `src/main.tsx` use kebab-case segments
(`/account-settings`, `/strain-detail`). Route names (used for `Link to={...}`) are camelCase
in some places; this is internal so follow whatever the file already does.

---

## 8. Things AI agents should NOT do

- Do **not** use `main` as a working branch. Always branch first.
- Do **not** commit to, push, or open a PR from an `<type>/auto-YYYYMMDD-<id>` branch. That name
  is a placeholder handed to you by the Mavis runtime — rename it to a spec-compliant
  `<type>/<scope>-<short-kebab-description>` branch *before the first commit* (see § 1 "AI
  agent behavior"). Every session, every commit, every PR, no exceptions. The auto name is
  opaque in `git log`, the GitHub branch list, and the merge commit message; the rename
  costs nothing and pays off everywhere.
- Do **not** name a branch `<type>/<UserName>/<thing>` or include an external ticket id in
  the slug (e.g. `JIRA-1234`). Project internal `pr<N>` is the only allowed suffix.
- Do **not** invent new top-level types (`feature`, `bug`, `improvement`, `task`). Stick to
  the Conventional Commits set in § 2.
- Do **not** use Title Case in commit/PR subjects. Lowercase first letter, no period.
- Do **not** use a period at the end of a branch slug or commit summary.
- Do **not** mix case styles within the same identifier class. Pick one (see the table in § 1
  / § 5 / § 7) and stick to it.
- Do **not** name a spec or plan file with anything other than the `YYYY-MM-DD--<slug>.md`
  pattern in § 6. No `v1`, no `final`, no `WIP`.
- Do **not** open a PR whose title doesn't match the commit subject it summarizes.
- Do **not** bury a `BREAKING CHANGE:` in a commit body without also writing it into the
  PR description.

---

## 9. Quick reference for AI agents

When you need to pick a name, walk this list top to bottom and stop at the first matching rule:

0. **Are you on an `<type>/auto-YYYYMMDD-<id>` worktree?** → **Stop. Rename first.** Run
   `git branch -m <current-auto-name> <type>/<scope>-<short-kebab-description>` from inside
   the worktree, *before the first commit*. See § 1 "AI agent behavior — auto branches are
   placeholders, always rename." The auto name is never a valid branch name for a commit or
   a PR.
1. **Picking a branch name for non-auto work?** → § 1. Default
   `fix/<scope>-<short-description>` or `feat/<scope>-<short-description>`. Match the type
   to the actual change, not the surrounding context.
2. **Commit?** → § 2. Subject only, Conventional Commits, scope optional.
3. **PR title?** → § 3. Identical to the commit subject it summarizes.
4. **Worktree directory?** → § 4. Replace `/` with `-` in the branch name.
5. **New file?** → § 5. Look at the neighbors. Match their case, their suffix, their
   test-location convention.
6. **Env var, callable, collection, route, type?** → § 7. Match the existing entry closest
   in shape.

If none of the above fits (you've hit a real ambiguity), stop, name the ambiguity, and ask
the user — don't invent a new convention on the fly.
