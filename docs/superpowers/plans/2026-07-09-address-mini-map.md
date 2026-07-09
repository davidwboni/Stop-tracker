# Address Mini-Map Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a driver click any address already in the Route Planner's "Stops" list to reveal a small inline map confirming exactly where that stop is pinned.

**Architecture:** A new, small, self-contained component (`src/components/AddressMiniMap.jsx`) renders a single-marker Leaflet map for one address — the same `react-leaflet`/OpenStreetMap dependency `RouteMap.jsx` already uses, just scoped to one point instead of the whole route. `RoutePlanner.jsx` tracks which stop (if any) is currently expanded and conditionally renders the mini-map beneath that row, accordion-style (only one open at a time).

**Tech Stack:** React 18, `react-leaflet`/`leaflet` (existing dependency), Framer Motion (existing dependency, for the expand/collapse animation).

## Global Constraints

- No changes to `RouteMap.jsx` (the existing full-route map) — untouched.
- No mini-map preview added to the address-search suggestions dropdown — stops-list-only, confirmed non-goal.
- No changes to the existing reorder (`moveAddress`)/delete (`removeAddress`) buttons or their behavior.
- No navigation/deep-link behavior on the mini-map itself — passive preview only.
- Accordion behavior: only one stop's mini-map expanded at a time. Clicking a different stop's address collapses whichever was previously open.
- No automated tests — this is a pure UI/map-rendering feature with no underlying logic to unit-test, matching `RouteMap.jsx`'s own precedent (no test file exists for it either). Verification is manual, via the dev server.

---

## File Structure

**Create:**
- `src/components/AddressMiniMap.jsx` — single-marker Leaflet map for one address

**Modify:**
- `src/components/RoutePlanner.jsx` — `expandedAddressId` state, click-to-toggle on each stop's address, conditional `<AddressMiniMap>` render

---

### Task 1: AddressMiniMap component

**Files:**
- Create: `src/components/AddressMiniMap.jsx`

**Interfaces:**
- Produces: `AddressMiniMap({ latitude: number, longitude: number, address: string })` — a default-exported React component. Task 2 (`RoutePlanner.jsx`) imports and renders this with an address object's `latitude`/`longitude`/`address` fields.

- [ ] **Step 1: Create the component**

Create `src/components/AddressMiniMap.jsx`:

```jsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet (same fix RouteMap.jsx applies —
// duplicated here rather than shared, since it's five lines and this component
// has no other dependency on RouteMap.jsx).
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const AddressMiniMap = ({ latitude, longitude, address }) => {
  return (
    <div className="w-full h-40 rounded-lg overflow-hidden border border-border mt-2">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          <Popup>
            <div className="text-sm">{address}</div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default AddressMiniMap;
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: PASS — 61/61, unchanged (this is a brand-new, standalone file — no existing test touches it).

- [ ] **Step 3: Manually verify the component renders**

Since this component isn't consumed anywhere yet (Task 2 does that), verify it renders in isolation: temporarily add `<AddressMiniMap latitude={51.5074} longitude={-0.1278} address="Test Address, London" />` directly inside `RoutePlanner.jsx`'s return statement (anywhere visible, e.g. right after the page header), start the dev server (`npm start`), sign in as guest, navigate to Route Planner, confirm a small map appears showing central London with a marker, click the marker to confirm the "Test Address, London" popup shows. Then remove the temporary test line before committing — Task 2 will add the real integration.

- [ ] **Step 4: Commit**

```bash
git add src/components/AddressMiniMap.jsx
git commit -m "feat: add AddressMiniMap component for single-address preview"
```

---

### Task 2: Wire into RoutePlanner.jsx's Stops list

**Files:**
- Modify: `src/components/RoutePlanner.jsx:1-27` (imports), `:37` (component body, state), `:747-789` (Stops list row rendering)

**Interfaces:**
- Consumes: `AddressMiniMap` from `./AddressMiniMap` (Task 1), rendered with `latitude`/`longitude`/`address` props taken directly from each entry in the existing `addresses` array (already has these fields — no new data needed).
- Produces: no new exports — this is the integration task. `RoutePlanner`'s own props/exports (it takes none) are unchanged.

- [ ] **Step 1: Read the current file to confirm content**

Read `src/components/RoutePlanner.jsx` in full — match the snippets below by surrounding code content, since exact line numbers may have drifted since the prior two sub-projects' work.

- [ ] **Step 2: Add the imports**

Add the `AddressMiniMap` import after the existing `RouteMap` import:

```js
import RouteMap from "./RouteMap";
import AddressMiniMap from "./AddressMiniMap";
```

Add `ChevronDown` and `ChevronUp` to the existing `lucide-react` import list — it currently reads:

```js
import {
  MapPin,
  Navigation,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Navigation2,
  CheckCircle2,
  Zap,
  Copy,
  Play,
  Locate,
  Save,
  FolderOpen,
  Share2,
  AlertCircle,
  Clock
} from "lucide-react";
```

Change it to:

```js
import {
  MapPin,
  Navigation,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Navigation2,
  CheckCircle2,
  Zap,
  Copy,
  Play,
  Locate,
  Save,
  FolderOpen,
  Share2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
```

- [ ] **Step 3: Add the expanded-stop state**

Add inside the component body, alongside the existing `useState` declarations (after `const { frequentAddresses, recordAddressUse } = useAddressMemory();`):

```js
  const [expandedAddressId, setExpandedAddressId] = useState(null);
```

- [ ] **Step 4: Update the Stops list row rendering**

Replace the per-stop mapped block:

```jsx
                  {addresses.map((address, index) => (
                    <div
                      key={address.id}
                      className="flex items-start gap-2 p-2 bg-muted rounded border border-border/50 group"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold text-xs flex-shrink-0">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{address.address}</p>
                      </div>

                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          onClick={() => moveAddress(index, 'up')}
                          disabled={index === 0}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => moveAddress(index, 'down')}
                          disabled={index === addresses.length - 1}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => removeAddress(address.id)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
```

with:

```jsx
                  {addresses.map((address, index) => (
                    <div key={address.id}>
                      <div
                        className="flex items-start gap-2 p-2 bg-muted rounded border border-border/50 group"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold text-xs flex-shrink-0">
                          {index + 1}
                        </div>

                        <button
                          onClick={() => setExpandedAddressId(expandedAddressId === address.id ? null : address.id)}
                          className="flex-1 min-w-0 flex items-center gap-1 text-left"
                        >
                          <span className="text-xs truncate flex-1">{address.address}</span>
                          {expandedAddressId === address.id ? (
                            <ChevronUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </button>

                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            onClick={() => moveAddress(index, 'up')}
                            disabled={index === 0}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => moveAddress(index, 'down')}
                            disabled={index === addresses.length - 1}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => removeAddress(address.id)}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedAddressId === address.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <AddressMiniMap
                              latitude={address.latitude}
                              longitude={address.longitude}
                              address={address.address}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
```

Note: `motion` and `AnimatePresence` are already imported at the top of this file (used elsewhere, e.g. the `showNavOptions` block) — no new import needed for those.

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: PASS — 61/61, unchanged (this is a component-only change).

- [ ] **Step 6: Manually verify in the dev server**

Start the dev server (`npm start`), sign in as guest, navigate to Route Planner:
1. Add 2-3 different addresses to the route.
2. Click the first stop's address text. Confirm a small (~160px) map appears beneath that row, centered on that stop, with a marker; confirm the chevron next to the address flips from down to up.
3. Click the second stop's address. Confirm the first stop's map collapses (chevron flips back to down) while the second stop's map expands — only one open at a time.
4. Click the second stop's address again. Confirm it collapses back to nothing expanded.
5. Confirm the existing reorder (up/down arrows) and delete (X) buttons on each row still work exactly as before, unaffected by the new click target — hovering a row still reveals them, clicking them still reorders/removes without triggering the map expand/collapse.

- [ ] **Step 7: Commit**

```bash
git add src/components/RoutePlanner.jsx
git commit -m "feat: click a stop's address to preview its exact pinned location"
```

---

## Self-Review Notes

- **Spec coverage:** Both architecture pieces from the spec (the standalone `AddressMiniMap` component, the accordion-style integration into `RoutePlanner.jsx`'s Stops list) are covered by Tasks 1-2. The spec's non-goals (no `RouteMap.jsx` changes, no search-suggestion preview, no reorder/delete behavior changes, no navigation/deep-link on the mini-map itself) are respected — no task touches anything beyond the two named files.
- **Placeholder scan:** none found — every step has complete, runnable code and exact commands with expected output. Task 1's Step 3 (temporary manual test) explicitly says to remove the temporary line before committing, so it isn't a stray leftover.
- **Type/name consistency:** `AddressMiniMap`'s prop names (`latitude`, `longitude`, `address`) match exactly what Task 2 passes from each `addresses` array entry, which already carries these three fields from the existing address-search/postcode-resolve/address-memory work (no new data shape needed). `expandedAddressId` is used consistently in both the toggle handler and the conditional render — same variable, same equality check (`expandedAddressId === address.id`).
