# YCM_Map — Architecture & Technical Notes

## Stack Overview

| Layer | Tech |
|---|---|
| Framework | React 19 (functional components, hooks only) |
| Build | Vite 6 + TypeScript |
| Map Rendering | D3.js (SVG) + TopoJSON |
| Styling | TailwindCSS v4 (utility-first) |
| Animation | Framer Motion (`motion/react`) |
| Icons | Lucide React |
| PWA | `vite-plugin-pwa` (Workbox under the hood) |
| Persistence | `localStorage` + `sessionStorage` |
| Analytics | Custom `trackEvent` shim (no external deps) |

---

## Project Structure

```
src/
├── components/
│   ├── TaiwanMap.tsx          # Root map component — all state lives here (~1150 lines)
│   ├── TaiwanMapCanvas.tsx    # D3 SVG canvas — receives props, no state (~690 lines)
│   ├── DialectFilterPanel.tsx # Side panel — language/dialect toggles + search
│   ├── MapLegend.tsx          # Floating legend — draggable, resizable, styleable
│   ├── MapSettingsMenu.tsx    # Gear menu — all toggle options
│   ├── CursorTooltip.tsx      # Hover tooltip bubble
│   ├── FixedInfoPanel.tsx     # Pinned sidebar with dialect detail
│   ├── ExplorationProgressPanel.tsx
│   ├── ReloadPrompt.tsx       # PWA update prompt
│   ├── dialectColors.ts       # Dialect → color mapping
│   └── types.ts               # Shared type definitions
├── hooks/
│   ├── useTaiwanTopo.ts       # Fetches + processes towns/villages TopoJSON
│   ├── useDialectData.ts      # Loads + indexes dialect bundle JSON
│   ├── useTranslation.ts      # zh/en UI string lookup + map term translation
│   ├── useUserStats.ts        # Derives stats from pinned locations
│   └── useAnalytics.ts        # Thin wrapper for event tracking
├── data/
│   ├── dialects.bundle.json   # Main dialect index (county → town → dialects[])
│   ├── dialects.index.json    # Alternate index format
│   ├── villages.lookup.json   # Village-level dialect lookup (county|town|village → dialects[])
│   ├── villages.notes.json    # Manual overrides for edge cases
│   ├── language_stats.json    # Population rankings per language
│   ├── dialectOrder.ts        # Display sort hints per language group
│   ├── map_translations.ts    # zh → en place/language name mappings
│   └── ui_translations.ts     # UI string translations (settings labels, etc.)
public/
├── towns-10t.json             # Self-hosted township TopoJSON (Taiwan Atlas)
├── villages-10t.json          # Self-hosted village TopoJSON (Taiwan Atlas)
└── logo-test_t.png            # App icon (+ variants)
```

---

## Data Flow

```
useTaiwanTopo ──► townFeatures, countyBorders, villageBorders, villageFeatures
useDialectData ──► languageGroups, getDialects(), getVillageDialects(), allDialects

TaiwanMap (state)
  ├── selectedDialects: Set<string>
  ├── hoveredTown: props | null
  ├── pinnedLocations: { "county|town|village": PinType }
  ├── showVillageColors / showCountyBorders / etc. (persisted to localStorage)
  └── ──► TaiwanMapCanvas (pure D3 renderer, no state)
           ├── Receives all settings as props
           ├── stateRef: avoids stale closures in D3 event handlers
           └── useEffect[selectedDialects, ...] → D3 .attr('fill', ...) updates
```

---

## Key Design Decisions

### D3 inside React via `stateRef`
D3 event handlers (mouseenter, click, etc.) are registered once at mount inside a `useEffect`. To avoid stale closures while keeping D3 handlers stable (so they don't re-register on every render), all volatile props are mirrored into a `stateRef` that's synced in a separate `useEffect`. This is the canonical pattern for D3+React co-existence.

### Two-layer map (township + village polygons)
The map renders two overlapping SVG groups:
- **Township group** — always loaded, clickable, shows township-level dialect colors
- **Village polygon group** — only shown in "Village Mode" (`showVillageColors`), uses the higher-resolution village dialect lookup

When village mode is on, township paths become `pointer-events: none` and the village polys get pointer events instead.

### Gradient fills for shared-dialect areas
When `showSharedDialects` is on and an area has multiple selected dialects, `generateAreaFill()` creates an SVG `<linearGradient>` on the fly in the `<defs>` group. Gradients are keyed by the sorted dialect names and only created once (checked with `document.getElementById(gradId)`).

### Pulse animation for focused area
The actively hovered/selected area gets the CSS class `map-pulse-focus` applied via D3's `.classed()`. This drives a CSS keyframe animation (4s ease-in-out opacity pulse) without needing JS timers. Class is removed when `hoveredTown` is cleared.

### Legend persistence
Legend style (font size, bg transparency, borders, style type) is persisted to `localStorage` under a single `ycm_legend_settings` key. Position is NOT persisted (it resets to the default corner on each load).

---

## Known Limitations & Tech Debt

- ✅ **Structural Cleanup (Bundle E)** — Extracted settings and search into custom hooks. Purged unused dependencies. (Done 2026-03-04).
- **`TaiwanMap.tsx` size** — Now ~950 lines (improved from 1150). Further extraction of UI sub-components possible as future debt.
- **`any` types** — Still present in D3 feature data. Low priority for now.
- **`@google/genai`, `express`, `better-sqlite3`** — Removed from `package.json`.

---

## Performance Notes

See `performance_analysis.md` (in brain artifacts) for the full ranked list.

1. ✅ Self-host TopoJSON (Done)
2. ✅ Bundle B: search debounce + fill pre-compute + dead file delete (Done)
3. ✅ Bundle A: `React.memo` + `useCallback` + hover batching (Done)
4. ✅ Bundle C: Lazy-load village data (Done)
5. 🔄 Deployment / Manifest optimization (Optional)

---

## PWA Notes

- Service worker via `vite-plugin-pwa` with `registerType: 'autoUpdate'`
- Precaches: logos + `towns-10t.json` + `villages-10t.json`
- Update flow: silent update in background, `ReloadPrompt` component notifies user when a new SW is waiting

---

## Internationalization

- **UI strings**: `ui_translations.ts` → accessed via `useTranslation(language)` → `t('key')`
- **Map terms** (place names, dialect names): `map_translations.ts` → accessed via `mt('漢字名')`
- **Language toggle**: stored in `localStorage`, defaults to `'zh'`
- Usage names toggle (`showDialectUsageNames`): swaps between official and colloquial dialect names in `mt()`
