# Wesley’s House of Pain

A local-first workout timer and exercise picker. It uses a weighted group draw followed by a uniform exercise draw, rewards completed sets with extra timer time, and visualizes a year of consistency.

## Start locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Run `npm test` for unit tests or `npm run build` for a production bundle.

## Persistence and reset

The app stores a versioned document under `whop-state` in browser `localStorage`. It includes configuration, the selected exercise, timer seconds/running timestamp, and daily history with totals and per-exercise counts. A running timer is derived from its saved start timestamp, so reloads and inactive tabs do not pause it. Malformed or incompatible data falls back to safe defaults. History is pruned to the latest 366 days.

Use **Settings → Reset all saved data** to restore defaults after a confirmation. Clearing this site's browser storage has the same effect.

## Configuration and streak rule

Settings allow positive daily targets, reward minutes, group weights, names, and newline-separated exercises. The defaults target 18 exercises and award 30 minutes. Upper legs has weight 2; all other groups have weight 1.

Each history entry captures the target applicable on that day. A streak counts consecutive days that reached their saved target. An incomplete current day is a grace day: it does not break a streak ending yesterday. Once today reaches its target, today is included.

## Project structure

- `src/main.js` renders the UI and wires interactions.
- `src/state.js` owns transitions, validation, persistence, history, and streaks.
- `src/timer.js` implements timestamp-based timer behavior.
- `src/selection.js` implements weighted selection.
- `src/date.js` and `src/stats.js` provide local-day retention and chart series.
- `src/chart.js` draws the dependency-free canvas chart.
- `src/defaults.js` contains default configuration.
- `test/` contains focused Node unit tests.
