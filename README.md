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

### Backups and restores

Use **Settings → Download backup** to save a human-readable, pretty-printed JSON file with a date-based filename. A backup contains an explicit backup format and version, its export timestamp, the complete application configuration, timer state and running timestamp, the current random exercise offer, and all workout history still retained by the app (including original local date keys and event timestamps).

**Restore backup** accepts `.json`/`application/json` files and asks for confirmation before replacing anything. The whole document is parsed and validated with the application state schema before it is written; malformed JSON, invalid configuration or event records, duplicate event IDs, unsupported backup/state versions, invalid timestamps, and persistence failures leave the existing state unchanged and display an error. Restored events keep their recorded local dates and timestamps, so the “Completed today” view continues to use only the current local date key rather than the restore date. Normal 366-day retention is applied at restore time.

A running timer is reconstructed at the restore time: elapsed time through the backup export and the time since export are both deducted. Future export timestamps and timer start timestamps later than the export are rejected, preventing clock anomalies from adding time. Paused timers are restored exactly. Backup format version `1` is supported; backups with other format versions or incompatible application state versions are rejected rather than partially migrated.

## Configuration and streak rule

Settings allow positive daily targets, reward minutes, non-negative group weights, names, newline-separated exercises, and an explicit display classification. Every group is either assigned one or more supported body regions or marked **non-body** (useful for stretching, balance, and prehab). Newly added groups start as non-body so the app never guesses anatomy from a name. The defaults target 18 exercises and award 30 minutes. Upper legs has weight 2; all other groups have weight 1.

Each history entry captures the target applicable on that day. A streak counts consecutive days that reached their saved target. An incomplete current day is a grace day: it does not break a streak ending yesterday. Once today reaches its target, today is included.

## Four-day workload heatmap

The heatmap is computed independently of the DOM in `src/heatmap.js`. Only the current local calendar day and its previous three days are included. Their age multipliers are respectively **1, 0.7, 0.4, and 0.2**; future records and records at least four days old contribute nothing.

For each completed set:

```text
set workload = repetitions × speed factor × load factor
speed factor = slow 0.8, normal 1, plyometric 1.25
load factor = 1 + entered weight / 100
group contribution = set workload × recency multiplier / selection weight
```

Entered weight zero means bodyweight and deliberately uses the neutral load factor **1**. A configured selection weight of zero also uses a neutral divisor of **1**, avoiding division by zero (and the selection engine does not randomly offer that group). If a body group maps to several regions, its normalized contribution is divided evenly among them.

Group scores are normalized against the largest active group contribution in the four-day window. A score below **1/3** is **fresh/green**, a score from **1/3 up to 2/3** is **moderate/orange**, and a score at or above **2/3** is **high/red**. A group without recent workload has score zero and is fresh/green. The diagram and non-body cards use these same states, with labels plus distinct solid, striped, and dotted treatments so meaning does not depend on red/green color perception.

## Project structure

- `src/main.js` renders the UI and wires interactions.
- `src/state.js` owns transitions, validation, persistence, history, and streaks.
- `src/backup.js` owns versioned JSON export, strict import validation, timer restoration, and backup filenames.
- `src/timer.js` implements timestamp-based timer behavior.
- `src/selection.js` implements weighted selection.
- `src/date.js` and `src/stats.js` provide local-day retention and chart series.
- `src/chart.js` draws the dependency-free canvas chart.
- `src/heatmap.js` performs deterministic workload scoring and classification.
- `src/body.svg` provides the accessible, repository-owned front/back diagram.
- `src/defaults.js` contains default configuration.
- `test/` contains focused Node unit tests.
