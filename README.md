# dsh-balance-chip

A DeepSeek Harness (dsh) plugin that keeps the account balance, the granted
balance, and spend statistics in the sidebar, directly above **Settings**.

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
│ 余额与消耗              [刷新] │
│ 余额                 ¥10.34   │
│ 赠送余额              ¥2.00   │
│ ──────────────────────────── │
│ 今日消耗              ¥1.23   │
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
  the panel, plus a 7-day strip.
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
changes, the page becoming visible, a 30 s poll, and the panel's refresh button.
A finished task additionally re-reads at +1.5 s, +5 s, and +12 s so settlement
is attributed to it.

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

An offline check drives `apply`, slot registration, the row, the panel, and the
spend ledger with stubbed `window`/`document`/React, so formatting, attribution,
and state paths are verifiable without a browser:

```sh
ELECTRON_RUN_AS_NODE=1 \
  "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness" \
  scripts/check.mjs
```

Rebuild-free edits still need the client bundle re-served: toggle the plugin on
the Plugins page (or reload the page). The profile installs the source tree with
a `link:` dependency, so a moved or deleted directory breaks the install.
