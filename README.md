# dsh-balance-chip-cesare

[中文](#中文) | [English](#english) | [Italiano](#italiano)

---

## 中文

DeepSeek Harness（DSH）侧栏余额与消耗插件，固定在 **设置** 上方显示。除了余额和统计，还提供预算、可用天数、多币种换算、7 天会话明细、本地备份与导入。

### 功能

- **余额行**：充值余额、赠送余额、今日消耗；折叠栏显示货币符号，悬停看数字。
- **面板**：余额、赠送、可用天数、今日消耗、本月消耗、本次会话、无归属「其他」、近 7 天柱状图、会话消耗 Top 5、最近任务 4 条。
- **预算**：每日/每月预算，按币种独立；进度条和百分比，超支时面板与侧栏数字变红。
- **可用天数**：最近 7 个完整日中「有花费的天数」做分母，`总花费 ÷ 天数 = 日均`，再用余额 ÷ 日均。例：5 天共花 ¥4 → 日均 ¥0.80。
- **币种**：自动 / CNY / USD / 账户持有的其他币种；USD 始终可选，CNY 余额按缓存的参考汇率换算。
- **汇率**：CNY→USD 每周自动更新一次，也可在设置里手动刷新；走公共 Frankfurter/ECB 接口，**不消耗模型 token**，失败时保留上次汇率。
- **明细**：近 7 天按会话合计，以及每天各会话分别花了多少。从 0.7.0 起精确记录；更早的日期会用保留的任务记录还原并标注「估算」，未归属的消耗只计入日总额。
- **语言**：跟随系统 / 中文 / English / Italiano，插件内立即生效。
- **刷新**：15/30/60 秒或暂停；启动、任务结束结算、凭据变化、页面可见、手动刷新都会读取。

### 数据从哪来

余额来自 `account/getBalance`（与 设置 → 账户 相同的 Remote 命令）。DSH 没有按会话计费的查询接口，所以消耗由余额变化推导：

- 每次成功读取都比较总可用余额（充值 + 赠送）；
- 下降记为消耗，归到正在运行的任务，或 20 秒结算窗口内刚结束的任务；
- 上升视为充值/赠送，不算负消耗；
- 没有任何任务可归属的下降进入「其他」，只计入日总额；
- 超过 6 小时未读取的账本视为过期基线，下次读取只重置基线，不补记未知变动。

这是近似值：Host 无法在服务端把账单归到某个会话，重叠运行的任务会算给最近开始的那个。

### 存储与隐私

账本在 `localStorage` 的 `dsh-balance-chip/stats/v1`：`days`（60 天）、`sessions`（120 个）、`sessionDays`（按天按会话，0.7.0 起）、`runs`（50 个）、`last`、`unattributed`。设置在同前缀的 `settings/v1`，汇率缓存在 `fx/v1`。

除了 `account/getBalance` 和每周一次的汇率 GET，不发起其他请求；数据不上传。导出/导入/清除统计在面板的 **设置** 里。

### 安装

```sh
pnpm add github:Cesare97/dsh-balance-chip-cesare
```

然后把它加入 profile 的 `dsh.profile.bundles`，或在 **设置 → 插件** 中安装。本地开发用 `link:` 指向源码目录。

### 开发

`lib/index.js` 是惰性的 Host 半，`lib/client.js` 是零构建的浏览器 bundle。离线检查：

```sh
node scripts/check.mjs
```

---

## English

A DeepSeek Harness (dsh) plugin that keeps the account balance, granted balance, and spend statistics in the sidebar, directly above **Settings**. It also tracks advisory budgets, estimates how many days the balance will last, converts CNY↔USD, records a seven-day per-session breakdown, and can export or restore the local ledger.

### Features

- **Sidebar row**: topped-up balance, granted balance, today's spend; a currency glyph in the collapsed rail with the figures in its tooltip.
- **Panel**: balance, granted balance, runway, today, this month, this session, unattributed spend, a 7-day strip, the top sessions, and the most recent tasks.
- **Budgets**: daily and monthly, per display currency, with progress bars and percentages; over-budget figures turn red in both the panel and the row.
- **Runway**: the last seven complete days are summed and divided by the number of days that actually spent something, then the available balance is divided by that average. Five spending days totalling ¥4 means ¥0.80/day.
- **Currency**: auto, CNY, USD, or any currency the account holds. USD is always offered; CNY amounts are converted with the cached reference rate.
- **Exchange rate**: the CNY→USD rate refreshes weekly (and on demand) from the public Frankfurter/ECB endpoint. It costs **no model tokens**; the last rate is kept when a refresh fails.
- **Details view**: per-session totals for the last seven days, plus each day's per-session split. Days recorded from 0.7.0 on are exact; older days are rebuilt from the retained task records and marked **estimated**, and unattributed spend still only appears in the day total.
- **Language**: follow the system, 中文, English, or Italiano, applied inside the plugin immediately.
- **Refresh**: 15/30/60 s or paused; reads also happen at startup, after a task settles, on credential changes, when the page becomes visible, and on the manual button.

### Where the numbers come from

Balances come from `account/getBalance`, the same Remote command the Settings → Account section uses. The Host has no per-session billing query, so spend is derived from balance movement: a decrease is spend (charged to the open run, or one that ended inside the 20 s settlement window), an increase is a top-up or grant, and a decrease with no run to charge lands in the unattributed bucket. A ledger whose last read is more than six hours old re-seeds its baseline instead of booking unknown movement.

This is an approximation by construction: overlapping runs are charged to the most recently started one, and a Platform charge that lands more than 20 s after a run ends is no longer attributed to it.

### Storage and privacy

The ledger lives in `localStorage` under `dsh-balance-chip/stats/v1` (`days`, `sessions`, `sessionDays`, `runs`, `last`, `unattributed`). Preferences live in `settings/v1` and the rate cache in `fx/v1`, under the same prefix.

Nothing leaves the machine except the balance read and the weekly rate GET. Export JSON/CSV, import JSON, and clear stats are in the panel's **Settings** tab.

### Install

```sh
pnpm add github:Cesare97/dsh-balance-chip-cesare
```

Then add it to the profile's `dsh.profile.bundles`, or install it from **Settings → Plugins**. For local development, link the checkout with `link:` instead.

### Development

`lib/index.js` is the inert Host half; `lib/client.js` is a zero-build browser bundle. Offline check:

```sh
node scripts/check.mjs
```

---

## Italiano

Un plugin per DeepSeek Harness (dsh) che mostra nella barra laterale, subito sopra **Impostazioni**, saldo, saldo bonus e statistiche di spesa. Include budget, autonomia del saldo, conversione CNY↔USD, dettaglio degli ultimi sette giorni per sessione e backup/ripristino locale.

### Funzioni

- **Riga laterale**: saldo ricaricato, saldo bonus e spesa di oggi; nella barra compressa compare il simbolo della valuta con i valori nel tooltip.
- **Pannello**: saldo, saldo bonus, autonomia, spesa di oggi, del mese, della sessione, spese non attribuite, istogramma degli ultimi 7 giorni, sessioni principali e attività recenti.
- **Budget**: giornaliero e mensile, per valuta visualizzata, con barra di avanzamento e percentuale; gli sforamenti diventano rossi nel pannello e nella riga.
- **Autonomia**: si sommano gli ultimi sette giorni completi e si divide per il numero di giorni in cui c'è stata spesa, poi si divide il saldo disponibile per quella media. Cinque giorni con 4 ¥ totali significano 0,80 ¥/giorno.
- **Valuta**: automatica, CNY, USD o qualsiasi valuta presente sull'account. USD è sempre disponibile; gli importi in CNY vengono convertiti con il cambio memorizzato.
- **Cambio**: il tasso CNY→USD si aggiorna ogni settimana (o su richiesta) dal servizio pubblico Frankfurter/BCE. Non consuma **token del modello**; in caso di errore resta l'ultimo cambio.
- **Dettaglio**: totali per sessione degli ultimi sette giorni e, per ogni giorno, la spesa di ciascuna sessione. I giorni registrati da 0.7.0 sono esatti; quelli precedenti vengono ricostruiti dai record delle attività e contrassegnati come **stimati**, mentre la spesa non attribuita resta solo nel totale giornaliero.
- **Lingua**: segui il sistema, 中文, English o Italiano, applicata subito nel plugin.
- **Aggiornamento**: 15/30/60 s oppure in pausa; si aggiorna anche all'avvio, al termine di un'attività, al cambio credenziali, quando la pagina torna visibile e con il pulsante manuale.

### Da dove arrivano i numeri

I saldi arrivano da `account/getBalance`, lo stesso comando Remote della sezione Impostazioni → Account. L'Host non espone una fatturazione per sessione, quindi la spesa è ricavata dalla variazione del saldo: una diminuzione è spesa (addebitata all'esecuzione aperta o a una terminata entro 20 s), un aumento è una ricarica o un bonus, e una diminuzione senza esecuzione finisce nelle spese non attribuite. Un saldo fermo da più di sei ore viene usato solo come nuova base.

È un'approssimazione: le esecuzioni sovrapposte vengono addebitate a quella iniziata per ultima e un addebito che arriva più di 20 s dopo la fine non viene più attribuito.

### Dati e privacy

Il registro vive in `localStorage` sotto `dsh-balance-chip/stats/v1` (`days`, `sessions`, `sessionDays`, `runs`, `last`, `unattributed`). Le preferenze stanno in `settings/v1` e il cambio in `fx/v1`, con lo stesso prefisso.

Oltre alla lettura del saldo e al controllo settimanale del cambio non parte nessuna richiesta; i dati non vengono caricati altrove. Esporta JSON/CSV, importa JSON e cancella statistiche sono nella scheda **Impostazioni** del pannello.

### Installazione

```sh
pnpm add github:Cesare97/dsh-balance-chip-cesare
```

Poi aggiungilo a `dsh.profile.bundles` del profilo, oppure installalo da **Impostazioni → Plugin**. Per lo sviluppo locale usa un collegamento `link:`.

### Sviluppo

`lib/index.js` è la metà Host inerte; `lib/client.js` è il bundle browser senza build. Verifica offline:

```sh
node scripts/check.mjs
```
