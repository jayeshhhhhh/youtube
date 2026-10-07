# Centralized Theme System Design Plan

## 1. Objective
Implement a centralized theme system that manages Light/Dark/Auto modes with a specific IST-based automatic switch (10 AM - 12 PM Light, otherwise Dark).

## 2. Architecture Overview
- **`ThemeContext.tsx`**: Central source of truth. Manages the active theme (`light`|`dark`) and the user preference (`light`|`dark`|`auto`). Handles IST logic and DOM updates.
- **`AuthContext.js`**: Synchronization layer. Pushes `user.preferredTheme` from MongoDB to `ThemeContext` upon login or session restore.
- **`globals.css`**: Styling layer. Uses `.dark` class on `<html>` to toggle OKLCH CSS variables.

## 3. Implementation Details

### 3.1 `ThemeContext.tsx` Refactoring
- **State Management**:
  - `theme`: The currently applied theme (`"light" | "dark"`).
  - `preference`: The user's selected mode (`"light" | "dark" | "auto"`).
- **IST Time Logic**:
  - Refine `getAutoTheme()` to strictly follow:
    - `10:00 AM` to `11:59 AM IST` $\rightarrow$ `light`
    - `12:00 PM` to `09:59 AM IST` (next day) $\rightarrow$ `dark`
  - Use `Intl.DateTimeFormat` with `timeZone: "Asia/Kolkata"` to ensure correctness regardless of user's local machine time.
- **Automatic Updates**:
  - Implement a timer (e.g., every 1 minute) that checks if the theme needs to transition when `preference === 'auto'`.
- **DOM Manipulation**:
  - `applyTheme(theme)`:
    - Remove both `.light` and `.dark` from `<html>`.
    - Add the active theme class.
    - Set `document.documentElement.style.colorScheme` for browser-level consistency.
- **Persistence**:
  - Sync `preference` to `localStorage` (`app-theme`).

### 3.2 `AuthContext.js` Synchronization
- **Clean-up**:
  - Remove duplicate theme logic (like `changeTheme` implementing its own `toggleTheme` calls if they overlap with `ThemeContext`'s capabilities).
  - Ensure `login` calls `toggleTheme(user.preferredTheme || "auto")` from `ThemeContext`.
  - Ensure `logout` resets theme to `"auto"` and clears `app-theme` from `localStorage`.
- **User Updates**:
  - `changeTheme` should call `ThemeContext.toggleTheme(selectedTheme)` and then perform the `PATCH` request to MongoDB.

### 3.3 `globals.css` Cleanup
- Verify that no `@media (prefers-color-scheme: dark)` blocks exist.
- Ensure all theme-dependent colors are defined under `:root` (light) and `.dark` (dark).

## 4. Step-by-Step Implementation Plan

1. **`ThemeContext.tsx` Update**:
   - Update `ThemeMode` and `ThemeContextType` to include `preference`.
   - Rewrite `getAutoTheme` for strict IST boundaries.
   - Implement `ThemeProvider` logic:
     - Initial load: `localStorage` $\rightarrow$ `preference` $\rightarrow$ `theme`.
     - Interval timer for `auto` theme switching.
     - `toggleTheme(mode)` function to handle both state and persistence.
2. **`AuthContext.js` Update**:
   - Refactor `login` and `useEffect` (session restore) to use the new `toggleTheme` from `ThemeContext`.
   - Refactor `changeTheme` to separate local state update from API call.
   - Ensure `logout` clears theme state.
3. **`globals.css` Audit**:
   - Remove any remaining `prefers-color-scheme` queries.
4. **Verification**:
   - Mock system time to 09:59 AM IST $\rightarrow$ Dark.
   - Mock system time to 10:00 AM IST $\rightarrow$ Light.
   - Mock system time to 11:59 AM IST $\rightarrow$ Light.
   - Mock system time to 12:00 PM IST $\rightarrow$ Dark.
   - Test Manual $\rightarrow$ Auto transition.
   - Test Login $\rightarrow$ Theme sync from DB.

## 5. Critical Files
- `yourtube/src/context/ThemeContext.tsx`
- `yourtube/src/lib/AuthContext.js`
- `yourtube/src/styles/globals.css`
EOF`
