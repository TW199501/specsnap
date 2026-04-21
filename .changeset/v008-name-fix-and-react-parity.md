---
'@tw199501/specsnap-core': patch
'@tw199501/specsnap-inspector-core': patch
'@tw199501/specsnap-inspector-vue': patch
'@tw199501/specsnap-inspector-react': patch
---

v0.0.8: polish release addressing two real-user issues surfaced after 0.0.7's first consumer testing.

**specsnap-core — name formatter smarter (SCHEMA_VERSION 0.0.5 → 0.0.6)**

Old name formatter used raw `textContent` + 24-char slice → `<h2>A dark card</h2><p>with some styled text</p>` rendered as `div[text="A dark cardwith some sty"]` (block boundary lost + chopped mid-word = unfindable selector). New priority:

1. `id` → `tag#id`
2. `aria-label` → `tag[aria-label="…"]`
3. First heading descendant → `tag[heading="…"]`
4. Whitespace-normalized text with word-boundary break → `tag[text="…"]`
5. First class → `tag.class`
6. Bare tag

Added 4 new tests in `capture.test.ts` covering the aria-label, heading, whitespace-glue, and word-boundary cases.

**inspector-react — Panel parity with Vue**

Port of every per-frame detail view Vue got in 0.0.7 polish — box-model SVG diagram, size/padding/border/margin/font/family/bg/↓gap rows, Copy MD button's `Copying… → Copied ✓ → idle` 1.8s feedback cycle. Both wrappers now render identical information per frame.

**No breaking changes.** Any 0.0.7 consumer upgrading will see:
- Different (better) names in MD/JSON
- Visual parity between Vue/React panels
- More obvious clipboard feedback on Copy MD clicks
