---
name: commit
description: Create a git commit with a well-crafted conventional commit message. Use this skill whenever the user asks to commit, save their work, or says "/commit". Trigger on phrases like "commit this", "commit my changes", "save my progress", "make a commit", or just "/commit".
---

# Commit

Create a git commit with a conventional commit message scoped to the parts of the codebase that changed.

## Commit message format

```
<type>(<scope>): <short description>
```

**Type** — pick the one that best fits:
- `feat` — new functionality
- `fix` — bug fix
- `refactor` — restructuring without behavior change
- `chore` — dependencies, config, tooling, CI
- `test` — adding or updating tests
- `docs` — documentation only
- `style` — formatting, whitespace (no logic change)

**Scope** — determined by which directories have staged changes. Use `server`, `client`, or `server, client`. If `shared/` also changed, include it (e.g. `server, shared`). For root-level config files only, omit scope.

**Short description** — imperative mood, lowercase, no period. Focus on *why* not *what*. Under 70 characters total for the full first line.

### Examples

```
feat(server): add health-check endpoint for Railway
fix(client): prevent stale narration after room transition
refactor(server, client): extract shared action types
chore: update eslint and vitest dependencies
```

## Workflow

Follow these steps in order. Run independent commands in parallel where noted.

### 1. Gather context (parallel)

Run all three in parallel:
- `git status` — see what's staged, modified, and untracked
- `git diff --staged` and `git diff` — understand the actual changes
- `git log --oneline -5` — see recent message style for consistency

### 2. Stage files

- If nothing is staged yet, stage the files that belong to this logical change. Prefer naming files explicitly over `git add -A`.
- Never stage files that look like secrets (`.env`, credentials, API keys).
- If the user has already staged files, respect their staging.

### 3. Run tests if relevant

If the staged changes touch game logic (`game.ts`, `dungeon.ts`, `ai.ts`) or route handling (`routes.ts`), run `npm test` first. If tests fail, fix the issue before committing — do not skip tests.

### 4. Draft and create the commit

- Analyze the staged diff to determine the correct type and scope.
- Write the commit message following the format above.
- Append the co-author line:
  ```
  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  ```
- Use a HEREDOC to pass the message to `git commit` for clean formatting.

### 5. Handle pre-commit hook failures

This project has pre-commit hooks (ESLint auto-fix via lint-staged + TypeScript type checking). If the commit fails:
1. Read the error output to understand what failed.
2. Fix the issue (lint error, type error, etc.).
3. Re-stage the fixed files.
4. Create a **new** commit (do not amend) — the failed commit never happened, so amending would modify the previous commit.

### 6. Verify

Run `git status` after the commit to confirm it succeeded. Report the commit hash and message to the user.
