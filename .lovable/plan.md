

# Plan: Fix Simulation Pipeline End-to-End

## Root Cause Analysis

There are **3 critical issues** preventing simulations from running:

### Issue 1: `X-Frame-Options: DENY` blocks all iframes
`vercel.json` sets `X-Frame-Options: DENY` globally. This blocks the `simulation-host.html` iframe from loading, even though it's same-origin. The SimulationViewer uses an iframe to render simulations.

**Fix**: Change `X-Frame-Options: DENY` to `X-Frame-Options: SAMEORIGIN`.

### Issue 2: SPA rewrite catches `simulation-host.html`
The catch-all rewrite `"/(.*)" → "/index.html"` in `vercel.json` intercepts requests for `/simulation-host.html`, serving the React app instead of the actual simulation host file.

**Fix**: Add a rewrite exclusion for static simulation files BEFORE the catch-all.

### Issue 3: Cross-origin `import()` fails for Supabase storage URLs
The `simulation-runtime.js` does `import(moduleUrl)` where `moduleUrl` is a Supabase signed URL (`https://ngduavjaiqyiqjzelfpl.supabase.co/storage/v1/...`). Dynamic ES module imports require CORS headers with `Access-Control-Allow-Origin` AND the response must have `Content-Type: application/javascript`. Supabase storage doesn't serve `.js` files with proper module CORS headers, so this import fails.

**Fix**: Instead of using `import()`, fetch the script text via `fetch()` and execute it using a Blob URL (same-origin). This avoids CORS module restrictions entirely.

## Implementation

### File 1: `vercel.json`
- Change `X-Frame-Options` from `DENY` to `SAMEORIGIN`
- Add rewrite for `/simulation-host.html` → `/simulation-host.html` (identity, before catch-all)
- Same for `/simulation-runtime.js` and `/simulation-runtime.css`

### File 2: `public/simulation-runtime.js`
Replace `import(moduleUrl)` with:
```js
const res = await fetch(moduleUrl);
const code = await res.text();
const blob = new Blob([code], { type: 'text/javascript' });
const blobUrl = URL.createObjectURL(blob);
const mod = await import(blobUrl);
URL.revokeObjectURL(blobUrl);
```
This fetches the compiled JS from Supabase storage (regular fetch, no CORS module issues), creates a same-origin blob URL, then imports it as a module.

### File 3: `src/lib/simulationPipeline.ts` (minor)
Ensure the transpiled output doesn't use `export default` since blob-imported modules handle this fine — actually it already does export default, which is correct.

## Claude Prompt for Simulations

After fixing, I'll also provide the exact prompt format you should give to Claude so its generated JSX code works perfectly with the pipeline:

**Key rules for Claude-generated simulations:**
1. Must be a single self-contained file
2. Only import from `react` (no other libraries)
3. Must `export default` a React component
4. Use only `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo` hooks
5. All styles must be inline or via CSS-in-JS (no external CSS imports)
6. Canvas/SVG animations are fine
7. No `window.fetch`, no external API calls

## Summary of Changes
1. `vercel.json` — X-Frame-Options + rewrite fixes (3 lines)
2. `public/simulation-runtime.js` — blob URL import pattern (~5 lines changed)

