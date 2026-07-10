# Theme System + Profile Retheme + Small Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the app a real system-aware theme (auto-detect + manual override), bring the Profile screen onto the same design system as the rest of the app, fix a real Android layout bug, apply a few small leftover touch-ups, and delete confirmed-dead files.

**Architecture:** `ThemeContext.js` is rewritten to track a 3-way preference (`system`/`light`/`dark`) persisted to `localStorage`, resolving to an actual `light`/`dark` DOM class — reacting live to OS changes when set to `system`. `Profile.js` gets the same token-based retheme every other screen already has, plus a new segmented control (in its existing "Account Settings" card) that calls into the new theme API. Two small, independent chores (a real grid-overflow layout bug, and leftover color/Money-component gaps) and a batch of confirmed-dead file deletions round out the plan.

**Tech Stack:** React 18, `window.matchMedia`, `localStorage`, existing `lucide-react` icon set, existing `<Money>`/`<Card>`/`<Button>` components.

## Global Constraints

- Theme preference is a device-local setting (`localStorage`, not Firestore) — no cross-device sync.
- Radius convention (already established): `rounded-[18px]` for cards, `rounded-[14px]` for buttons/inputs/smaller items.
- Color convention (already established): `bg-primary`/`text-primary`, `bg-muted`/`text-muted-foreground`, `bg-card`/`text-card-foreground`, `border-border`; semantic states use `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400` (success) and the existing `destructive` variant/tokens (error) — no vivid multi-color gradients.
- No changes to Profile's actual data logic: profile-picture upload, display-name/bio editing, Firestore read/write calls, data export, or the achievement-unlock logic — presentation and the new theme control only.
- No changes to `RoutePlanner.jsx` — confirmed nothing needs touching there.
- Dead-file deletions must be verified via the existing 61-test suite staying green plus a dev-server boot check — if anything unexpectedly still imports a "dead" file, that's a signal to stop and investigate, not to force the deletion through.

---

## File Structure

**Modify:**
- `src/contexts/ThemeContext.js` — system-detection + 3-way preference + persistence
- `src/App.js` — remove now-redundant theme-applying effect
- `src/components/Layout.jsx` — remove unused `useTheme` import
- `src/components/Profile.js` — full token retheme (Tasks 2-3) + new theme control (Task 3)
- `src/components/SimpleDashboard.jsx` — grid-overflow fix
- `src/components/StopEntryForm.jsx` — 2 leftover blue spots
- `src/components/WeeklyStats.jsx` — Money/radius/color touch-ups
- `src/router/index.js` — remove now-unused `PaymentConfig` import (Task 5)

**Delete:**
- `src/components/AppFooter.jsx` (shadowed dead twin of the live `AppFooter.js`)
- `src/components/LandingPage.jsx` (shadowed dead twin of the live `LandingPage.js`)
- `src/components/ThemeProvider.js`, `src/components/ThemeProvider.jsx` (both fully dead, unrelated to `ThemeContext.js`)
- `src/components/ThemeToggle.js` (fully dead, never integrated)
- `src/setupTests.js` (empty leftover CRA scaffold; Vitest uses `setupTests.ts` by explicit path)
- `src/components/QuickEntry.jsx` (fully dead)
- `src/components/PaymentConfig.jsx`, `src/components/PaymentConfig.old.js`, `src/components/StopTracker.js` (a fully dead chain — `StopTracker.js` has zero importers, `PaymentConfig.jsx` is only rendered from inside it)

---

### Task 1: Theme system (system-detection + manual override)

**Files:**
- Modify: `src/contexts/ThemeContext.js` (full rewrite), `src/App.js:1-16`, `src/components/Layout.jsx:5`

**Interfaces:**
- Produces: `useTheme()` returning `{ theme: 'light' | 'dark', themePreference: 'system' | 'light' | 'dark', setThemePreference: (pref: 'system' | 'light' | 'dark') => void }`. Task 3 (`Profile.js`) consumes `themePreference` and `setThemePreference` to build the new segmented control. `theme` (the resolved value) keeps the same name/shape `App.js` already reads today, so no other consumer needs to change.

- [ ] **Step 1: Rewrite ThemeContext.js**

Replace the entire contents of `src/contexts/ThemeContext.js`:

```jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext();

const STORAGE_KEY = "theme-preference";

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference) {
  return preference === "system" ? getSystemTheme() : preference;
}

function readStoredPreference() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readStoredPreference);
  const [theme, setTheme] = useState(() => resolveTheme(preference));

  // Apply the resolved theme to the DOM whenever it changes.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  // Re-resolve whenever the preference changes, and (only for "system")
  // keep listening for live OS-level changes while that preference is active.
  useEffect(() => {
    setTheme(resolveTheme(preference));

    if (preference !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setTheme(getSystemTheme());
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [preference]);

  const setThemePreference = useCallback((newPreference) => {
    setPreference(newPreference);
    localStorage.setItem(STORAGE_KEY, newPreference);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themePreference: preference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
```

- [ ] **Step 2: Remove the now-redundant theme-applying effect from App.js**

`App.js` currently duplicates the exact DOM-class-application logic `ThemeContext.js` now owns itself. Replace:

```jsx
import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { Navigate } from 'react-router-dom';

// This is now just a loader component that redirects to the proper router paths
function App() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  
  // Make sure theme is applied
  React.useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);
  
  // Loading state
```

with:

```jsx
import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { Navigate } from 'react-router-dom';

// This is now just a loader component that redirects to the proper router paths
function App() {
  const { user, loading } = useAuth();
  
  // Loading state
```

- [ ] **Step 3: Remove the unused useTheme import from Layout.jsx**

`Layout.jsx` imports `useTheme` but never calls it. Remove the line:

```js
import { useTheme } from '../contexts/ThemeContext';
```

from the top of `src/components/Layout.jsx` (it currently sits between the `useAuth` import and the `SyncStatus` import — remove just this one line, leave the surrounding imports untouched).

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: PASS — 61/61, unchanged (no test file touches these three files).

- [ ] **Step 5: Manually verify in the dev server**

Start the dev server (`npm start`), sign in as guest.
1. Open your browser/OS dark-mode emulation (e.g. Chrome DevTools → Rendering → "Emulate CSS media feature prefers-color-scheme") and toggle it between light/dark while the app has no stored preference yet (clear `localStorage` first if you've tested this app before). Confirm the app follows the OS setting live, without a page reload.
2. Confirm the app boots and renders normally — no console errors about `ThemeProvider`/`useTheme`.

(The manual UI control for switching preference doesn't exist yet — that's Task 3. This step only confirms the underlying system-detection logic works via the OS-level emulation, and that App.js/Layout.jsx still function correctly after removing their theme-related code.)

- [ ] **Step 6: Commit**

```bash
git add src/contexts/ThemeContext.js src/App.js src/components/Layout.jsx
git commit -m "feat: add system-aware theme detection with manual override support"
```

---

### Task 2: Profile.js retheme, part A (header, profile card, edit form, alerts)

**Files:**
- Modify: `src/components/Profile.js:328` (loading spinner color), `:362-544` (header through alerts)

**Interfaces:**
- Consumes: nothing new yet (Task 3 adds the `useTheme` import and the new control).
- Produces: no new exports — presentation-only within this task's scope.

- [ ] **Step 1: Read the current file to confirm content**

Read `src/components/Profile.js` in full — match the snippets below by surrounding code content, since exact line numbers may have drifted.

- [ ] **Step 2: Fix the loading spinner color**

Replace:
```jsx
        <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
```
with:
```jsx
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
```

- [ ] **Step 3: Retheme the profile CardHeader**

Replace:
```jsx
          <CardHeader className="relative bg-gradient-to-br from-primary/10 to-accent/10 border-b border-border/50 py-6 overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full"></div>
            
            <CardTitle className="relative z-10 flex items-center text-xl font-bold">
              <div className="p-3 bg-white/20 rounded-2xl mr-3 backdrop-blur-sm">
                <User className="w-6 h-6" />
              </div>
              Your Profile
            </CardTitle>
            <p className="relative z-10 text-blue-100 mt-2 text-sm font-medium">Manage your account and achievements</p>
          </CardHeader>
          <CardContent className="p-4 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
```
with:
```jsx
          <CardHeader className="bg-primary/5 border-b border-border/50 py-6">
            <CardTitle className="flex items-center text-xl font-bold">
              <div className="p-3 bg-primary/10 rounded-[14px] mr-3">
                <User className="w-6 h-6 text-primary" />
              </div>
              Your Profile
            </CardTitle>
            <p className="text-muted-foreground mt-2 text-sm font-medium">Manage your account and achievements</p>
          </CardHeader>
          <CardContent className="p-4">
```

- [ ] **Step 4: Retheme the profile picture and camera button**

Replace:
```jsx
                <div className="relative group mb-4">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 shadow-2xl ring-4 ring-white/50 dark:ring-gray-600/50 group-hover:ring-blue-300 dark:group-hover:ring-blue-600 transition-all duration-300">
                    {userData?.photoURL ? (
                      <img 
                        src={userData.photoURL} 
                        alt="Profile" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        key={userData.photoURL}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <label
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10);
                    }}
                    className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-2 rounded-2xl cursor-pointer hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-110 shadow-lg touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={updating}
                    />
                  </label>
                  {updating && (
                    <div className="absolute inset-0 bg-black/20 rounded-3xl flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center px-3 py-1.5 rounded-2xl bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/50 dark:border-blue-700/50">
                    <Award className="w-3 h-3 mr-2 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {userData?.role === 'pro' ? 'Pro Member' : 'Free User'}
                    </span>
                  </div>
                </div>
```
with:
```jsx
                <div className="relative group mb-4">
                  <div className="w-24 h-24 rounded-[18px] overflow-hidden bg-muted shadow-lg ring-4 ring-border group-hover:ring-primary/50 transition-all duration-300">
                    {userData?.photoURL ? (
                      <img 
                        src={userData.photoURL} 
                        alt="Profile" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        key={userData.photoURL}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <User className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <label
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10);
                    }}
                    className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-2 rounded-[14px] cursor-pointer hover:opacity-90 transition-all duration-300 transform hover:scale-110 shadow-lg touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={updating}
                    />
                  </label>
                  {updating && (
                    <div className="absolute inset-0 bg-black/20 rounded-[18px] flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                    <Award className="w-3 h-3 mr-2 text-primary" />
                    <span className="text-xs font-semibold text-primary">
                      {userData?.role === 'pro' ? 'Pro Member' : 'Free User'}
                    </span>
                  </div>
                </div>
```

- [ ] **Step 5: Retheme the edit-mode form fields**

Replace:
```jsx
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Display Name
                      </label>
                      <Input
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleChange}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <Input
                        name="email"
                        value={formData.email}
                        disabled
                        className="w-full bg-gray-100 dark:bg-gray-800"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Bio
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 px-3 py-2 text-sm"
                      />
                    </div>
```
with:
```jsx
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Display Name
                      </label>
                      <Input
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleChange}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Email
                      </label>
                      <Input
                        name="email"
                        value={formData.email}
                        disabled
                        className="w-full bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Bio
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full rounded-[14px] border border-border bg-input px-3 py-2 text-sm"
                      />
                    </div>
```

- [ ] **Step 6: Retheme the Save button**

Replace:
```jsx
                      <Button
                        onClick={handleUpdateProfile}
                        disabled={updating}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
```
with:
```jsx
                      <Button
                        onClick={handleUpdateProfile}
                        disabled={updating}
                      >
```

- [ ] **Step 7: Retheme the view-mode display and Edit Profile button**

Replace:
```jsx
                    <div className="mb-6 text-center">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {userData?.displayName || 'User'}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                        {userData?.email}
                      </p>
                      {userData?.bio && (
                        <p className="text-gray-700 dark:text-gray-300 mt-3 text-sm">
                          {userData.bio}
                        </p>
                      )}
                    </div>
                    <div className="text-center">
                      <Button
                        onClick={() => {
                          setEditMode(true);
                          if (navigator.vibrate) navigator.vibrate(5);
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-8 min-h-[48px] touch-manipulation"
                        size="sm"
                      >
                        Edit Profile
                      </Button>
                    </div>
```
with:
```jsx
                    <div className="mb-6 text-center">
                      <h2 className="text-xl font-bold">
                        {userData?.displayName || 'User'}
                      </h2>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {userData?.email}
                      </p>
                      {userData?.bio && (
                        <p className="text-muted-foreground mt-3 text-sm">
                          {userData.bio}
                        </p>
                      )}
                    </div>
                    <div className="text-center">
                      <Button
                        onClick={() => {
                          setEditMode(true);
                          if (navigator.vibrate) navigator.vibrate(5);
                        }}
                        className="px-8 min-h-[48px] touch-manipulation"
                        size="sm"
                      >
                        Edit Profile
                      </Button>
                    </div>
```

- [ ] **Step 8: Retheme the success alert**

Replace:
```jsx
            {success && (
              <Alert className="mt-6 bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:text-green-100">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
```
with:
```jsx
            {success && (
              <Alert className="mt-6 bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
```

- [ ] **Step 9: Run the full test suite**

Run: `npm run test`
Expected: PASS — 61/61, unchanged.

- [ ] **Step 10: Manually verify in the dev server**

Start the dev server, sign in as guest, navigate to Profile. Confirm: header banner is a flat muted teal wash (no decorative circles, no black overlay, no `blue-100` text), profile picture ring is a plain border (no gradient placeholder background), role badge is a teal pill, Edit Profile → edit form fields have no leftover gray-100/gray-300 colors, Save button is solid teal (default), a real shadow is now visible under the loading spinner and picture (confirming the dead `shadow-apple-*` classes are gone), and triggering a success message (e.g. successfully editing your bio) shows a teal/emerald-tinted alert, not the old flat green box.

- [ ] **Step 11: Commit**

```bash
git add src/components/Profile.js
git commit -m "feat: retheme Profile header, picture, edit form, and alerts to the Phase 0 design tokens"
```

---

### Task 3: Profile.js retheme, part B (Achievements, Demo card, Account Settings + theme control)

**Files:**
- Modify: `src/components/Profile.js:1-22` (imports), `:548-599` (Achievements), `:601-665` (Demo Upgrade card), `:667-730` (Account Settings — includes the new theme control)

**Interfaces:**
- Consumes: `useTheme` from `../contexts/ThemeContext` (Task 1), destructuring `{ themePreference, setThemePreference }`.
- Produces: no new exports — presentation-only, plus the new UI control wired to Task 1's API.

- [ ] **Step 1: Read the current file to confirm content**

Read `src/components/Profile.js` in full (post-Task-2) — match the snippets below by surrounding code content.

- [ ] **Step 2: Add the new imports**

Add after the existing `db, auth` import:

```js
import { useTheme } from "../contexts/ThemeContext";
```

Add `Sun`, `Moon`, `Monitor` to the existing `lucide-react` import list — it currently reads:

```js
import { 
  User, 
  Camera, 
  Save, 
  Clock, 
  Truck, 
  Award, 
  Settings,
  LogOut,
  AlertCircle,
  Loader2
} from "lucide-react";
```

Change it to:

```js
import { 
  User, 
  Camera, 
  Save, 
  Clock, 
  Truck, 
  Award, 
  Settings,
  LogOut,
  AlertCircle,
  Loader2,
  Sun,
  Moon,
  Monitor
} from "lucide-react";
```

- [ ] **Step 3: Call the theme hook**

Add inside the component body, right after the existing `const storage = getStorage();` line:

```js
  const { themePreference, setThemePreference } = useTheme();
```

- [ ] **Step 4: Retheme the Achievements card**

Replace:
```jsx
        <Card className="mx-4 shadow-apple-card border-0 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 rounded-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl mr-3 shadow-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Achievements
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-1 gap-3">
              {achievements.map((achievement, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className={`group p-4 rounded-2xl border flex items-center gap-4 transition-all duration-300 ${
                    achievement.unlocked 
                      ? "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-700 dark:from-blue-900/20 dark:to-indigo-900/20 hover:shadow-blue-200/50" 
                      : "border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/30 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className={`p-3 rounded-2xl transition-all duration-300 ${
                    achievement.unlocked 
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg" 
                      : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  }`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-base mb-1 ${
                      achievement.unlocked 
                        ? "text-blue-900 dark:text-blue-100" 
                        : "text-gray-500 dark:text-gray-400"
                    }`}>
                      {achievement.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.unlocked && (
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
```
with:
```jsx
        <Card className="border-border/50 rounded-[18px]">
          <CardHeader className="pb-4">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-[14px] mr-3">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg font-bold">
                Achievements
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-1 gap-3">
              {achievements.map((achievement, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className={`group p-4 rounded-[14px] border flex items-center gap-4 transition-all duration-300 ${
                    achievement.unlocked 
                      ? "border-primary/20 bg-primary/5" 
                      : "border-border/50 bg-muted/30"
                  }`}
                >
                  <div className={`p-3 rounded-[14px] transition-all duration-300 ${
                    achievement.unlocked 
                      ? "bg-primary text-primary-foreground shadow-lg" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-base mb-1 ${
                      achievement.unlocked 
                        ? "text-primary" 
                        : "text-muted-foreground"
                    }`}>
                      {achievement.name}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.unlocked && (
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
```

- [ ] **Step 5: Retheme the Demo Upgrade card**

Replace:
```jsx
        {userData?.isDemo && (
          <Card className="mx-4 shadow-apple-card border-0 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 border-2 border-emerald-200 dark:border-emerald-700 rounded-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl mr-3 shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold bg-gradient-to-r from-emerald-700 to-cyan-700 bg-clip-text text-transparent">
                    Ready to Save Your Progress?
                  </CardTitle>
                  <p className="text-emerald-600 dark:text-emerald-400 mt-1 text-sm">
                    Create a real account to keep your delivery data forever!
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-4 rounded-2xl border border-emerald-200 dark:border-emerald-700">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-emerald-900 dark:text-emerald-100 text-lg mb-2">
                      🚀 Upgrade to Full Account
                    </h3>
                    <p className="text-emerald-700 dark:text-emerald-300 text-sm leading-relaxed mb-4">
                      You're currently using a demo account. Create a real account to:
                    </p>
                    <ul className="text-sm text-emerald-600 dark:text-emerald-400 space-y-1">
                      <li className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-3"></div>
                        Save your delivery data permanently
                      </li>
                      <li className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-3"></div>
                        Sync across all your devices
                      </li>
                      <li className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-3"></div>
                        Access premium features
                      </li>
                    </ul>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => {
                        // Navigate to sign up page
                        onLogout(); // This will clear the guest session
                        setTimeout(() => {
                          window.location.href = '/';
                        }, 100);
                      }}
                      className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      Create Account
                    </Button>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center">
                      Keep all your demo data!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
```
with:
```jsx
        {userData?.isDemo && (
          <Card className="border-primary/20 bg-primary/5 rounded-[18px]">
            <CardHeader className="pb-4">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-[14px] mr-3">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">
                    Ready to Save Your Progress?
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Create a real account to keep your delivery data forever!
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4">
              <div className="bg-card p-4 rounded-[14px] border border-border/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">
                      🚀 Upgrade to Full Account
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      You're currently using a demo account. Create a real account to:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                        Save your delivery data permanently
                      </li>
                      <li className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                        Sync across all your devices
                      </li>
                      <li className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                        Access premium features
                      </li>
                    </ul>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => {
                        // Navigate to sign up page
                        onLogout(); // This will clear the guest session
                        setTimeout(() => {
                          window.location.href = '/';
                        }, 100);
                      }}
                      className="px-8 py-3 rounded-[14px]"
                    >
                      Create Account
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Keep all your demo data!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
```

- [ ] **Step 6: Retheme Account Settings and replace Subscription Plan with the theme control**

Replace:
```jsx
        <Card className="mx-4 rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <Settings className="mr-2 w-5 h-5" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Subscription Plan</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {userData?.role === 'pro' 
                      ? 'You are currently on the Pro plan' 
                      : 'You are currently on the Free plan'}
                  </p>
                </div>
                <Button
                  variant={userData?.role === 'pro' ? 'outline' : 'default'}
                  className={userData?.role === 'pro' 
                    ? 'bg-gray-100 dark:bg-gray-800' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'}
                  disabled={userData?.role === 'pro'}
                >
                  {userData?.role === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                </Button>
              </div>
              
              <div className="flex justify-between items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Account Actions</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Data export and account management
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleExportData}
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      'Export Data'
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={onLogout}
                  >
                    <LogOut className="mr-2 w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
```
with:
```jsx
        <Card className="border-border/50 rounded-[18px]">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <Settings className="mr-2 w-5 h-5" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-[14px] border border-border/50">
                <div>
                  <h3 className="font-medium">Appearance</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose how Stop Tracker looks on this device
                  </p>
                </div>
                <div className="flex gap-1 bg-muted rounded-[14px] p-1">
                  <button
                    onClick={() => setThemePreference('system')}
                    className={`p-2 rounded-lg transition-colors ${
                      themePreference === 'system' ? 'bg-card shadow-sm' : ''
                    }`}
                    aria-label="Match system theme"
                    aria-pressed={themePreference === 'system'}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setThemePreference('light')}
                    className={`p-2 rounded-lg transition-colors ${
                      themePreference === 'light' ? 'bg-card shadow-sm' : ''
                    }`}
                    aria-label="Light theme"
                    aria-pressed={themePreference === 'light'}
                  >
                    <Sun className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setThemePreference('dark')}
                    className={`p-2 rounded-lg transition-colors ${
                      themePreference === 'dark' ? 'bg-card shadow-sm' : ''
                    }`}
                    aria-label="Dark theme"
                    aria-pressed={themePreference === 'dark'}
                  >
                    <Moon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 rounded-[14px] border border-border/50">
                <div>
                  <h3 className="font-medium">Account Actions</h3>
                  <p className="text-sm text-muted-foreground">
                    Data export and account management
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleExportData}
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      'Export Data'
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={onLogout}
                  >
                    <LogOut className="mr-2 w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
```

- [ ] **Step 7: Run the full test suite**

Run: `npm run test`
Expected: PASS — 61/61, unchanged.

- [ ] **Step 8: Manually verify in the dev server**

Start the dev server, sign in as guest, navigate to Profile. Confirm: Achievements cards are muted with a teal icon accent (no blue/gray gradient tiles), the Demo Upgrade card (guest accounts see this) is a muted teal card (no emerald/cyan gradient), and the new "Appearance" row replaces "Subscription Plan" with a working System/Light/Dark 3-button control — click each and confirm the whole app's resolved theme changes immediately and persists across a page reload.

- [ ] **Step 9: Commit**

```bash
git add src/components/Profile.js
git commit -m "feat: retheme Achievements/Demo card and add theme control to Account Settings"
```

---

### Task 4: Small polish fixes (SimpleDashboard grid overflow, StopEntryForm, WeeklyStats)

**Files:**
- Modify: `src/components/SimpleDashboard.jsx:89-133` (stat grids), `src/components/StopEntryForm.jsx:449,755` (blue spots), `src/components/WeeklyStats.jsx:174-274` (Money/radius/color)

**Interfaces:**
- Consumes: `Money` (already imported in both `SimpleDashboard.jsx` and needs adding to `WeeklyStats.jsx` if not already present — check the current import list first).
- Produces: no new exports — presentation/layout-only.

- [ ] **Step 1: Read the current files to confirm content**

Read `src/components/SimpleDashboard.jsx`, `src/components/StopEntryForm.jsx`, and `src/components/WeeklyStats.jsx` in full — match the snippets below by surrounding code content.

- [ ] **Step 2: Fix the SimpleDashboard grid-overflow bug**

Replace the "Today's Stats" 2-column grid:
```jsx
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-border/50 overflow-hidden">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Today's Stops</div>
              <div className="text-3xl font-bold">{todayData.stops}</div>
              <div className="text-xs text-muted-foreground mt-1">stops</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 overflow-hidden">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Today's Earnings</div>
              <div className="text-3xl font-bold text-primary"><Money amount={todayData.earnings} /></div>
              <div className="text-xs text-muted-foreground mt-1">earned</div>
            </CardContent>
          </Card>
        </div>
```
with:
```jsx
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-border/50 overflow-hidden min-w-0">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Today's Stops</div>
              <div className="text-2xl sm:text-3xl font-bold">{todayData.stops}</div>
              <div className="text-xs text-muted-foreground mt-1">stops</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 overflow-hidden min-w-0">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Today's Earnings</div>
              <div className="text-2xl sm:text-3xl font-bold text-primary"><Money amount={todayData.earnings} /></div>
              <div className="text-xs text-muted-foreground mt-1">earned</div>
            </CardContent>
          </Card>
        </div>
```

Replace the "This Week" 3-column grid:
```jsx
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-2xl font-bold">{weekStats.stops}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Stops</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary"><Money amount={weekStats.earnings} /></div>
                  <div className="text-xs text-muted-foreground mt-1">Earned</div>
                </div>
                <div>
                  <div className="text-2xl font-bold"><Money amount={weekStats.avgPerDay} /></div>
                  <div className="text-xs text-muted-foreground mt-1">Per Day</div>
                </div>
              </div>
```
with:
```jsx
              <div className="grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-bold">{weekStats.stops}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Stops</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-primary"><Money amount={weekStats.earnings} /></div>
                  <div className="text-xs text-muted-foreground mt-1">Earned</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-bold"><Money amount={weekStats.avgPerDay} /></div>
                  <div className="text-xs text-muted-foreground mt-1">Per Day</div>
                </div>
              </div>
```

- [ ] **Step 3: Fix StopEntryForm.jsx's 2 leftover blue spots**

Find and replace (sync-status text, around line 449):
```jsx
        <div className="flex items-center text-blue-600 text-sm">
```
with:
```jsx
        <div className="flex items-center text-primary text-sm">
```

Find and replace ("View All" link, around line 755):
```jsx
                  className="text-xs text-blue-600 dark:text-blue-400 p-0 h-auto"
```
with:
```jsx
                  className="text-xs text-primary p-0 h-auto"
```

- [ ] **Step 4: Retheme WeeklyStats.jsx's money displays, radius, and trend color**

Add `Money` to the imports if not already present — check the top of `src/components/WeeklyStats.jsx` for an existing `import { Money } from "./ui/money";` line; if it's missing, add it after the existing `Button` import.

Replace (line ~184 and ~207, the two trend-color ternaries):
```jsx
                    ? 'text-green-500'
```
with (both occurrences):
```jsx
                    ? 'text-emerald-500'
```

Replace (line ~174, ~197, ~220, ~234, the four stat-tile containers):
```jsx
              className="bg-card rounded-lg p-4 border border-border/50"
```
with (all four occurrences — they are identical strings, replace every one):
```jsx
              className="bg-card rounded-[14px] p-4 border border-border/50"
```

Replace (line ~203, Total Earnings display):
```jsx
              <div className="text-2xl font-bold text-primary mb-1">£{weekSummary.totalEarnings.toFixed(2)}</div>
```
with:
```jsx
              <div className="text-2xl font-bold text-primary mb-1"><Money amount={weekSummary.totalEarnings} /></div>
```

Replace (line ~240, Avg Per Day display — note `weekSummary.avgEarningsPerDay` is computed via `.toFixed(2)` into a string earlier in this file; leave that computation as-is, since `<Money>` accepts a numeric string via JS's implicit coercion in `.toFixed()`... actually `<Money>` calls `amount.toFixed(2)` internally, which requires a real number, not a string. Since `avgEarningsPerDay` is already a string here, first convert the computation to store a number instead):

Find the `avgEarningsPerDay` calculation (near the top of the `weekSummary` `useMemo`):
```js
    const avgEarningsPerDay = daysWorked > 0 ? (totalEarnings / daysWorked).toFixed(2) : 0;
```
Replace with:
```js
    const avgEarningsPerDay = daysWorked > 0 ? (totalEarnings / daysWorked) : 0;
```

Then replace the display line:
```jsx
              <div className="text-2xl font-bold">£{weekSummary.avgEarningsPerDay}</div>
```
with:
```jsx
              <div className="text-2xl font-bold"><Money amount={weekSummary.avgEarningsPerDay} /></div>
```

Replace (line ~261, the daily-breakdown row container):
```jsx
                  className={`flex items-center justify-between p-3 rounded-lg border ${
```
with:
```jsx
                  className={`flex items-center justify-between p-3 rounded-[14px] border ${
```

Replace (line ~274, per-day earnings display):
```jsx
                        <div className="font-semibold text-primary">£{day.earnings.toFixed(2)}</div>
```
with:
```jsx
                        <div className="font-semibold text-primary"><Money amount={day.earnings} /></div>
```

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: PASS — 61/61, unchanged.

- [ ] **Step 6: Manually verify in the dev server**

Start the dev server, sign in as guest, log a few entries with a large stop count (e.g. 176 stops) to produce a wide earnings figure. On the Dashboard, confirm the "Today's Stats" and "This Week" numbers no longer overflow into each other even with wide values — resize the browser to a narrow mobile width (e.g. 360px) to specifically check this. On Stats, confirm all money figures render via `<Money>` (tabular-nums), radii look consistent with the rest of the app, and the trend arrows use the teal-adjacent emerald rather than plain green. On the Dashboard's Log Entry form, confirm the sync-status text and "View All" link are now teal instead of blue.

- [ ] **Step 7: Commit**

```bash
git add src/components/SimpleDashboard.jsx src/components/StopEntryForm.jsx src/components/WeeklyStats.jsx
git commit -m "fix: resolve Android stat-number grid overflow, finish leftover Money/color touch-ups"
```

---

### Task 5: Dead file cleanup

**Files:**
- Delete: `src/components/AppFooter.jsx`, `src/components/LandingPage.jsx`, `src/components/ThemeProvider.js`, `src/components/ThemeProvider.jsx`, `src/components/ThemeToggle.js`, `src/setupTests.js`, `src/components/QuickEntry.jsx`, `src/components/PaymentConfig.jsx`, `src/components/PaymentConfig.old.js`, `src/components/StopTracker.js`
- Modify: `src/router/index.js:14` (remove the now-unused `PaymentConfig` import)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing — pure deletion/cleanup, no behavior change expected anywhere in the app.

- [ ] **Step 1: Re-confirm each file is genuinely unimported**

Before deleting, run this exact check for each target (from the repo root) and confirm zero matches outside the file itself:

```bash
grep -rln "AppFooter" src --include="*.js" --include="*.jsx" | grep -v "src/components/AppFooter.jsx$"
grep -rln "LandingPage" src --include="*.js" --include="*.jsx" | grep -v "src/components/LandingPage.jsx$"
grep -rln "ThemeProvider" src --include="*.js" --include="*.jsx"
grep -rln "ThemeToggle" src --include="*.js" --include="*.jsx"
grep -rln "QuickEntry" src --include="*.js" --include="*.jsx" | grep -v "src/components/QuickEntry.jsx$"
grep -rln "PaymentConfig" src --include="*.js" --include="*.jsx" | grep -v "src/components/PaymentConfig"
grep -rln "StopTracker" src --include="*.js" --include="*.jsx" | grep -v "src/components/StopTracker.js$"
```

Expected: the `AppFooter`/`LandingPage`/`QuickEntry` checks return nothing (their only real references are inside their own dead files or already-known-live twins, filtered out above); `ThemeProvider`/`ThemeToggle` return nothing at all (fully dead, no live twin to filter); `PaymentConfig` returns only `src/router/index.js:14` (the import this task also removes) and possibly `src/components/StopTracker.js` (also being deleted); `StopTracker` returns nothing (confirmed zero importers). If any of these checks surface an unexpected real usage, STOP and report back rather than deleting that file — the plan's assumption about it being dead was wrong.

- [ ] **Step 2: Delete the confirmed-dead files**

```bash
git rm src/components/AppFooter.jsx
git rm src/components/LandingPage.jsx
git rm src/components/ThemeProvider.js
git rm src/components/ThemeProvider.jsx
git rm src/components/ThemeToggle.js
git rm src/setupTests.js
git rm src/components/QuickEntry.jsx
git rm src/components/PaymentConfig.jsx
git rm src/components/PaymentConfig.old.js
git rm src/components/StopTracker.js
```

- [ ] **Step 3: Remove the now-unused PaymentConfig import from router/index.js**

Remove this line from `src/router/index.js` (it's a standalone import line, not referenced anywhere else in the file once `PaymentConfig.jsx` is deleted):

```js
import PaymentConfig from '../components/PaymentConfig';
```

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: PASS — 61/61, unchanged (none of the deleted files are imported by any test or by anything the tests exercise).

- [ ] **Step 5: Manually verify the app still boots**

Start the dev server (`npm start`), sign in as guest, click through every bottom-nav tab (Home, Entries, Routes, Invoice, Stats, Profile) and confirm no console error references any of the deleted files, and every screen renders normally.

- [ ] **Step 6: Commit**

```bash
git add src/router/index.js
git commit -m "chore: delete confirmed-dead files (shadowed duplicates, unused components, dead chains)"
```

---

## Self-Review Notes

- **Spec coverage:** All items from the spec are covered — theme system (Task 1), Profile retheme + new control (Tasks 2-3), the Android grid-overflow bug plus the two originally-scoped small touch-ups (Task 4), and every confirmed-dead file including the two discovered mid-investigation (`ThemeToggle.js`, and the `Layout.jsx`/`App.js` drive-by fixes tied to the theme rewrite) (Task 5, Task 1 respectively).
- **Placeholder scan:** none found — every step has complete, copy-pasteable code or exact before/after snippets, and Task 5's verification step gives an explicit escape hatch ("STOP and report back") rather than a vague "handle appropriately."
- **Type/name consistency:** `useTheme()`'s new return shape (`theme`, `themePreference`, `setThemePreference`) is defined once in Task 1 and consumed with the exact same names in Task 3 — no drift. `Money`'s `amount` prop is used consistently as a raw number at every new call site in Task 4, including the `avgEarningsPerDay` case, which required converting its source computation from a pre-formatted string to a number first (mirroring the exact same fix pattern already used for `SimpleDashboard.jsx`'s `weekStats.avgPerDay` in an earlier phase).
