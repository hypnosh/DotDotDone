## Quick Orientation

This repo is a small React + Vite PWA for planning and executing tasks (DotDotDone).
Key folders: `src/components/` (UI pieces grouped by feature), `src/pages/` (Home/Plan/Do),
`src/state/` (Zustand stores), `src/hooks/` (feature hooks), and `src/utils/` (helpers like `gcal.js`).

## Big-picture architecture

- **UI layer**: `src/components/*` organizes feature UIs: `Calendar/`, `Events/`, `DoMode/`, `UI/`.
- **Pages & navigation**: `src/pages/*` are mounted in `src/App.jsx`. Navigation is local state in `App` (no React Router).
- **State**: Global state uses Zustand hooks in `src/state/` (e.g. `eventsStore.js`, `calendarStore.js`). Stores export a default hook (e.g. `useEventsStore`) and expose state + mutating actions.
- **Business logic / side-effects**: Lightweight hooks live in `src/hooks/` (e.g. `useCalendarSync.js`, `useEvents.js`, `usePomodoro.js`). These orchestrate store updates and call utilities in `src/utils/`.
- **Integrations**: `src/utils/gcal.js` contains Google Calendar API helpers (currently placeholders). Vite PWA is configured in `vite.config.js`.

## Developer workflows / commands

- Install: `npm install`
- Dev server: `npm run dev` (Vite default, opens on `http://localhost:5173`)
- Build: `npm run build`
- Preview production build: `npm run preview`

No test runner is present in the repo currently; follow the above commands for local iteration and manual testing.

## Patterns & conventions agents should follow

- **Zustand stores**: import the store hook and select only what you need. Example:

```js
import useEventsStore from '../state/eventsStore';
const addEvent = useEventsStore(state => state.addEvent);
```

- **Pages vs components**: Keep page-level composition in `src/pages/*` and small, reusable UI in `src/components/*`.
- **No router assumption**: Do not introduce React Router without discussion — navigation is intentionally simple via `App` state.
- **Google Calendar integration**: `src/utils/gcal.js` holds transforms (`parseGoogleEvent`, `formatEventForGoogle`) and network helpers. If implementing OAuth, add CLIENT_ID / API_KEY into `GCAL_CONFIG` and wire `useCalendarSync` to update `src/state/calendarStore.js` (`setCalendarConnected`, etc.).

## Data shapes and examples

- App event shape (used in `parseGoogleEvent`): `{ id, title, description, start, end, isAllDay, location, source }`.
- Calendar store contains `currentDate`, `viewMode` (`'day'|'week'|'month'`), and helpers like `goToNextPeriod()` in `src/state/calendarStore.js`.

## Implementation notes and gotchas

- Many integration areas are stubbed intentionally (calendar sync, OAuth). Look at `src/utils/gcal.js` and `src/hooks/useCalendarSync.js` for TODOs and expected function signatures.
- The app uses Vite PWA (`vite-plugin-pwa`) — manifest is configured in `vite.config.js` and assets live in `public/`.
- Keep changes minimal and aligned to the existing single-page navigation model unless adding a cross-cutting feature that requires routing.

## Where to add tests and instrumentation

- Add unit tests around `utils/*` transforms (e.g. `parseGoogleEvent`) and store actions in `src/state/`.
- Add integration-like tests for `hooks/*` that mock external APIs (Google Calendar) before wiring real credentials.

## If you need to implement Google Calendar sync (practical steps)

1. Add credentials to `src/utils/gcal.js` `GCAL_CONFIG` (or use env vars and Vite definePlugin).
2. Implement `initGoogleCalendar`, `signInToGoogle`, and `fetchGoogleEvents`.
3. In `src/hooks/useCalendarSync.js`, call these utilities and update `useCalendarStore` (`setCalendarConnected`, `setEvents` via `useEventsStore`).
4. Ensure `parseGoogleEvent` maps Google event objects into the app event shape.

---
If anything here is unclear or you'd like me to expand a specific section (for example: example PR templates, testing setup, or environment variable handling), tell me which area and I will iterate.
