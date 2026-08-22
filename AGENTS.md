# AGENTS.md

## Core rules

- Keep changes minimal and focused only on the current request.
- Do not explore unrelated files or refactor unrelated code.
- Do not generate tests unless explicitly requested.
- Do not add test files, test setup, mocks, fixtures, or coverage tooling unless explicitly requested.
- Do not spend tokens explaining obvious implementation details.
- Prefer editing the smallest number of files necessary.
- Reuse existing components, utilities, styles, types, and patterns before creating new ones.
- Do not duplicate logic that already exists in the project.
- Avoid speculative improvements that were not requested.
- Avoid large rewrites when a targeted fix is enough.
- Do not add unnecessary comments.
- Do not produce long summaries after completing work.

## Token efficiency

Before editing:

1. Identify the files most likely related to the request.
2. Read only those files and their direct dependencies when necessary.
3. Do not scan the entire repository unless the request genuinely requires it.
4. Search for exact component names, functions, routes, variables, or text before opening many files.
5. Stop investigating once enough context exists to implement the request safely.

While implementing:

- Make the smallest correct change.
- Prefer one direct implementation over multiple alternatives.
- Do not generate optional variants unless requested.
- Do not rewrite unchanged sections.
- Do not re-read files unless something materially changed.
- Do not repeatedly inspect generated files or build artifacts.
- Ignore `.next`, `node_modules`, build output, caches, lockfile internals, and generated files unless directly relevant.

## Next.js rules

This project may use a Next.js version with APIs, conventions, and file structure different from older Next.js versions.

Before using unfamiliar or version-sensitive Next.js APIs:

- Read the relevant documentation inside `node_modules/next/dist/docs/`.
- Treat those local docs as authoritative for the installed Next.js version.
- Follow deprecation notices.
- Do not rely purely on remembered Next.js behavior when local documentation differs.

The following block may be automatically maintained by Next.js tooling. Do not remove it merely to clean a diff:

<!-- BEGIN:nextjs-agent-rules -->

**# This is NOT the Next.js you know**

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Build requirement

After every completed user request:

1. Run the appropriate production build.
2. Prefer the project's existing build command, usually:

   ```bash
   npm run build
   ```

   or the equivalent command for the package manager used by the project.

3. If the project is a monorepo, build only the affected app/package unless the root build is required.
4. If the build fails because of your changes, fix the issue before finishing.
5. If the build fails because of an unrelated pre-existing issue, do not spend excessive time fixing unrelated code. Report the exact failing command and concise error.
6. Do not run tests as part of validation unless explicitly requested.

## Validation priority

Use this order:

1. Type/compiler errors related to edited files
2. Production build
3. Existing lint command only when useful or when the build does not cover the relevant checks
4. Tests only when explicitly requested

Do not run multiple expensive validation commands when the production build already provides sufficient confidence.

## Dependency rules

- Do not install a new dependency when the feature can reasonably be implemented with existing dependencies or platform APIs.
- Before installing anything, check `package.json`.
- Never upgrade unrelated dependencies.
- Do not regenerate the lockfile unnecessarily.
- Do not replace a working library simply because another library is preferred.
- If a new dependency is truly required, choose the smallest suitable dependency.

## UI changes

When modifying UI:

- Preserve the existing design language.
- Reuse existing components and styles.
- Maintain responsive behavior.
- Do not redesign unrelated areas.
- Do not add placeholder content unless required.
- Avoid creating a new component for trivial markup used only once unless it materially improves maintainability.

## API and data changes

When modifying APIs or data flows:

- Preserve existing response shapes unless the user specifically requests a breaking change.
- Reuse existing API clients and helpers.
- Avoid unnecessary new endpoints.
- Do not change database schemas unless required.
- Never expose secrets or server-only environment variables to client code.
- Preserve existing authentication and authorization behavior unless explicitly changing it.

## Error handling

- Handle realistic failure cases.
- Do not add excessive defensive code for impossible or irrelevant cases.
- Follow existing project error-handling patterns.
- Keep user-facing errors concise and useful.

## Git hygiene

- Do not modify unrelated files.
- Do not format the entire repository.
- Do not remove existing comments or code unless necessary.
- Do not revert user changes.
- Do not commit generated build output unless the repository already tracks it.
- Do not create commits unless explicitly requested.

## Completion response

After finishing, respond briefly with:

- What changed
- Important files changed
- Build result

Do not provide a long walkthrough unless requested.

Preferred format:

```text
Implemented:
- Added ...
- Updated ...

Files:
- path/to/file
- path/to/other-file

Build:
- npm run build ✅
```

If the build failed for an unrelated reason:

```text
Implemented:
- Added ...
- Updated ...

Build:
- npm run build ❌
- Existing issue: concise error
```
