# dsh-balance-chip

A DeepSeek Harness (dsh) plugin that keeps the account balance, the granted
balance, and spend statistics in the sidebar, directly above **Settings**.
It also tracks advisory daily/monthly budgets, estimates how many days the
balance will last, switches the display currency, pops bottom-left notices for
pending confirmations and finished sessions, and can export or restore the local
ledger.

```
┌─────────────────────────┐
│  … sessions …           │
│                         │
│  余额            ¥10.34 │  ← this row
│  赠送 ¥2.00    今日 ¥1.23│
│  ⚙ Settings             │
└─────────────────────────┘
```

Clicking the row opens a detail panel:

```
┌──────────────────────────────┐
│ 余额与消耗         [设置][刷新] │
│ 余额                 ¥10.34   │
│ 赠送余额              ¥2.00   │
│ 可用天数              约 8 天 │
│ ──────────────────────────── │
│ 今日消耗              ¥1.23   │
│ ¥1.23 / ¥5.00          25%   │
│ ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░  │
│ 本月消耗             ¥12.40   │
│ 本次会话              ¥0.45   │
│ ──────────────────────────── │
│ 近 7 天                       │
│  ▁  ▃  ▅  ▂  ▁  ▁  ▇        │
│ 10/31 …           昨日   今日 │
│ ──────────────────────────── │
│ 会话消耗                      │
│ 重构插件包             ¥0.78  │
│ 余额统计               ¥0.45  │
│ ──────────────────────────── │
│ 最近任务                      │
│ 14:32 · 1m 20s 余额统计 ¥0.12 │
│ 14:05 · 42s 重构插件包  ¥0.08 │
└──────────────────────────────┘
```

## What it shows

- **Topped-up balance** (`normal_wallets`) and **granted balance**
  (`bonus_wallets`), formatted the way Platform's own account page does
  (`¥0.00`, `<¥0.01`, grouped thousands, truncated sub-cent precision).
- **Today's spend** in the row; per-day, per-session, and per-task figures in
  the panel, plus a 7-day strip and a running month total.
- **Budgets** (daily and monthly, per display currency) with a progress bar;
  over-budget figures turn red in both the panel and the row.
- **Runway**: available balance divided by the average spend of the days that
  actually spent money in the last seven complete days, shown as an
  approximate number of days (five spending days totalling ¥4 means ¥0.80/day).
- **Currency switch** in Settings: auto (first wallet) or any currency the
  account currently holds; budgets are kept per currency.
- **Notices**: a bottom-left toast appears when a session needs confirmation
  (approval, question, plan review) or a background session finishes. Each
  toast can be closed by hand and disappears on its own after five seconds.
- In the collapsed rail the row becomes a currency glyph whose tooltip carries
  the figures; the panel still opens from it.

When the account is signed out nothing is rendered.

## Where the numbers come from

Balances come from `account/getBalance` — the same Remote command the
Settings → Account section uses. The Host exposes **no per-session billing
query**, so spend is derived from balance movement:

- Every successful read compares the **total available balance**
  (topped-up + granted) with the previous reading.
- A **decrease** is spend. It is charged to the run that is open, or to a run
  that ended within the settlement window (Platform books charges shortly after
  a request completes), and recorded per day, per session, and per run. When no
  run event was seen (the plugin loaded mid-task), the session the Host reports
  as running takes the charge.
- An **increase** is a top-up or grant and is never counted as negative spend.
- A decrease observed with no run to charge (another client on the same
  account, or a long-idle period) lands in an *unattributed* bucket that only
  the day total includes; the panel shows it as **其他** while it is non-zero.
- A ledger whose last reading is more than six hours old is treated as a stale
  baseline: the new reading re-seeds the baseline instead of booking unknown
  movement into today.

This is an approximation by construction — the Host cannot attribute a charge
to a session on the server side. Runs that overlap in time are charged to the
most recently started one, and a Platform charge that lands more than 20 s after
a run ends is no longer attributed to it.

The refresh triggers are unchanged: startup, every finished task, credential
changes, the page becoming visible, the configured poll, and the panel's refresh
button. The poll interval is selectable in Settings (15 s / 30 s / 60 s) or can
be paused; pausing stops the timer and the visibility refresh, while manual
refreshes and the post-task settlement reads still run. A finished task
additionally re-reads at +1.5 s, +5 s, and +12 s so settlement is attributed to
it.

## Storage

The ledger lives in the page's `localStorage` under
`dsh-balance-chip/stats/v1` (renderer-local, survives app restarts):

| Field | Contents |
|---|---|
| `days` | per-day spend by currency, 60 days |
| `sessions` | per-session spend by currency, 120 most recent |
| `runs` | the 50 most recent tasks with start, end, and spend |
| `last` | the balance baseline the next read is compared against |
| `unattributed` | spend with no run to charge |

Deleting that key resets the statistics. The ledger never leaves the machine.

Preferences live under `dsh-balance-chip/settings/v1`:

| Field | Contents |
|---|---|
| `budgets.daily` | daily budget per currency, e.g. `{ "CNY": 5 }` |
| `budgets.monthly` | monthly budget per currency |
| `refreshMs` | poll interval: `15000`, `30000`, `60000`, or `0` (paused) |
| `currency` | explicit display currency, or `null` for the first wallet |

Both keys are sanitized on read: unknown versions, malformed budgets, and
unlisted intervals fall back to defaults instead of breaking the row.

## Budgets, runway, and backups

The panel's **设置** tab edits the display currency, budgets, and the refresh
interval, and holds the local data tools:

- **Export JSON** downloads `dsh-balance-chip-YYYY-MM-DD.json`, containing the
  ledger and preferences. Use it to move statistics between machines or to keep
  a snapshot before clearing.
- **Export CSV** downloads `dsh-balance-chip-YYYY-MM-DD.csv`
  (`date,currency,spend`, UTF-8 BOM) for spreadsheets.
- **Import JSON** replaces the current ledger with a backup. Invalid or
  unsupported files are rejected without touching the existing data.
- **Clear local stats** wipes the ledger after a second confirming click and
  keeps the budgets.

Budgets are advisory: they never block a run and never call the network. The
runway uses seven complete days so a half-finished day cannot skew the
estimate, then divides the window total by the number of days that actually
spent something — a week with five spending days and ¥4 total burns ¥0.80/day.
When the past week has no spend it falls back to the last seven days including
today, and shows `—` when there is nothing to average.

## Notices

The plugin mirrors the Host's session status projection (`uiSession`) and shows
a toast in the bottom-left corner for two events:

- **待确认** — a session gained a pending interaction: an approval, a user
  question, or a plan review. Pending interactions in the session you are
  already viewing are skipped, because the card is on screen.
- **会话完成** — a background session finished while you were looking
  elsewhere (`completionUnread`).

Each toast names the session, can be dismissed with its ×, and closes itself
after five seconds. At most three stack at once; notices never call the network
and are not persisted.

## Install

The package is a dsh *bundle*: `dsh.bundle.patch` mounts one Loader row, and the
row's `dsh.client` declaration is what makes the browser bundle part of the Web
boot graph.

From GitHub, in the profile directory (`~/.dsh/profiles/desktop`):

```sh
pnpm add github:Cesare97/dsh-balance-chip
```

then add the bundle to `package.json` `dsh.profile.bundles` (or install it
through Settings → Plugins). With HMR enabled the row appears without a restart.

For local development, link the checkout instead:

```sh
pnpm add link:/absolute/path/to/dsh-balance-chip
```

## Layout contract

The row renders into the root-scoped **`sidebar.footer.action`** list slot
(`{ wide }` props), which `@deepseek-ai/dsh-client-ui-sidebar` mounts between the
workspace region and the bottom-pinned `sidebar.settings` seat. The panel is
portalled into `document.body` and positioned from the row's bounding box, so no
sidebar clip or transform can contain it. Styling reuses the sidebar's own custom
properties (`--dsh-sidebar-row-padding`, `--dsh-sidebar-paint-inset`) and theme
aliases, so it follows the column width, collapse animation, and light/dark
palettes.

## Development

Both halves are plain JavaScript with no build step:

- `lib/index.js` — inert Host half; it exists so the package can be a Loader
  entry (the boot graph is composed from enabled Loader rows).
- `lib/client.js` — lazy-CJS browser bundle
  (`window.__ModuleLoader__.load({ id, factory })`).

An offline check drives `apply`, slot registration, the row, the panel, the
settings form, the ledger, budgets, runway, currency selection, notices, and
CSV/JSON round-trips with stubbed `window`/`document`/React, so formatting,
attribution, and state paths are verifiable without a browser:

```sh
node scripts/check.mjs
```

`ELECTRON_RUN_AS_NODE=1 "<app>" scripts/check.mjs` still works if Node is not
installed separately.

Rebuild-free edits still need the client bundle re-served: toggle the plugin on
the Plugins page (or reload the page). The profile installs the source tree with
a `link:` dependency, so a moved or deleted directory breaks the install.
