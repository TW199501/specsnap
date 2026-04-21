# v0.0.7 Retrospective — Inspector UI Packages

**Shipped:** 2026-04-21 (version bumps committed; `changeset publish` to npm deferred to user's credentials)
**Scope delivered:** Three new published packages (`-inspector-core`, `-inspector-vue`, `-inspector-react`) + release infrastructure + docs. Playground migration deferred to v0.0.8.

## What went well

- **Phase 0 de-risk paid off.** A 15-minute spike package proved `tsup + esbuild-plugin-vue3 + vue-tsc` produced publishable Vue SFC output (`Hello.vue` → `dist/index.mjs` + prop-typed `dist/Hello.vue.d.ts`). Committing to this pipeline before Phase 3 meant zero build-tooling rework when inspector-vue landed.
- **Phase 1 infrastructure-first approach held up.** Installing `changesets` and `dependency-cruiser` *before* writing any inspector code meant every commit from Task 2.1 onward was already gated. The `inspector-core-no-framework` rule kept core clean across 15 TDD commits without a single framework-leak regression.
- **TDD rhythm on inspector-core scaled.** 15 tasks, same 5-step pattern (write test → run-fails → implement → run-passes → commit), landed 59 passing tests with zero flaky ones. happy-dom's zero-rect limitation (inherited from specsnap-core) didn't bite because none of the tests needed real rects.
- **Dependency direction stayed one-way.** Final depcruise report: 96 modules, 144 deps, 0 violations. `inspector-vue` and `inspector-react` each depend on `inspector-core`; `inspector-core` has zero framework imports. Architecture held.

## What surprised us

- **`tsup` DTS emission vs `tsc --noEmit` are different pipelines.** Task 2.1 implementer silently fixed `tsconfig.base.json` `ignoreDeprecations` 5.0→6.0 with a false justification ("baseUrl deprecation"). Spec reviewer verified `tsc --noEmit` passes with 5.0 and flagged the change as unnecessary. I reverted. Task 2.2 then surfaced the REAL failure: `tsup`'s internal DTS build path does trip the baseUrl deprecation under 5.0. Net: 3 tsconfig commits (set 6.0 → revert to 5.0 → restore 6.0) — but honest history documented. Lesson: **spec reviewer verification must exercise the same pipeline as the failure mode**, not a similar-but-different one.
- **`SpecSnapBundle` shape was flatter than I assumed.** I wrote `bundle.markdown.filename` / `bundle.markdown.content` in 4 files based on memory; actual interface is `markdownFilename` / `markdownContent` (flat). Vitest runtime passed (JavaScript doesn't care about property nesting) but tsc caught it. One fix commit cleaned it up. Lesson: **read the type before relying on it** — even when you think you remember it.
- **vue-tsc 2.2.0's kebab-to-camel prop-name inference is flaky.** `aria-label` in a parent template refused to map to `ariaLabel` prop in the child component. Worked around by hardcoding `aria-label` inside `TriggerButton.vue`. Something to fix upstream or when vue-tsc updates.
- **`withDefaults` doesn't always narrow for vue-tsc.** Optional props with defaults still showed as `T | undefined` in template bindings. Resolved by computing explicit `resolvedPosition` / `resolvedTitle` / `showTrigger` `computed<T>(...)` values. Slightly verbose but bulletproof.

## What we'd change

- **Skip spec reviewer for mechanical tasks.** After Task 2.1's dramatic loop (implementer + spec reviewer + fix-up), the user flipped from "mode A strict" to "mode C inline" — I completed Phase 2's remaining 13 tasks + Phase 3+4 without subagent reviewers, at roughly 10× the throughput. The hybrid was always the right call for a plan this size; the initial A-mode strict cycle cost ~200K tokens for a task that needed ~30K. For future Phase 2-sized plans, defer the full 3-subagent cycle to tasks with *judgment* (architecture, testing strategy, error handling), not tasks with *transcription* (write this exact code).
- **Version-skip with changesets is awkward.** changesets assumed 0.0.5 → 0.0.6; we wanted 0.0.5 → 0.0.7. Handled by manual `package.json` version edit. Clean but not integrated with `changeset version` flow. Future: either stay within changesets' patch/minor/major semantics or accept manual bumps as part of the release.
- **Defer playground migration earlier.** The plan's Phase 5 "replace playground's hand-rolled Inspector" was high-risk/low-value given the packages themselves are now the canonical source. Deferring it to v0.0.8 saved a full phase of complexity without affecting what ships.

## Metrics

- **Published packages** (all at 0.0.7):
  - `@tw199501/specsnap-core` — unchanged API, lockstep bump
  - `@tw199501/specsnap-inspector-core` — 16.27 KB `.mjs` / 18.12 KB `.cjs` / 4.57 KB `.d.ts`
  - `@tw199501/specsnap-inspector-vue` — 12.92 KB `.mjs` + styles.css
  - `@tw199501/specsnap-inspector-react` — 7.40 KB `.mjs` / 9.15 KB `.cjs` / 2.04 KB `.d.ts` + styles.css
- **Tests:** 59 passing in inspector-core (+ 87 inherited from core/playground = 146 total). inspector-vue and inspector-react ship with no tests yet (Strict Mode + Teleport/Portal-integration tests deferred).
- **Boundary enforcement:** 96 modules, 144 deps, 0 dependency-cruiser violations.
- **Line endings:** 125 tracked text files, all LF.
- **Commits on feature branch:** ~30 (see `git log --oneline feature/v007-inspector-packages`)

## Follow-ups for v0.0.8+

- [ ] Wrapper tests — `@vue/test-utils` + `@testing-library/react` coverage for `<SpecSnapInspector />` (props, events, imperative handle, Strict Mode double-mount in React).
- [ ] Playground migration — replace `apps/playground/main.ts`'s hand-rolled inspector with `createInspector` from inspector-core + mount Vue/React demo tabs side-by-side.
- [ ] antares2 migration — consumer switches from in-tree `TheSpecSnapInspector.vue` to `@tw199501/specsnap-inspector-vue` (migration guide at `docs/superpower/plan/2026-04-20-v007-antares2-migration.md` — not yet written in this release; will write during antares2 upgrade).
- [ ] `inspector-core`'s `mount()` is currently a thin `createInspector` shim. Flesh out a vanilla renderer so framework-less consumers get a working panel without copying code from the wrappers.
- [ ] vue-tsc flake workarounds (hardcoded aria-label, computed-wrapped defaults) can likely be removed after vue-tsc ships a fix — revisit with version bumps.

## Postmortem of the tsconfig 6.0/5.0 saga

Three commits touched `tsconfig.base.json`:

1. `0618263` — Task 2.1 implementer set 5.0 → 6.0 with false justification
2. `40142ba` — I reverted 6.0 → 5.0 after spec reviewer's `tsc --noEmit` verification said 5.0 works
3. `ad199d6` — I re-reverted 5.0 → 6.0 after Task 2.2 exposed the real failure in tsup's DTS pipeline

**Root cause of the churn:** the spec reviewer's independent verification used `tsc --noEmit` (doesn't emit d.ts → doesn't trip deprecation warning), but the failure mode was in `tsup`'s DTS build (does emit d.ts → does trip). Two pipelines, one value, opposite outcomes.

**Prevention:** spec reviewers should exercise `pnpm -r build` (full build pipeline) as part of verification, not just `pnpm check` (tsc-only). Added this as a note in the retrospective for future plan authors.
