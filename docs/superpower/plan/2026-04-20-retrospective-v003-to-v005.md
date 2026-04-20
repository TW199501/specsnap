# SpecSnap Core 0.0.3 → 0.0.5 — Closeout Retrospective

**Shipped:** 2026-04-20 (three releases in one dev session)
- `@tw199501/specsnap-core@0.0.3` — toAnnotatedPNG + toSpecSnapBundle + relative-path image refs
- `@tw199501/specsnap-core@0.0.4` — File System Access API adapter, subpixel display polish, TypeScript 6 + Node 22
- `@tw199501/specsnap-core@0.0.5` — data-i18n-key + data-v-source identity fields, SCHEMA_VERSION 0.0.5, tag-triggered publish workflow

**Repo:** https://github.com/TW199501/specsnap (public since 0.0.4)

## Headline numbers

| Metric | v0.0.2 | v0.0.5 |
| --- | --- | --- |
| Tarball packed | ~16 KB | ~60 KB |
| Tarball unpacked | ~83 KB | ~216 KB |
| Runtime deps | 0 | 1 (dom-to-image-more, dynamic-imported only) |
| Tests | 36 | 82 core + 5 playground = 87 |
| Public APIs | 5 (captureSession, captureElement, toMarkdown, toJSON, annotate) | 11 (+ toAnnotatedPNG, toSpecSnapBundle, buildAnnotationSvg, formatCaptureId, formatDateYYYYMMDD, computeGap) |
| Schema fields | Session / Frame / Gap | + optional ElementIdentity.i18nKey, .source |
| SCHEMA_VERSION | 0.0.2 | 0.0.5 |

## Three architectural turns mid-session

1. **`toAnnotatedMarkdown` (base64-embedded) → separate MD + PNG files.**
   First attempt embedded data URLs inline; paste test produced ~48 KB of
   unreadable base64 per 3-frame session. Reverted in the same session;
   replaced by relative-path refs + independent PNG Blobs. Consumer paste
   experience went from "wall of base64" to "clean text + drag in PNGs".

2. **PNG thumbnail in the panel → box-model diagram in the panel.**
   First attempt rendered the screenshot thumbnail inline for verification;
   user clarified they wanted the schematic box model (margin/border/padding/
   content rectangles with edge numbers) instead. PNG rendering dropped from
   the live UI; only produced by Copy MD.

3. **`<a download>` → File System Access API with fallback.**
   Files previously drifted to `Downloads/`; users had to move them. FSA
   adapter + IndexedDB-persisted handle means Chrome / Edge users pick a
   folder once and all subsequent Copy MD calls land in `<folder>/YYYYMMDD/`.
   Firefox / Safari keep the fallback — same code path real users on those
   browsers hit.

## What the discipline produced

- **TDD for every schema change.** RED → GREEN → COMMIT for every new test.
  Bugs surface at test-expectation time, not downstream.
- **36 → 87 tests across the three releases.** Every new API has a
  happy-path test AND an "absent / null" test.
- **LF enforcement across 65 tracked files.** Zero CRLF scares across
  20+ commits on Windows.
- **Playwright self-test** caught the "live overlay pollutes the PNG"
  bug in 0.0.3 — would never have surfaced from unit tests alone.
- **CI gate** (`.github/workflows/ci.yml`) runs check + test + build + pack
  dry-run on every push; caught tsup+TS6 `baseUrl` deprecation in 0.0.4.
- **Port pinning with predev kill + strictPort:** eliminated the
  "5173 drifts to 6000/6001" embarrassment that would have been an npm
  consumer trust leak.

## What would be different next time

- **Ask for the real output target sooner.** 0.0.3 went through three UX
  pivots on "where does visual verification live" — inline thumbnails,
  box-model diagrams, FSA disk. Each pivot was driven by seeing the output.
  A brainstorming step "what does the consumer physically DO with this"
  before any code would have collapsed those pivots.
- **Playground tests earlier.** The playground had no unit tests until
  0.0.4 Task 3. Three pivots of main.ts were verified only by Playwright —
  slow. A test suite on orchestration logic would have caught at least
  one bug earlier.
- **emoji → no emoji.** Shipped 0.0.3 with emojis in READMEs; 0.0.4 user
  asked to remove ("外國人會笑"). Lesson: default to no emojis in
  English-language open-source READMEs; save them for internal docs.

## Shipped vs vision principles

| Vision principle | 0.0.5 status |
| --- | --- |
| P1 — Viewport is sacred | ✅ Session always carries viewport; rect is document-relative; viewport-relative percentages computed separately |
| P2 — Batch, not barrage | ✅ N selections → one Session → one Copy → one bundle with N frames |
| P3 — Bilingual default | ✅ 56-prop lexicon; MD labels paired inline (`120 (寬度) × 34 (高度) px`) |
| P4 — Two views of one truth | ✅ MD text + annotated PNG share the same session, same filenames, relative-path refs inside MD |
| P5 — Recursive + semantic filter | ❌ Deferred to 0.1.0 — needs Vite plugin for source-location injection before recursion heuristic is well-defined |
| P6 — Conversation-ready | ✅ MD is direct-paste into Claude / ChatGPT / Cursor; PNGs drop in as attachments |
| P7 — Observe, not modify | ✅ No write APIs to the host page; overlay rendering injects briefly during capture only |

**6 of 7 principles live in 0.0.5; 1 on the 0.1.0 roadmap.**

## What unlocks the next chapter (0.1.0+)

The `data-i18n-key` and `data-v-source` attributes are the bridge to everything
that P5 (semantic-filtered recursion) and the Vite plugin will need. Once the
plugin injects them at build time, capturing a Vue component will include:
- actual source-file location for AI to open
- i18n key for AI to do reverse-lookup translations

Combined with a recursive walk + semantic filter (skip no-op wrappers, retain
interactive roles), a single click on a root component will produce a fully
self-describing frame tree that maps straight back to source code.

## Next steps (not committed, just flagged)

- `@tw199501/specsnap-vite-plugin` — compile-time DOM attribute injection
- Pseudo-state capture — `:hover`, `:focus`, `:disabled` via `getComputedStyle(el, pseudo)` where supported
- Recursive children with semantic filter — walk subtrees, filter out no-op wrappers
- Chrome / Edge / Firefox browser extension wrapping core
- `NPM_TOKEN` secret + publish.yml activation (draft already in repo)
- v0.1.0 candidate when the Vite plugin ships; v1.0 locks the schema
