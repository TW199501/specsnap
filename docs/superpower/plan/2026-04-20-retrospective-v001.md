# SpecSnap Core 0.0.1 — Retrospective

**Shipped:** 2026-04-20 (one-day cycle from zero to npm)
**Published:** `@tw199501/specsnap-core@0.0.1` · MIT · 15.7 KB packed / 83.1 KB unpacked
**Repo:** https://github.com/TW199501/specsnap (public) · tag `core@0.0.1`

---

## 12 Tasks × Delivered-As-Planned

| # | Plan Task | Result | Deviation |
|---|---|---|---|
| 1 | git init + .gitignore + LICENSE + README | ✅ | none |
| 2 | LF enforcement × 4 layers | ✅ | none |
| 3 | pnpm workspace root | ✅ | none |
| 4 | `@tw199501/specsnap-core` scaffold | ✅ | **+ fix**: `tsup.config.ts` added `outExtension` to emit `.mjs`/`.cjs` (plan's original config would have produced `.js` mismatched with `package.json.module`) |
| 5 | Frame / Session / BoxModel types | ✅ | none |
| 6 | `captureViewport` + `captureScroll` + TDD | ✅ | none |
| 7 | Bilingual lexicon (plan: ≥50 props) | ✅ | **over-delivered**: 56 properties |
| 8 | `captureElement` + `captureSession` | ✅ | none |
| 9 | Markdown serializer | ✅ | none |
| 10 | JSON serializer | ✅ | none |
| 11 | Playground smoke test | ✅ | **drastically expanded** — plan said "click button → output JSON". Actual: full multi-select inspector with SVG overlay, inter-element gaps, per-element box models, numbered badges. User-driven escalation in 3 iterations |
| 12 | Publish 0.0.1 to npm | ✅ | 2FA OTP needed — user ran final `npm publish` with `--otp` |

**Pass rate:** 12/12. Zero tasks dropped or blocked.

---

## Additions Beyond the Plan

These came up during execution and were committed as separate tasks:

| Addition | Commit | Why |
|---|---|---|
| `tsup outExtension` fix | `2d3a896` | Caught when real build output didn't match `package.json.module` path |
| `tsconfig.json` drop `rootDir` | `902567c` | VS Code TypeScript was complaining about tests/ not under rootDir — the option was useless anyway since tsup handles emit, `tsc --noEmit` ignores it |
| 10 edge-case tests (nth-of-type, empty session, multi-frame MD) | `0be3fa7` | Ship confidence before npm publish |
| Co-locate `*.test.ts` with source | `84581df` | User preferred Jest-style co-location over `tests/` sibling — refactor with `git mv` preserving history |
| Playground: multi-select, gap viz, box model × N | `d60f5e6`, `66779f7` | Reference screenshots demanded more than a smoke test |
| Hero screenshot in root README | `0a6d4af` | GitHub-facing marketing — shows differentiators at a glance |
| Package-level README (`packages/core/README.md`) | `76b2f67` | npm-facing docs separate from repo-level README |

**Total additional commits:** 7 beyond the planned 12.

---

## Metrics

| Metric | Value |
|---|---|
| Commits on `main` | 22 |
| Files tracked | 38 (all LF) |
| Tests | 36 (all passing) |
| TypeScript strict mode | ✅ zero errors |
| Build artifacts | 6 (`index.mjs/cjs/d.ts/d.cts` + source maps) |
| npm tarball size | 15.7 KB |
| Dependencies at runtime | 0 |
| Dev dependencies | happy-dom, tsup, vitest, TypeScript |
| Duration from git init → npm publish | ~8 hours of interactive collaboration |

---

## Lessons Learned

### What worked

1. **Plan-first discipline** — brainstorm → decisions doc → plan (split into part 1/2) → execute → retrospective. Each gate aligned expectations before committing effort. No wasted paths.
2. **Subagent-driven execution** — fresh Haiku/Sonnet subagent per task. Controller (the main session) only dispatched + reviewed. Kept conversation focused on decisions, not bits.
3. **4-layer LF enforcement** — `.gitattributes` + `.editorconfig` + `.vscode/settings.json` + CI guard script caught every potential CRLF issue before it landed. Zero CRLF drama in 22 commits on Windows.
4. **TDD for every capture/serialize function** — the RED → GREEN → COMMIT cadence produced cleaner code than writing tests after. Bugs surface at the point of the mistaken test expectation, not 3 PRs downstream.
5. **User push-back loop** — "playground only captures one thing", "box model doesn't show names", "need to see gaps" — three iterations until the playground matched vision. The willingness to redo beats premature optimization.

### What I'd do differently

1. **Pre-flight read of reference images** — the two PNG screenshots were provided early. I built a minimal playground first and only expanded after user feedback. Cost: 2 extra iterations. Fix: extract a checklist of visual features from references before writing code.
2. **Schema sanity from AI's perspective** — I didn't notice until user asked "does this help you" that the playground computed gap distances but never wrote them to the output schema. Visual-only info is lost to AI. Fix: before shipping any schema, do one pass asking "if I only had the JSON, could I reconstruct the design conversation?"
3. **Plan doc maintenance** — when we deviated (tsup outExtension, rootDir fix, test co-location), I applied the fix inline but updated the plan doc belatedly. Fix: treat the plan as living — update as you go, not as a retrospective chore.
4. **Initial Tauri limitation framing** — I said "Chrome extension doesn't work inside Tauri" without noting that npm lib absolutely does. User corrected this immediately. Fix: when a "limitation" appears, ask "is this a technical limit or a distribution-channel limit?" before calling the path blocked.

---

## What 0.0.1 Ships vs Vision's Full Scope

| Vision Principle | 0.0.1 Status |
|---|---|
| P1 — Viewport is sacred | ✅ every Session has viewport + DPR + scroll |
| P2 — Batch, not barrage | ⚠️ core supports arrays, no extension UI yet |
| P3 — Bilingual default | ✅ 56-prop lexicon, override mechanism |
| P4 — Two views of one truth | ⚠️ Markdown ✅, JSON ✅, screenshot deferred to 0.0.x+ |
| P5 — Recursive + filtered | ❌ no tree walk yet — roadmap |
| P6 — Conversation-ready | ✅ MD is direct-paste format |
| P7 — Observe, not modify | ✅ no write APIs |

**4 of 7 principles fully live in 0.0.1; 2 partial; 1 roadmap.** Good shipping discipline — we resisted the temptation to widen scope and held for 1.0.

---

## Next

- `2026-04-20-v002-schema-gaps-plan.md` — the AI-facing schema additions that today's work exposed as missing (gaps primarily)
- Extension plan (separate session) — Chrome/Edge extension wrapping core
