// Browser half of dsh-balance-chip-cesare.
//
// One row into the root-scoped `sidebar.footer.action` list slot, which the
// sidebar shell mounts directly above its bottom-pinned Settings row. The row
// shows the topped-up and granted balances, and — because the Host exposes no
// per-session billing query — keeps a local ledger of balance deltas so it can
// report spend per session, per task (one agent run), and per day.
//
// Attribution model: every successful read of `account/getBalance` compares the
// total available balance (topped-up + granted) with the previous reading. A
// decrease is spend; an increase is a top-up or grant and is never counted as
// negative spend. A decrease is charged to the run that is open, or to the run
// that ended within the settlement window (Platform books charges shortly after
// a request completes); anything else lands in an unattributed bucket that only
// the day total includes. This is an approximation by construction: spend from
// another client on the same account is indistinguishable from local spend.
//
// Hand-written in the lazy-CJS bundle protocol (`window.__ModuleLoader__.load`
// with a factory returning cordis-plugin exports), the same zero-build stance
// as other out-of-tree dsh client bundles. React, react-dom, and the primitives
// module come from the shell's shared module table.
window.__ModuleLoader__.load({
  id: 'dsh-balance-chip-cesare',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var React = null
    try {
      React = require('react')
    } catch (error) {
      console.error('[balance-chip] react is unavailable', error)
    }

    var ReactDOM = null
    try {
      ReactDOM = require('react-dom')
    } catch (error) {
      ReactDOM = null
    }

    // The Tooltip is a nicety, not a requirement: without it the rail row falls
    // back to the native title attribute.
    var primitives = null
    try {
      primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    } catch (error) {
      primitives = null
    }
    var Tooltip = primitives && typeof primitives.Tooltip === 'function' ? primitives.Tooltip : null

    var h = React === null ? null : React.createElement

    /** Dictionary namespace owned by this plugin. */
    var NS = 'balance-chip'

    var zh = {
      label: '余额',
      bonus: '赠送',
      bonusBalance: '赠送余额',
      today: '今日',
      todaySpend: '今日消耗',
      sessionSpend: '本次会话',
      sessions: '会话消耗',
      tasks: '最近任务',
      other: '其他',
      week: '近 7 天',
      yesterday: '昨日',
      untitled: '未命名会话',
      noData: '暂无消耗记录',
      unavailable: '暂不可用',
      stale: '上次刷新失败',
      updated: '更新于',
      refresh: '刷新',
      detail: '余额与消耗',
      month: '本月消耗',
      runway: '可用天数',
      days: '天',
      approx: '约',
      avgDaily: '近 7 天日均',
      settings: '设置',
      back: '返回',
      breakdown: '明细',
      weekBySession: '近 7 天 · 按会话',
      byDay: '按天 · 每个会话',
      noSessionSpend: '暂无会话明细',
      dailyBudget: '每日预算',
      monthlyBudget: '每月预算',
      budgetUnset: '不限',
      budgetInvalid: '预算需为正数',
      refreshInterval: '刷新间隔',
      currency: '显示币种',
      auto: '自动',
      language: '语言',
      followSystem: '跟随系统',
      exchangeRate: '汇率',
      refreshRate: '刷新',
      fxDefault: '默认汇率（未联网）',
      off: '暂停',
      seconds: '秒',
      exportJson: '导出 JSON',
      exportCsv: '导出 CSV',
      importJson: '导入 JSON',
      clearStats: '清除本地统计',
      confirmClear: '确认清除？',
      cleared: '已清除本地统计',
      imported: '已导入',
      importFailed: '导入失败',
      exportFailed: '导出失败',
      exported: '已导出',
      saved: '已保存',
      daysUnit: '天记录',
    }

    var en = {
      label: 'Balance',
      bonus: 'Granted',
      bonusBalance: 'Granted balance',
      today: 'Today',
      todaySpend: 'Spent today',
      sessionSpend: 'This session',
      sessions: 'Spend by session',
      tasks: 'Recent tasks',
      other: 'Other',
      week: 'Last 7 days',
      yesterday: 'Yesterday',
      untitled: 'Untitled session',
      noData: 'No spend recorded yet',
      unavailable: 'Unavailable',
      stale: 'Last refresh failed',
      updated: 'Updated',
      refresh: 'Refresh',
      detail: 'Balance and spend',
      month: 'This month',
      runway: 'Runway',
      days: 'days',
      approx: 'about',
      avgDaily: '7-day average',
      settings: 'Settings',
      back: 'Back',
      breakdown: 'Details',
      weekBySession: 'Last 7 days · by session',
      byDay: 'By day · each session',
      noSessionSpend: 'No per-session data yet',
      dailyBudget: 'Daily budget',
      monthlyBudget: 'Monthly budget',
      budgetUnset: 'none',
      budgetInvalid: 'Budget must be positive',
      refreshInterval: 'Refresh interval',
      currency: 'Currency',
      auto: 'Auto',
      language: 'Language',
      followSystem: 'Follow system',
      exchangeRate: 'Rate',
      refreshRate: 'Refresh',
      fxDefault: 'Default rate (offline)',
      off: 'Paused',
      seconds: 's',
      exportJson: 'Export JSON',
      exportCsv: 'Export CSV',
      importJson: 'Import JSON',
      clearStats: 'Clear local stats',
      confirmClear: 'Confirm clear?',
      cleared: 'Local stats cleared',
      imported: 'Imported',
      importFailed: 'Import failed',
      exportFailed: 'Export failed',
      exported: 'Exported',
      saved: 'Saved',
      daysUnit: 'day(s)',
    }

    var it = {
      label: 'Saldo',
      bonus: 'Bonus',
      bonusBalance: 'Saldo bonus',
      today: 'Oggi',
      todaySpend: 'Speso oggi',
      sessionSpend: 'Questa sessione',
      sessions: 'Spesa per sessione',
      tasks: 'Attività recenti',
      other: 'Altro',
      week: 'Ultimi 7 giorni',
      yesterday: 'Ieri',
      untitled: 'Sessione senza titolo',
      noData: 'Nessuna spesa registrata',
      unavailable: 'Non disponibile',
      stale: 'Ultimo aggiornamento non riuscito',
      updated: 'Aggiornato',
      refresh: 'Aggiorna',
      detail: 'Saldo e spese',
      month: 'Questo mese',
      runway: 'Autonomia',
      days: 'giorni',
      approx: 'circa',
      avgDaily: 'Media 7 giorni',
      settings: 'Impostazioni',
      back: 'Indietro',
      breakdown: 'Dettagli',
      weekBySession: 'Ultimi 7 giorni · per sessione',
      byDay: 'Per giorno · ogni sessione',
      noSessionSpend: 'Nessun dettaglio per sessione',
      dailyBudget: 'Budget giornaliero',
      monthlyBudget: 'Budget mensile',
      budgetUnset: 'nessuno',
      budgetInvalid: 'Il budget deve essere positivo',
      refreshInterval: 'Intervallo di aggiornamento',
      currency: 'Valuta',
      auto: 'Automatico',
      language: 'Lingua',
      followSystem: 'Segui il sistema',
      exchangeRate: 'Cambio',
      refreshRate: 'Aggiorna',
      fxDefault: 'Cambio predefinito (offline)',
      off: 'In pausa',
      seconds: 's',
      exportJson: 'Esporta JSON',
      exportCsv: 'Esporta CSV',
      importJson: 'Importa JSON',
      clearStats: 'Cancella statistiche locali',
      confirmClear: 'Confermi?',
      cleared: 'Statistiche locali cancellate',
      imported: 'Importato',
      importFailed: 'Importazione non riuscita',
      exportFailed: 'Esportazione non riuscita',
      exported: 'Esportato',
      saved: 'Salvato',
      daysUnit: 'giorni',
    }

    var DICTS = { zh: zh, en: en, it: it }
    var LOCALE_CODES = ['zh', 'en', 'it']

    var CURRENCY_SYMBOL = { CNY: '¥', USD: '$' }
    var CURRENCY_ORDER = ['CNY', 'USD']

    /** Refresh cadence and the floor between two network reads. */
    var POLL_INTERVAL_MS = 30_000
    var MIN_REFRESH_GAP_MS = 4_000
    /** Allowed automatic refresh intervals; 0 pauses polling entirely. */
    var REFRESH_CHOICES = [15_000, 30_000, 60_000, 0]

    /** A charge may be booked after the run reports idle; keep charging it. */
    var SETTLE_WINDOW_MS = 20_000
    var SETTLE_READS = [1_500, 5_000, 12_000]

    /** Sent as the requesting UI identity, as every Platform-touching call requires. */
    var CLIENT_VERSION = '0.7.1'

    var STORAGE_KEY = 'dsh-balance-chip/stats/v1'
    var SETTINGS_KEY = 'dsh-balance-chip/settings/v1'
    var FX_KEY = 'dsh-balance-chip/fx/v1'
    /** Free, key-less ECB reference rates; no model tokens are involved. */
    var FX_URL = 'https://api.frankfurter.dev/v1/latest?from=CNY&to=USD'
    var FX_TTL_MS = 7 * 86_400_000
    var FX_RETRY_MS = 86_400_000
    var FX_DEFAULT_RATE = 0.15
    var KEEP_DAYS = 60
    var KEEP_SESSIONS = 120
    var KEEP_RUNS = 50

    var CSS_TAG_ID = 'dsh-balance-chip-cesare/BalanceChip.module.css'

    var CSS =
      '.bc_row{box-sizing:border-box;flex:none;display:flex;width:100%;min-width:0;margin:2px 0 2px}' +
      '.bc_row[data-rail="true"]{justify-content:center;width:36px;margin:6px 0 8px}' +
      '.bc_button{box-sizing:border-box;display:flex;align-items:center;gap:8px;' +
      'width:100%;min-width:0;min-height:36px;margin:0;padding:5px calc(var(--dsh-sidebar-row-padding,12px) - var(--dsh-sidebar-paint-inset,3px));' +
      'border:0;border-inline:var(--dsh-sidebar-paint-inset,3px) solid transparent;border-radius:var(--dsw-radius-md,8px);' +
      'background:transparent;background-clip:padding-box;color:var(--dsw-alias-label-primary,#1a1a1a);' +
      'font-family:inherit;font-size:13px;line-height:20px;text-align:left;cursor:pointer;' +
      '-webkit-appearance:none;appearance:none}' +
      '@media (hover:hover){.bc_button:hover{background-color:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}}' +
      '.bc_button:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,currentColor);outline-offset:2px}' +
      '.bc_rows{display:flex;flex-direction:column;gap:1px;flex:1;min-width:0}' +
      '.bc_line{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-width:0}' +
      '.bc_line[data-dim="true"] .bc_val{color:var(--dsw-alias-label-tertiary,#8a8a8a);font-weight:400}' +
      '.bc_meta{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-width:0;' +
      'font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary,#8a8a8a)}' +
      '.bc_key{flex:none;white-space:nowrap;color:var(--dsw-alias-label-tertiary,#8a8a8a)}' +
      '.bc_val{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums}' +
      '.bc_line .bc_key{font-size:13px}' +
      '.bc_line .bc_val{font-size:13px;font-weight:500;letter-spacing:.01em}' +
      '.bc_meta .bc_val{color:var(--dsw-alias-label-secondary,#5a5a5a)}' +
      '.bc_group{display:inline-flex;align-items:baseline;gap:5px;min-width:0}' +
      '.bc_button[data-phase="stale"] .bc_val{opacity:.6}' +
      '.bc_button[data-phase="loading"] .bc_val{opacity:.55}' +
      '.bc_railButton{justify-content:center;width:36px;min-height:36px;padding:0;border-inline:0;background-clip:border-box;' +
      'color:var(--dsw-alias-label-tertiary,#8a8a8a)}' +
      '.bc_railGlyph{font-size:13px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums}' +
      '.bc_railButton[data-phase="ready"] .bc_railGlyph{color:var(--dsw-alias-label-primary,#1a1a1a)}' +
      '.bc_railButton[data-phase="stale"] .bc_railGlyph{opacity:.6}' +
      // Detail popover: portalled into <body> so no sidebar clip or transform
      // can contain it.
      '.bpc_panel{position:fixed;z-index:1200;box-sizing:border-box;padding:14px;overflow:auto;' +
      'border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08));border-radius:var(--dsw-radius-lg,12px);' +
      'background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,#1a1a1a);' +
      'box-shadow:var(--dsw-elevation-prominent,0 12px 32px rgba(0,0,0,.18));' +
      'font-family:inherit;font-size:13px;line-height:20px}' +
      '.bpc_head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}' +
      '.bpc_title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600}' +
      '.bpc_refresh{box-sizing:border-box;flex:none;height:24px;padding:0 10px;white-space:nowrap;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.16));' +
      'border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font-family:inherit;font-size:12px;cursor:pointer}' +
      '@media (hover:hover){.bpc_refresh:hover{background-color:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}}' +
      '.bpc_refresh:disabled{opacity:.5;cursor:default}' +
      '.bpc_iconButton{padding:0 6px;font-size:13px;line-height:22px}' +
      '.bpc_row{display:flex;align-items:baseline;justify-content:space-between;gap:12px;min-height:22px}' +
      '.bpc_label{color:var(--dsw-alias-label-tertiary,#8a8a8a);white-space:nowrap}' +
      '.bpc_value{font-variant-numeric:tabular-nums;font-weight:500;white-space:nowrap}' +
      '.bpc_div{border-top:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08));margin:10px 0}' +
      '.bpc_heading{margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-tertiary,#8a8a8a)}' +
      '.bpc_bars{display:flex;align-items:flex-end;gap:6px;margin-top:6px}' +
      '.bpc_bar{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}' +
      '.bpc_barTrack{display:flex;align-items:flex-end;width:100%;height:38px}' +
      '.bpc_barFill{width:100%;min-height:2px;border-radius:3px;background:var(--dsw-alias-state-business-primary,#4d6bfe);opacity:.35}' +
      '.bpc_barFill[data-today="true"]{opacity:.9}' +
      '.bpc_barFill[data-empty="true"]{background:var(--dsw-alias-border-l2,rgba(0,0,0,.08));opacity:1}' +
      '.bpc_barLabel{font-size:10px;line-height:12px;color:var(--dsw-alias-label-tertiary,#8a8a8a);white-space:nowrap}' +
      '.bpc_list{display:flex;flex-direction:column;gap:1px}' +
      '.bpc_item{display:flex;align-items:baseline;justify-content:space-between;gap:10px;min-width:0;min-height:21px}' +
      '.bpc_name{color:var(--dsw-alias-label-secondary,#5a5a5a);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.bpc_meta{flex:none;color:var(--dsw-alias-label-tertiary,#8a8a8a);font-size:11px}' +
      '.bpc_empty{color:var(--dsw-alias-label-tertiary,#8a8a8a);padding:2px 0}' +
      '.bpc_days{display:flex;flex-direction:column;gap:7px}' +
      '.bpc_dayGroup{display:flex;flex-direction:column;gap:1px}' +
      '.bpc_dayHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:12px;font-weight:600}' +
      '.bpc_dayLabel{color:var(--dsw-alias-label-secondary,#5a5a5a)}' +
      '.bpc_dayTotal{font-variant-numeric:tabular-nums}' +
      '.bpc_dayItem{padding-left:10px}' +
      '.bpc_dayEmpty{padding-left:10px;font-size:11px}' +
      '.bpc_foot{display:flex;justify-content:space-between;gap:8px;margin-top:10px;font-size:11px;color:var(--dsw-alias-label-tertiary,#8a8a8a)}' +
      '.bc_group[data-over="true"] .bc_val{color:var(--dsw-alias-state-error-primary,#d14343)}' +
      '.bpc_headActions{display:flex;align-items:center;gap:6px;flex:none}' +
      '.bpc_progressMeta{display:flex;justify-content:space-between;gap:8px;margin:2px 0 3px;font-size:11px;' +
      'color:var(--dsw-alias-label-tertiary,#8a8a8a);font-variant-numeric:tabular-nums}' +
      '.bpc_progressMeta[data-over="true"]{color:var(--dsw-alias-state-error-primary,#d14343)}' +
      '.bpc_progress{height:4px;margin:0 0 7px;border-radius:2px;overflow:hidden;' +
      'background:var(--dsw-alias-border-l2,rgba(0,0,0,.08))}' +
      '.bpc_progressFill{height:100%;border-radius:2px;background:var(--dsw-alias-state-business-primary,#4d6bfe);opacity:.7}' +
      '.bpc_progressFill[data-over="true"]{background:var(--dsw-alias-state-error-primary,#d14343);opacity:.9}' +
      '.bpc_form{display:flex;flex-direction:column;gap:10px;margin-top:2px}' +
      '.bpc_field{display:flex;flex-direction:column;gap:4px;min-width:0}' +
      '.bpc_fieldLabel{font-size:11px;color:var(--dsw-alias-label-tertiary,#8a8a8a)}' +
      '.bpc_input,.bpc_select{box-sizing:border-box;width:100%;height:28px;padding:0 8px;' +
      'border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.16));border-radius:var(--dsw-radius-sm,6px);' +
      'background:transparent;color:inherit;font-family:inherit;font-size:12px}' +
      '.bpc_input:focus-visible,.bpc_select:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,currentColor);outline-offset:1px}' +
      '.bpc_actions{display:flex;flex-wrap:wrap;gap:6px}' +
      '.bpc_action{flex:1 1 42%;min-width:96px}' +
      '.bpc_status{min-height:15px;font-size:11px;color:var(--dsw-alias-label-tertiary,#8a8a8a)}' +
      '.bpc_status[data-error="true"]{color:var(--dsw-alias-state-error-primary,#d14343)}' +
      '.bpc_rateBox{display:flex;flex-direction:column;gap:1px;min-width:0}' +
      '.bpc_rateLine{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;min-height:24px}' +
      '.bpc_rate{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;' +
      'font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#5a5a5a)}' +
      '.bpc_rateDate{font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary,#8a8a8a);' +
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'

    /** Install this plugin's styles once per document. */
    function injectCss() {
      if (typeof document === 'undefined') return
      var selector = 'style[data-plugin-css=' + JSON.stringify(CSS_TAG_ID) + ']'
      if (document.querySelector(selector) !== null) return
      var tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-balance-chip-cesare'
      tag.dataset.pluginCss = CSS_TAG_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    /**
     * A minimal external store: the sidebar row reads it through
     * `useSyncExternalStore`, so `getSnapshot` must return the same object until
     * something changes.
     * @param initial - first snapshot.
     * @returns `{ getSnapshot, subscribe, set }`.
     */
    function createStore(initial) {
      var value = initial
      var listeners = new Set()
      return {
        getSnapshot: function () {
          return value
        },
        subscribe: function (listener) {
          listeners.add(listener)
          return function () {
            listeners.delete(listener)
          }
        },
        set: function (next) {
          if (Object.is(next, value)) return
          value = next
          var snapshot = Array.from(listeners)
          for (var i = 0; i < snapshot.length; i++) {
            try {
              snapshot[i]()
            } catch (error) {
              console.error('[balance-chip] store listener failed', error)
            }
          }
        },
      }
    }

    /** @param currency - Platform wallet currency code. @returns its display symbol. */
    function symbolOf(currency) {
      return CURRENCY_SYMBOL[currency] || String(currency || 'CNY')
    }

    /** Group the integer part of a fixed-point string with commas. */
    function groupThousands(text) {
      var parts = String(text).split('.')
      var grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      return parts.length > 1 ? grouped + '.' + parts[1] : grouped
    }

    /**
     * Platform two-decimal display rule: sub-cent amounts stay readable instead
     * of rounding away, and precision beyond cents is truncated, not rounded up.
     * @param raw - decimal string a Platform wallet carries (or a number).
     * @param currency - its currency code.
     * @returns signed, grouped currency text.
     */
    function formatMoney(raw, currency) {
      var symbol = symbolOf(currency)
      var value = Number(raw)
      if (!isFinite(value)) return symbol + String(raw)
      if (value === 0) return symbol + '0.00'
      if (value < 0) {
        var magnitude = Math.abs(value)
        if (magnitude < 0.01) return '-' + symbol + '0.01'
        return '-' + symbol + groupThousands(magnitude.toFixed(2))
      }
      if (value < 0.01) return '<' + symbol + '0.01'
      // Truncate at cents without binary-float loss: `0.29 * 100` is
      // 28.999999999999996, and a bare floor would print ¥0.28.
      var cents = Math.floor(value * 100 + 1e-6) / 100
      return symbol + groupThousands(cents.toFixed(2))
    }

    /** Trim binary-float noise before amounts are compared or summed. */
    function round6(value) {
      return Math.round(value * 1e6) / 1e6
    }

    /** Stable wallet order: known currencies first, then by code. */
    function sortWallets(wallets) {
      return wallets.slice().sort(function (a, b) {
        var left = CURRENCY_ORDER.indexOf(a.currency)
        var right = CURRENCY_ORDER.indexOf(b.currency)
        if (left !== right) return (left < 0 ? CURRENCY_ORDER.length : left) - (right < 0 ? CURRENCY_ORDER.length : right)
        return String(a.currency).localeCompare(String(b.currency))
      })
    }

    /** @param wallets - wallet list. @returns joined display text, or an em dash. */
    function walletsText(wallets) {
      if (wallets.length === 0) return '—'
      return sortWallets(wallets)
        .map(function (wallet) {
          return formatMoney(wallet.balance, wallet.currency)
        })
        .join(' + ')
    }

    /** Only positive bonus wallets are worth showing. */
    function positiveWallets(wallets) {
      return wallets.filter(function (wallet) {
        var value = Number(wallet.balance)
        return isFinite(value) && value > 0
      })
    }

    /** Sum one wallet list into a per-currency amount map. */
    function sumWallets(wallets) {
      var totals = {}
      for (var i = 0; i < wallets.length; i++) {
        var wallet = wallets[i]
        var value = Number(wallet.balance)
        if (!isFinite(value)) continue
        var currency = String(wallet.currency || 'CNY')
        totals[currency] = round6((totals[currency] || 0) + value)
      }
      return totals
    }

    /** Total available balance: topped-up plus granted, per currency. */
    function totalsOf(wallets, bonus) {
      var totals = sumWallets(wallets)
      var granted = sumWallets(bonus)
      for (var currency in granted) {
        totals[currency] = round6((totals[currency] || 0) + granted[currency])
      }
      return totals
    }

    /** The currency the row and the ledger display. */
    function displayCurrency(state) {
      var wallets = Array.isArray(state.wallets) ? sortWallets(state.wallets) : []
      var bonus = Array.isArray(state.bonus) ? sortWallets(state.bonus) : []
      var settings = isPlainObject(state.settings) ? state.settings : null
      var preferred = settings !== null && typeof settings.currency === 'string' ? settings.currency : null
      if (preferred !== null) {
        var held = wallets.concat(bonus).map(function (wallet) {
          return String(wallet.currency || 'CNY')
        })
        // USD is always selectable, even when the account only holds CNY,
        // because the row can convert balances with the cached reference rate.
        if (preferred === 'CNY' || preferred === 'USD' || held.indexOf(preferred) >= 0) return preferred
      }
      if (wallets.length > 0) return String(wallets[0].currency || 'CNY')
      if (bonus.length > 0) return String(bonus[0].currency || 'CNY')
      return 'CNY'
    }

    /** Currencies the picker offers: held currencies plus CNY and USD. */
    function availableCurrencies(state) {
      var seen = {}
      var list = []
      var all = (Array.isArray(state.wallets) ? state.wallets : []).concat(Array.isArray(state.bonus) ? state.bonus : [])
      var codes = all
        .map(function (wallet) {
          return String(wallet.currency || 'CNY')
        })
        .concat(CURRENCY_ORDER)
      for (var index = 0; index < codes.length; index += 1) {
        var currency = codes[index]
        if (seen[currency] === true) continue
        seen[currency] = true
        list.push(currency)
      }
      list.sort(function (a, b) {
        var left = CURRENCY_ORDER.indexOf(a)
        var right = CURRENCY_ORDER.indexOf(b)
        if (left !== right) return (left < 0 ? CURRENCY_ORDER.length : left) - (right < 0 ? CURRENCY_ORDER.length : right)
        return a.localeCompare(b)
      })
      return list
    }

    /** Convert every wallet into `target`; null when one currency is unsupported. */
    function balanceAmount(wallets, target, fx) {
      var total = 0
      for (var index = 0; index < wallets.length; index += 1) {
        var wallet = wallets[index]
        var value = Number(wallet.balance)
        if (!isFinite(value)) continue
        var converted = convertAmount(value, String(wallet.currency || 'CNY'), target, fx)
        if (converted === null) return null
        total = round6(total + converted)
      }
      return total
    }

    /** Wallet-list text in `target`, falling back to native amounts. */
    function walletsDisplayText(wallets, target, fx) {
      if (wallets.length === 0) return '—'
      var total = balanceAmount(wallets, target, fx)
      if (total === null) return walletsText(wallets)
      return formatMoney(total, target)
    }

    /** @param map - per-currency amount map. @returns the amount in `currency`. */
    function amountOf(map, currency) {
      if (map === null || map === undefined) return 0
      var value = map[currency]
      return typeof value === 'number' && isFinite(value) ? value : 0
    }

    /** Local calendar-day key, `YYYY-MM-DD`. */
    function dayKey(at) {
      var date = new Date(at)
      var month = date.getMonth() + 1
      var day = date.getDate()
      return date.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day
    }

    /** @param at - epoch milliseconds. @returns local wall-clock time. */
    function clockText(at) {
      try {
        return new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      } catch (error) {
        return new Date(at).toISOString()
      }
    }

    /** @param ms - duration. @returns a compact `1m 20s` form, or empty below a second. */
    function durationText(ms) {
      if (!(ms >= 1000)) return ''
      var seconds = Math.round(ms / 1000)
      if (seconds < 60) return seconds + 's'
      var minutes = Math.floor(seconds / 60)
      var rest = seconds % 60
      return rest === 0 ? minutes + 'm' : minutes + 'm ' + rest + 's'
    }

    /**
     * Spend ledger: per-day, per-session, and per-run buckets, persisted in
     * localStorage. Day and session keys survive reloads; run buckets are capped.
     */
    function emptyStats() {
      return { v: 1, last: null, at: 0, days: {}, sessions: {}, sessionDays: {}, runs: [], unattributed: {} }
    }

    function isPlainObject(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value)
    }

    /** Accept only finite non-negative amounts from storage. */
    function sanitizeAmounts(value) {
      var clean = {}
      if (!isPlainObject(value)) return clean
      for (var currency in value) {
        var amount = value[currency]
        if (typeof amount === 'number' && isFinite(amount) && amount > 0) clean[currency] = round6(amount)
      }
      return clean
    }

    function sanitizeStats(parsed) {
      var base = emptyStats()
      if (!isPlainObject(parsed) || parsed.v !== 1) return base
      base.last = isPlainObject(parsed.last) ? sanitizeAmounts(parsed.last) : null
      base.at = typeof parsed.at === 'number' && isFinite(parsed.at) ? parsed.at : 0
      base.unattributed = sanitizeAmounts(parsed.unattributed)
      if (isPlainObject(parsed.days)) {
        for (var key in parsed.days) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
          var amounts = sanitizeAmounts(parsed.days[key])
          if (Object.keys(amounts).length > 0) base.days[key] = amounts
        }
      }
      if (isPlainObject(parsed.sessions)) {
        for (var id in parsed.sessions) {
          var record = parsed.sessions[id]
          if (!isPlainObject(record)) continue
          var spent = sanitizeAmounts(record.c)
          if (Object.keys(spent).length === 0) continue
          base.sessions[id] = {
            c: spent,
            at: typeof record.at === 'number' && isFinite(record.at) ? record.at : 0,
          }
        }
      }
      if (isPlainObject(parsed.sessionDays)) {
        for (var day in parsed.sessionDays) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue
          var bySession = parsed.sessionDays[day]
          if (!isPlainObject(bySession)) continue
          var cleanDay = {}
          for (var sessionId in bySession) {
            var sessionAmounts = sanitizeAmounts(bySession[sessionId])
            if (Object.keys(sessionAmounts).length > 0) cleanDay[sessionId] = sessionAmounts
          }
          if (Object.keys(cleanDay).length > 0) base.sessionDays[day] = cleanDay
        }
      }
      if (Array.isArray(parsed.runs)) {
        for (var index = 0; index < parsed.runs.length; index++) {
          var run = parsed.runs[index]
          if (!isPlainObject(run)) continue
          var cost = sanitizeAmounts(run.c)
          if (Object.keys(cost).length === 0) continue
          base.runs.push({
            s: typeof run.s === 'string' ? run.s : '',
            t: typeof run.t === 'number' && isFinite(run.t) ? run.t : 0,
            e: typeof run.e === 'number' && isFinite(run.e) ? run.e : 0,
            c: cost,
          })
        }
      }
      return pruneStats(base)
    }

    function loadStats() {
      try {
        var raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw === null) return emptyStats()
        return sanitizeStats(JSON.parse(raw))
      } catch (error) {
        return emptyStats()
      }
    }

    function saveStats(stats) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
      } catch (error) {
        // A full or unavailable quota must not break the row.
      }
    }

    var DAY_MS = 86_400_000

    /**
     * Advisory budgets and refresh preferences. Kept in their own key so a
     * ledger import can never silently change how often the plugin polls.
     */
    function emptySettings() {
      return { v: 1, budgets: { daily: {}, monthly: {} }, refreshMs: POLL_INTERVAL_MS, currency: null, locale: null }
    }

    /** Accept only positive finite budgets keyed by a three-letter currency. */
    function sanitizeBudgetMap(value) {
      var clean = {}
      if (!isPlainObject(value)) return clean
      for (var currency in value) {
        if (!/^[A-Z]{3}$/.test(currency)) continue
        var amount = value[currency]
        if (typeof amount === 'number' && isFinite(amount) && amount > 0) clean[currency] = round6(Math.min(amount, 1e9))
      }
      return clean
    }

    function sanitizeSettings(parsed) {
      var base = emptySettings()
      if (!isPlainObject(parsed) || parsed.v !== 1) return base
      if (isPlainObject(parsed.budgets)) {
        base.budgets.daily = sanitizeBudgetMap(parsed.budgets.daily)
        base.budgets.monthly = sanitizeBudgetMap(parsed.budgets.monthly)
      }
      if (REFRESH_CHOICES.indexOf(parsed.refreshMs) >= 0) base.refreshMs = parsed.refreshMs
      if (typeof parsed.currency === 'string' && /^[A-Z]{3}$/.test(parsed.currency)) base.currency = parsed.currency
      if (LOCALE_CODES.indexOf(parsed.locale) >= 0) base.locale = parsed.locale
      return base
    }

    function loadSettings() {
      try {
        var raw = window.localStorage.getItem(SETTINGS_KEY)
        if (raw === null) return emptySettings()
        return sanitizeSettings(JSON.parse(raw))
      } catch (error) {
        return emptySettings()
      }
    }

    function saveSettings(settings) {
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      } catch (error) {
        // Preferences are optional; failing to persist them is not fatal.
      }
    }

    /**
     * Cached CNY→USD reference rate. The cache is refreshed at most once a week
     * by a plain HTTPS GET, so it costs no model tokens.
     */
    function emptyFx() {
      return { v: 1, base: 'CNY', quote: 'USD', rate: FX_DEFAULT_RATE, date: '', fetchedAt: 0, attemptedAt: 0, source: 'default' }
    }

    function sanitizeFx(parsed) {
      var base = emptyFx()
      if (!isPlainObject(parsed) || parsed.v !== 1) return base
      if (typeof parsed.rate === 'number' && isFinite(parsed.rate) && parsed.rate > 0) base.rate = round6(parsed.rate)
      if (typeof parsed.fetchedAt === 'number' && isFinite(parsed.fetchedAt) && parsed.fetchedAt > 0) base.fetchedAt = parsed.fetchedAt
      if (typeof parsed.attemptedAt === 'number' && isFinite(parsed.attemptedAt) && parsed.attemptedAt > 0) base.attemptedAt = parsed.attemptedAt
      if (typeof parsed.date === 'string') base.date = parsed.date
      if (parsed.source === 'frankfurter') base.source = 'frankfurter'
      return base
    }

    function loadFx() {
      try {
        var raw = window.localStorage.getItem(FX_KEY)
        if (raw === null) return emptyFx()
        return sanitizeFx(JSON.parse(raw))
      } catch (error) {
        return emptyFx()
      }
    }

    function saveFx(fx) {
      try {
        window.localStorage.setItem(FX_KEY, JSON.stringify(fx))
      } catch (error) {
        // A missing rate cache only falls back to the default rate.
      }
    }

    /** Whether the cached rate is missing, expired, or due for a retry. */
    function fxNeedsRefresh(fx, now) {
      if (fx.fetchedAt > 0) return now - fx.fetchedAt >= FX_TTL_MS
      return now - (fx.attemptedAt || 0) >= FX_RETRY_MS
    }

    /** Multiplier from one currency to another, or null when unsupported. */
    function fxRate(from, to, fx) {
      if (from === to) return 1
      var rate = fx !== null && fx !== undefined && typeof fx.rate === 'number' && isFinite(fx.rate) && fx.rate > 0 ? fx.rate : FX_DEFAULT_RATE
      if (from === 'CNY' && to === 'USD') return rate
      if (from === 'USD' && to === 'CNY') return 1 / rate
      return null
    }

    function convertAmount(amount, from, to, fx) {
      var rate = fxRate(from, to, fx)
      if (rate === null) return null
      return round6(amount * rate)
    }

    /** Sum a per-currency amount map into `target`, skipping unsupported ones. */
    function sumConverted(map, target, fx) {
      if (map === null || map === undefined || typeof map !== 'object') return 0
      var total = 0
      for (var currency in map) {
        var amount = map[currency]
        if (typeof amount !== 'number' || !isFinite(amount)) continue
        var converted = convertAmount(amount, currency, target, fx)
        if (converted === null) continue
        total = round6(total + converted)
      }
      return total
    }

    /** Drop buckets outside their retention windows, newest first. */
    function pruneStats(stats) {
      var cutoff = dayKey(Date.now() - KEEP_DAYS * 86_400_000)
      for (var key in stats.days) {
        if (key < cutoff) delete stats.days[key]
      }
      for (var sessionDay in stats.sessionDays) {
        if (sessionDay < cutoff) delete stats.sessionDays[sessionDay]
      }
      var ids = Object.keys(stats.sessions)
      if (ids.length > KEEP_SESSIONS) {
        ids.sort(function (a, b) {
          return (stats.sessions[b].at || 0) - (stats.sessions[a].at || 0)
        })
        for (var index = KEEP_SESSIONS; index < ids.length; index++) delete stats.sessions[ids[index]]
      }
      if (stats.runs.length > KEEP_RUNS) stats.runs = stats.runs.slice(stats.runs.length - KEEP_RUNS)
      return stats
    }

    /** Add `amount` into one per-currency bucket. */
    function addAmount(bucket, currency, amount) {
      bucket[currency] = round6((bucket[currency] || 0) + amount)
    }

    /** Find the run record for the open run, creating it on the first charge. */
    function runRecord(stats, run, at) {
      var last = stats.runs.length > 0 ? stats.runs[stats.runs.length - 1] : null
      if (last !== null && last.s === run.sessionId && last.t === run.startedAt) return last
      var record = { s: run.sessionId, t: run.startedAt, e: 0, c: {} }
      stats.runs.push(record)
      return record
    }

    /**
     * Charge one decrease to the day, the session, and the attributed run.
     * @param stats - ledger, mutated in place.
     * @param currency - currency of the decrease.
     * @param amount - positive amount.
     * @param at - observation time.
     * @param run - the run that owns the charge, or null when unattributed.
     */
    function recordSpend(stats, currency, amount, at, run) {
      if (!(amount > 0)) return
      var key = dayKey(at)
      if (!isPlainObject(stats.days[key])) stats.days[key] = {}
      addAmount(stats.days[key], currency, amount)
      if (run === null || run === undefined) {
        addAmount(stats.unattributed, currency, amount)
      } else {
        var session = stats.sessions[run.sessionId]
        if (!isPlainObject(session)) session = stats.sessions[run.sessionId] = { c: {}, at: 0 }
        addAmount(session.c, currency, amount)
        session.at = at
        if (!isPlainObject(stats.sessionDays)) stats.sessionDays = {}
        if (!isPlainObject(stats.sessionDays[key])) stats.sessionDays[key] = {}
        var daySessions = stats.sessionDays[key]
        if (!isPlainObject(daySessions[run.sessionId])) daySessions[run.sessionId] = {}
        addAmount(daySessions[run.sessionId], currency, amount)
        var record = runRecord(stats, run, at)
        addAmount(record.c, currency, amount)
        if (run.endedAt > 0) record.e = run.endedAt
      }
      stats.at = at
    }

    /** Last `count` days as ledger slices, oldest first, including empty days. */
    function daySeries(stats, count, currency, t, fx) {
      var series = []
      var now = Date.now()
      for (var offset = count - 1; offset >= 0; offset -= 1) {
        var at = now - offset * 86_400_000
        var key = dayKey(at)
        var label
        if (offset === 0) label = t('today', '今日')
        else if (offset === 1) label = t('yesterday', '昨日')
        else {
          var date = new Date(at)
          label = date.getMonth() + 1 + '/' + date.getDate()
        }
        series.push({ key: key, label: label, amount: sumConverted(stats.days[key], currency, fx), today: offset === 0 })
      }
      return series
    }

    /** Budget for one period/currency, or null when unset. */
    function budgetAmount(settings, period, currency) {
      if (!isPlainObject(settings) || !isPlainObject(settings.budgets)) return null
      var map = settings.budgets[period]
      if (!isPlainObject(map)) return null
      var value = map[currency]
      return typeof value === 'number' && isFinite(value) && value > 0 ? value : null
    }

    /** Spend in the calendar month containing `at`, converted to `currency`. */
    function monthSpend(stats, currency, at, fx) {
      var prefix = dayKey(at).slice(0, 7)
      var total = 0
      for (var key in stats.days) {
        if (key.slice(0, 7) === prefix) total = round6(total + sumConverted(stats.days[key], currency, fx))
      }
      return total
    }

    /**
     * Average spend per *spending* day over the last seven complete days: the
     * window total divided by the number of days that actually spent something.
     * A week with five spending days and ¥4 total therefore burns ¥0.80/day, not
     * ¥4/7. Today is excluded so a half-finished day cannot drag the average
     * down; when the past week is empty the last seven days including today are
     * used instead.
     * @returns the average, or null when nothing has been spent.
     */
    function averageDailySpend(stats, currency, fx) {
      var now = Date.now()

      function windowOf(startOffset) {
        var total = 0
        var days = 0
        for (var step = 0; step < 7; step += 1) {
          var amount = sumConverted(stats.days[dayKey(now - (startOffset + step) * DAY_MS)], currency, fx)
          if (!(amount > 0)) continue
          total = round6(total + amount)
          days += 1
        }
        return { total: total, days: days }
      }

      var window = windowOf(1)
      if (window.days === 0) window = windowOf(0)
      return window.days > 0 ? round6(window.total / window.days) : null
    }

    /** Days of balance left at the observed burn rate. */
    function runwayDays(available, average) {
      if (!(available > 0) || !(average > 0)) return null
      return available / average
    }

    /** Localized "about N days" with the awkward ends of the range handled. */
    function runwayTextOf(value, t) {
      if (value === null || value === undefined) return '—'
      var days = t('days', '天')
      if (value < 1) return '<1 ' + days
      if (value >= 1000) return '999+ ' + days
      return t('approx', '约') + ' ' + Math.floor(value) + ' ' + days
    }

    /** Daily-spend CSV, with a BOM so spreadsheet apps read it as UTF-8. */
    function buildCsv(stats) {
      var lines = ['date,currency,spend']
      var keys = Object.keys(stats.days).sort()
      for (var index = 0; index < keys.length; index += 1) {
        var key = keys[index]
        var amounts = stats.days[key]
        var currencies = Object.keys(amounts).sort()
        for (var position = 0; position < currencies.length; position += 1) {
          var currency = currencies[position]
          var amount = amountOf(amounts, currency)
          if (!(amount > 0)) continue
          lines.push(key + ',' + currency + ',' + String(round6(amount)))
        }
      }
      return '\uFEFF' + lines.join('\n') + '\n'
    }

    /** Full local backup: ledger plus preferences. */
    function buildBackup(stats, settings) {
      return JSON.stringify(
        {
          app: 'dsh-balance-chip',
          version: CLIENT_VERSION,
          exportedAt: new Date().toISOString(),
          stats: stats,
          settings: settings,
        },
        null,
        2,
      )
    }

    /**
     * Parse a backup produced by `buildBackup`, or a bare ledger exported by an
     * older build. Invalid input throws instead of returning an empty ledger, so
     * a bad file can never wipe the current one.
     */
    function parseBackup(text) {
      var parsed = JSON.parse(String(text))
      var rawStats = isPlainObject(parsed) && isPlainObject(parsed.stats) ? parsed.stats : parsed
      if (!isPlainObject(rawStats) || rawStats.v !== 1) throw new Error('invalid ledger')
      var stats = sanitizeStats(rawStats)
      var settings = isPlainObject(parsed) && isPlainObject(parsed.settings) ? sanitizeSettings(parsed.settings) : null
      return { stats: stats, settings: settings }
    }

    /** Save a string as a file without touching the network. */
    function downloadText(name, text, mime) {
      if (
        typeof document === 'undefined' ||
        typeof Blob === 'undefined' ||
        typeof URL === 'undefined' ||
        typeof URL.createObjectURL !== 'function'
      ) {
        throw new Error('downloads are unavailable')
      }
      var url = URL.createObjectURL(new Blob([text], { type: mime }))
      var anchor = document.createElement('a')
      anchor.href = url
      anchor.download = name
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.setTimeout(function () {
        URL.revokeObjectURL(url)
      }, 1000)
    }

    /** Sessions by recency, optionally filtered to those with spend. */
    function sessionRows(stats, currency, count, fx) {
      var rows = []
      for (var id in stats.sessions) {
        var session = stats.sessions[id]
        var amount = sumConverted(session.c, currency, fx)
        if (!(amount > 0)) continue
        rows.push({ id: id, amount: amount, at: session.at || 0 })
      }
      rows.sort(function (a, b) {
        return b.at - a.at
      })
      return rows.slice(0, count)
    }

    /** Runs newest first, keeping only those with spend. */
    function runRows(stats, currency, count, fx) {
      var rows = []
      for (var index = stats.runs.length - 1; index >= 0 && rows.length < count; index -= 1) {
        var run = stats.runs[index]
        var amount = sumConverted(run.c, currency, fx)
        if (!(amount > 0)) continue
        rows.push({ id: run.s, at: run.t, end: run.e, amount: amount })
      }
      return rows
    }

    /** Per-session totals across the last seven days, largest first. */
    function weekSessionTotals(stats, currency, fx) {
      var totals = {}
      var now = Date.now()
      for (var offset = 0; offset < 7; offset += 1) {
        var day = stats.sessionDays ? stats.sessionDays[dayKey(now - offset * DAY_MS)] : null
        if (!isPlainObject(day)) continue
        for (var id in day) {
          var amount = sumConverted(day[id], currency, fx)
          if (!(amount > 0)) continue
          totals[id] = round6((totals[id] || 0) + amount)
        }
      }
      var rows = []
      for (var sessionId in totals) rows.push({ id: sessionId, amount: totals[sessionId] })
      rows.sort(function (a, b) {
        return b.amount - a.amount
      })
      return rows
    }

    /** One day's spend split by session, largest first. */
    function sessionDayRows(stats, key, currency, fx) {
      var rows = []
      var day = stats.sessionDays ? stats.sessionDays[key] : null
      if (!isPlainObject(day)) return rows
      for (var id in day) {
        var amount = sumConverted(day[id], currency, fx)
        if (amount > 0) rows.push({ id: id, amount: amount })
      }
      rows.sort(function (a, b) {
        return b.amount - a.amount
      })
      return rows
    }

    /** Resolve a session title, falling back to a stable short label. */
    function sessionTitle(sessions, id, t) {
      var record = sessions && sessions.byId ? sessions.byId[id] : undefined
      var title = record && typeof record.title === 'string' ? record.title.trim() : ''
      if (title.length > 0) return title
      if (typeof id === 'string' && id.length > 8) return id.slice(0, 8)
      return t('untitled', '未命名会话')
    }

    /** The session the main view currently shows, if any. */
    function currentSessionId(sessions) {
      if (!sessions || !sessions.byId) return undefined
      var rows = sessions.byId
      for (var id in rows) {
        var row = rows[id]
        if (row && row.retainedBy && (row.retainedBy.mainView || 0) > 0) return id
      }
      return undefined
    }

    /** A stable no-op hook for hosts that do not provide the sessions standard. */
    function absentHook() {
      return undefined
    }

    function sameSelector(state) {
      return state
    }

    /**
     * Read the sessions list through the root standard hook. Called
     * unconditionally so hook order never depends on host capabilities.
     */
    function useSessionsSnapshot(useSessions) {
      var hook = typeof useSessions === 'function' ? useSessions : absentHook
      return hook(sameSelector)
    }

    /** One labelled figure row inside the detail panel. */
    function panelRow(label, value, key, title) {
      return h(
        'div',
        { className: 'bpc_row', key: key, title: title },
        h('span', { className: 'bpc_label' }, label),
        h('span', { className: 'bpc_value' }, value),
      )
    }

    /** A spend/limit line with its progress bar. */
    function budgetBlock(spend, limit, currency, key) {
      var ratio = limit > 0 ? spend / limit : 0
      var over = limit > 0 && spend > limit
      var percent = Math.max(0, Math.round(ratio * 100))
      var width = Math.min(100, percent)
      return h(
        'div',
        { className: 'bpc_budget', key: key },
        h(
          'div',
          { className: 'bpc_progressMeta', 'data-over': over ? 'true' : undefined },
          h('span', {}, formatMoney(spend, currency) + ' / ' + formatMoney(limit, currency)),
          h('span', {}, percent + '%'),
        ),
        h(
          'div',
          {
            className: 'bpc_progress',
            role: 'progressbar',
            'aria-valuemin': '0',
            'aria-valuemax': '100',
            'aria-valuenow': String(width),
          },
          h('div', { className: 'bpc_progressFill', style: { width: width + '%' }, 'data-over': over ? 'true' : undefined }),
        ),
      )
    }

    /**
     * Settings tab: budgets, refresh cadence, backup/restore, and reset.
     * Everything here is local; no action on this screen calls the network.
     * @param props - current settings, display currency, copy, and actions.
     * @returns the settings form.
     */
    function SettingsView(props) {
      var t = props.t
      var settings = props.settings
      var actions = props.actions || {}
      var currency = props.currency
      var symbol = symbolOf(currency)
      var fx = isPlainObject(props.fx) ? props.fx : emptyFx()
      var refreshMs = REFRESH_CHOICES.indexOf(settings.refreshMs) >= 0 ? settings.refreshMs : POLL_INTERVAL_MS

      var dailyState = React.useState(budgetAmount(settings, 'daily', currency))
      var daily = dailyState[0]
      var setDaily = dailyState[1]
      var monthlyState = React.useState(budgetAmount(settings, 'monthly', currency))
      var monthly = monthlyState[0]
      var setMonthly = monthlyState[1]
      var statusState = React.useState({ text: '', error: false })
      var status = statusState[0]
      var setStatus = statusState[1]
      var confirmState = React.useState(false)
      var confirming = confirmState[0]
      var setConfirming = confirmState[1]
      var fileRef = React.useRef(null)
      var clearTimer = React.useRef(0)

      React.useEffect(function () {
        return function () {
          if (clearTimer.current !== 0) window.clearTimeout(clearTimer.current)
        }
      }, [])

      function commitBudget(period, raw) {
        var text = String(raw === undefined || raw === null ? '' : raw).trim()
        var value = text === '' ? null : Number(text)
        if (text !== '' && !(isFinite(value) && value > 0)) {
          setStatus({ text: t('budgetInvalid', '预算需为正数'), error: true })
          return
        }
        if (typeof actions.setBudget === 'function') actions.setBudget(period, currency, value)
        setStatus({ text: t('saved', '已保存'), error: false })
      }

      function exportFile(kind) {
        try {
          if (kind === 'csv') {
            if (typeof actions.exportCsv === 'function') actions.exportCsv()
          } else if (typeof actions.exportJson === 'function') actions.exportJson()
          setStatus({ text: t('exported', '已导出'), error: false })
        } catch (error) {
          setStatus({ text: t('exportFailed', '导出失败'), error: true })
        }
      }

      function finishImport(text) {
        var result = typeof actions.importJson === 'function' ? actions.importJson(text) : { ok: false }
        if (result && result.ok === true) {
          setStatus({ text: t('imported', '已导入') + ' ' + result.days + ' ' + t('daysUnit', '天记录'), error: false })
        } else {
          setStatus({
            text: t('importFailed', '导入失败') + (result && result.message ? ': ' + result.message : ''),
            error: true,
          })
        }
      }

      function onFile(event) {
        var input = event.target
        var file = input && input.files ? input.files[0] : null
        if (!file) return
        var fail = function () {
          setStatus({ text: t('importFailed', '导入失败'), error: true })
        }
        try {
          if (typeof file.text === 'function') file.text().then(finishImport).catch(fail)
          else if (typeof FileReader === 'function') {
            var reader = new FileReader()
            reader.onload = function () {
              finishImport(String(reader.result))
            }
            reader.onerror = fail
            reader.readAsText(file)
          } else fail()
        } catch (error) {
          fail()
        }
        if (input) input.value = ''
      }

      function onClear() {
        if (!confirming) {
          setConfirming(true)
          if (clearTimer.current !== 0) window.clearTimeout(clearTimer.current)
          clearTimer.current = window.setTimeout(function () {
            clearTimer.current = 0
            setConfirming(false)
          }, 4000)
          return
        }
        if (clearTimer.current !== 0) window.clearTimeout(clearTimer.current)
        clearTimer.current = 0
        setConfirming(false)
        if (typeof actions.clearStats === 'function') actions.clearStats()
        setStatus({ text: t('cleared', '已清除本地统计'), error: false })
      }

      function field(label, node, key) {
        return h('label', { className: 'bpc_field', key: key }, h('span', { className: 'bpc_fieldLabel' }, label), node)
      }

      var dailyInput = h('input', {
        className: 'bpc_input',
        type: 'number',
        min: '0',
        step: '0.01',
        inputMode: 'decimal',
        placeholder: t('budgetUnset', '不限'),
        value: daily === null || daily === undefined ? '' : String(daily),
        onChange: function (event) {
          setDaily(event.target.value)
        },
        onBlur: function (event) {
          commitBudget('daily', event.target.value)
        },
        onKeyDown: function (event) {
          if (event.key === 'Enter' && event.currentTarget && typeof event.currentTarget.blur === 'function') event.currentTarget.blur()
        },
      })

      var monthlyInput = h('input', {
        className: 'bpc_input',
        type: 'number',
        min: '0',
        step: '0.01',
        inputMode: 'decimal',
        placeholder: t('budgetUnset', '不限'),
        value: monthly === null || monthly === undefined ? '' : String(monthly),
        onChange: function (event) {
          setMonthly(event.target.value)
        },
        onBlur: function (event) {
          commitBudget('monthly', event.target.value)
        },
        onKeyDown: function (event) {
          if (event.key === 'Enter' && event.currentTarget && typeof event.currentTarget.blur === 'function') event.currentTarget.blur()
        },
      })

      var refreshSelect = h(
        'select',
        {
          className: 'bpc_select',
          value: String(refreshMs),
          onChange: function (event) {
            if (typeof actions.setRefresh === 'function') actions.setRefresh(Number(event.target.value))
          },
        },
        REFRESH_CHOICES.map(function (ms) {
          return h('option', { value: String(ms), key: String(ms) }, ms === 0 ? t('off', '暂停') : ms / 1000 + ' ' + t('seconds', '秒'))
        }),
      )

      var currencies = Array.isArray(props.currencies) ? props.currencies.slice() : []
      if (settings.currency !== null && settings.currency !== undefined && currencies.indexOf(settings.currency) < 0) {
        currencies.push(settings.currency)
        currencies.sort()
      }
      var currencySelect = h(
        'select',
        {
          className: 'bpc_select',
          value: settings.currency === null || settings.currency === undefined ? '' : settings.currency,
          onChange: function (event) {
            if (typeof actions.setCurrency === 'function') actions.setCurrency(event.target.value === '' ? null : event.target.value)
          },
        },
        [h('option', { value: '', key: 'auto' }, t('auto', '自动'))].concat(
          currencies.map(function (code) {
            return h('option', { value: code, key: code }, code)
          }),
        ),
      )

      var languageLabels = { zh: '中文', en: 'English', it: 'Italiano' }
      var languageSelect = h(
        'select',
        {
          className: 'bpc_select',
          value: settings.locale === null || settings.locale === undefined ? '' : settings.locale,
          onChange: function (event) {
            if (typeof actions.setLocale === 'function') actions.setLocale(event.target.value === '' ? null : event.target.value)
          },
        },
        [h('option', { value: '', key: 'system' }, t('followSystem', '跟随系统'))].concat(
          LOCALE_CODES.map(function (code) {
            return h('option', { value: code, key: code }, languageLabels[code])
          }),
        ),
      )

      var buttons = [
        h(
          'button',
          { type: 'button', className: 'bpc_refresh bpc_action', key: 'export-json', onClick: function () { exportFile('json') } },
          t('exportJson', '导出 JSON'),
        ),
        h(
          'button',
          { type: 'button', className: 'bpc_refresh bpc_action', key: 'export-csv', onClick: function () { exportFile('csv') } },
          t('exportCsv', '导出 CSV'),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'bpc_refresh bpc_action',
            key: 'import',
            onClick: function () {
              if (fileRef.current && typeof fileRef.current.click === 'function') fileRef.current.click()
            },
          },
          t('importJson', '导入 JSON'),
        ),
        h(
          'button',
          { type: 'button', className: 'bpc_refresh bpc_action', key: 'clear', onClick: onClear },
          confirming ? t('confirmClear', '确认清除？') : t('clearStats', '清除本地统计'),
        ),
      ]

      var fxLive = fx.source === 'frankfurter' && fx.fetchedAt > 0
      var fxRate = fx.rate > 0 ? fx.rate : FX_DEFAULT_RATE
      var fxMain = '1 CNY = ' + fxRate + ' USD'
      var fxSub = fxLive && fx.date ? fx.date : t('fxDefault', '默认汇率（未联网）')
      var fxRow = h(
        'div',
        { className: 'bpc_rateBox' },
        h(
          'div',
          { className: 'bpc_rateLine' },
          h('span', { className: 'bpc_rate', title: fxMain + ' · ' + fxSub }, fxMain),
          h(
            'button',
            {
              type: 'button',
              className: 'bpc_refresh',
              onClick: function () {
                if (typeof actions.refreshFx === 'function') actions.refreshFx()
              },
            },
            t('refreshRate', '刷新'),
          ),
        ),
        h('div', { className: 'bpc_rateDate' }, fxSub),
      )

      return h(
        'div',
        { className: 'bpc_form' },
        field(t('language', '语言'), languageSelect, 'language'),
        field(t('currency', '显示币种'), currencySelect, 'currency'),
        field(t('exchangeRate', '汇率'), fxRow, 'fx'),
        field(t('dailyBudget', '每日预算') + ' · ' + symbol, dailyInput, 'daily'),
        field(t('monthlyBudget', '每月预算') + ' · ' + symbol, monthlyInput, 'monthly'),
        field(t('refreshInterval', '刷新间隔'), refreshSelect, 'refresh'),
        h('div', { className: 'bpc_actions', key: 'actions' }, buttons),
        h('input', {
          ref: fileRef,
          key: 'file',
          type: 'file',
          accept: '.json,application/json',
          style: { display: 'none' },
          onChange: onFile,
        }),
        h('div', { className: 'bpc_status', key: 'status', 'data-error': status.error ? 'true' : undefined }, status.text),
      )
    }

    /**
     * Seven-day breakdown: per-session totals for the whole window, then each
     * day with its own per-session split. Only days recorded by this version
     * carry the per-session detail; older days still show their day total.
     */
    function DetailView(props) {
      var state = props.state
      var stats = state.stats
      var t = props.t
      var sessions = props.sessions
      var currency = displayCurrency(state)
      var fx = isPlainObject(state.fx) ? state.fx : emptyFx()
      var week = weekSessionTotals(stats, currency, fx)
      var series = daySeries(stats, 7, currency, t, fx)
      var empty = t('noSessionSpend', '暂无会话明细')

      var weekNodes =
        week.length === 0
          ? [h('div', { className: 'bpc_empty', key: 'empty' }, empty)]
          : week.map(function (row) {
              return h(
                'div',
                { className: 'bpc_item', key: row.id },
                h('span', { className: 'bpc_name' }, sessionTitle(sessions, row.id, t)),
                h('span', { className: 'bpc_meta' }, formatMoney(row.amount, currency)),
              )
            })

      var dayNodes = series
        .slice()
        .reverse()
        .map(function (entry) {
          var rows = sessionDayRows(stats, entry.key, currency, fx)
          var children = [
            h(
              'div',
              { className: 'bpc_dayHead', key: 'head' },
              h('span', { className: 'bpc_dayLabel' }, entry.label),
              h('span', { className: 'bpc_dayTotal' }, formatMoney(entry.amount, currency)),
            ),
          ]
          if (rows.length === 0) {
            children.push(h('div', { className: 'bpc_empty bpc_dayEmpty', key: 'none' }, empty))
          } else {
            children = children.concat(
              rows.map(function (row) {
                return h(
                  'div',
                  { className: 'bpc_item bpc_dayItem', key: row.id },
                  h('span', { className: 'bpc_name' }, sessionTitle(sessions, row.id, t)),
                  h('span', { className: 'bpc_meta' }, formatMoney(row.amount, currency)),
                )
              }),
            )
          }
          return h('div', { className: 'bpc_dayGroup', key: entry.key }, children)
        })

      return h(
        'div',
        { className: 'bpc_detail' },
        h('div', { className: 'bpc_heading' }, t('weekBySession', '近 7 天 · 按会话')),
        h('div', { className: 'bpc_list' }, weekNodes),
        h('div', { className: 'bpc_div' }),
        h('div', { className: 'bpc_heading' }, t('byDay', '按天 · 每个会话')),
        h('div', { className: 'bpc_days' }, dayNodes),
      )
    }

    /**
     * Detail popover: balances, today, this session, a 7-day strip, the sessions
     * that spent, and the most recent runs.
     * @param props - ledger snapshot, current session, session titles, copy, and actions.
     * @returns the panel element tree.
     */
    function StatsPanel(props) {
      var state = props.state
      var stats = state.stats
      var t = props.t
      var currency = displayCurrency(state)
      var wallets = Array.isArray(state.wallets) ? state.wallets : []
      var bonus = Array.isArray(state.bonus) ? state.bonus : []
      var sessions = props.sessions
      var activeId = props.currentSessionId
      var day = dayKey(Date.now())
      var settings = isPlainObject(props.settings) ? props.settings : isPlainObject(state.settings) ? state.settings : emptySettings()
      var view = props.view === 'settings' ? 'settings' : props.view === 'detail' ? 'detail' : 'main'
      var fx = isPlainObject(state.fx) ? state.fx : emptyFx()

      var todayAmount = sumConverted(stats.days[day], currency, fx)
      var monthAmount = monthSpend(stats, currency, Date.now(), fx)
      var dailyBudget = budgetAmount(settings, 'daily', currency)
      var monthlyBudget = budgetAmount(settings, 'monthly', currency)
      var average = averageDailySpend(stats, currency, fx)
      var available = sumConverted(totalsOf(wallets, bonus), currency, fx)
      var runway = runwayDays(available, average)
      var sessionAmount = activeId && stats.sessions[activeId] ? sumConverted(stats.sessions[activeId].c, currency, fx) : 0
      var unattributed = sumConverted(stats.unattributed, currency, fx)
      var series = daySeries(stats, 7, currency, t, fx)
      var peak = 0
      for (var index = 0; index < series.length; index++) peak = Math.max(peak, series[index].amount)
      var sessionList = sessionRows(stats, currency, 5, fx)
      var runList = runRows(stats, currency, 4, fx)

      var bars = series.map(function (entry) {
        var ratio = peak > 0 ? entry.amount / peak : 0
        var height = entry.amount <= 0 ? 2 : Math.max(4, Math.round(ratio * 38))
        return h(
          'div',
          { className: 'bpc_bar', key: entry.key, title: entry.label + ' ' + formatMoney(entry.amount, currency) },
          h(
            'div',
            { className: 'bpc_barTrack' },
            h('div', {
              className: 'bpc_barFill',
              style: { height: height + 'px' },
              'data-today': entry.today ? 'true' : undefined,
              'data-empty': entry.amount <= 0 ? 'true' : undefined,
            }),
          ),
          h('div', { className: 'bpc_barLabel' }, entry.label),
        )
      })

      var sessionNodes =
        sessionList.length === 0
          ? [h('div', { className: 'bpc_empty', key: 'empty' }, t('noData', '暂无消耗记录'))]
          : sessionList.map(function (row) {
              return h(
                'div',
                { className: 'bpc_item', key: row.id },
                h('span', { className: 'bpc_name' }, sessionTitle(sessions, row.id, t)),
                h('span', { className: 'bpc_meta', style: { fontVariantNumeric: 'tabular-nums' } }, formatMoney(row.amount, currency)),
              )
            })

      var runNodes =
        runList.length === 0
          ? [h('div', { className: 'bpc_empty', key: 'empty' }, t('noData', '暂无消耗记录'))]
          : runList.map(function (row, position) {
              var time = clockText(row.at).slice(0, 5)
              var duration = durationText(row.end > row.at ? row.end - row.at : 0)
              return h(
                'div',
                { className: 'bpc_item', key: row.at + ':' + position },
                h(
                  'span',
                  { className: 'bpc_name' },
                  time + (duration === '' ? '' : ' · ' + duration) + '  ' + sessionTitle(sessions, row.id, t),
                ),
                h('span', { className: 'bpc_meta' }, formatMoney(row.amount, currency)),
              )
            })

      var bonusTotal = sumConverted(sumWallets(bonus), currency, fx)
      var rows = [
        panelRow(t('label', '余额'), walletsDisplayText(wallets, currency, fx), 'balance'),
        panelRow(t('bonusBalance', '赠送余额'), formatMoney(bonusTotal, currency), 'bonus'),
        panelRow(
          t('runway', '可用天数'),
          runwayTextOf(runway, t),
          'runway',
          t('avgDaily', '近 7 天日均') + ' ' + (average === null ? '—' : formatMoney(average, currency)),
        ),
        h('div', { className: 'bpc_div', key: 'div-1' }),
        panelRow(t('todaySpend', '今日消耗'), formatMoney(todayAmount, currency), 'today'),
      ]
      if (dailyBudget !== null) rows.push(budgetBlock(todayAmount, dailyBudget, currency, 'daily-budget'))
      rows.push(panelRow(t('month', '本月消耗'), formatMoney(monthAmount, currency), 'month'))
      if (monthlyBudget !== null) rows.push(budgetBlock(monthAmount, monthlyBudget, currency, 'monthly-budget'))
      rows.push(panelRow(t('sessionSpend', '本次会话'), formatMoney(sessionAmount, currency), 'session'))
      if (unattributed > 0) rows.push(panelRow(t('other', '其他'), formatMoney(unattributed, currency), 'other'))

      var iconRefresh = h(
        'button',
        {
          type: 'button',
          className: 'bpc_refresh bpc_iconButton',
          title: t('refresh', '刷新'),
          'aria-label': t('refresh', '刷新'),
          disabled: state.phase === 'loading',
          onClick: props.onRefresh,
        },
        '↻',
      )

      var headButtons =
        view === 'main'
          ? [
              h(
                'button',
                { type: 'button', className: 'bpc_refresh', onClick: function () { if (typeof props.onView === 'function') props.onView('detail') } },
                t('breakdown', '明细'),
              ),
              h(
                'button',
                { type: 'button', className: 'bpc_refresh', onClick: function () { if (typeof props.onView === 'function') props.onView('settings') } },
                t('settings', '设置'),
              ),
              iconRefresh,
            ]
          : [
              h(
                'button',
                { type: 'button', className: 'bpc_refresh', onClick: function () { if (typeof props.onView === 'function') props.onView('main') } },
                t('back', '返回'),
              ),
              iconRefresh,
            ]

      var head = h(
        'div',
        { className: 'bpc_head' },
        h(
          'span',
          { className: 'bpc_title' },
          view === 'settings' ? t('settings', '设置') : view === 'detail' ? t('breakdown', '明细') : t('detail', '余额与消耗'),
        ),
        h('div', { className: 'bpc_headActions' }, headButtons),
      )

      var content =
        view === 'settings'
          ? h(SettingsView, {
              settings: settings,
              currency: currency,
              currencies: availableCurrencies(state),
              fx: fx,
              t: t,
              actions: props.actions,
              key: 'settings-' + currency,
            })
          : view === 'detail'
            ? h(DetailView, { state: state, sessions: sessions, t: t, key: 'detail' })
            : [
                h('div', { key: 'figures' }, rows),
                h('div', { className: 'bpc_div', key: 'div-2' }),
                h('div', { className: 'bpc_heading', key: 'week-head' }, t('week', '近 7 天')),
                h('div', { className: 'bpc_bars', key: 'week-bars' }, bars),
                h('div', { className: 'bpc_div', key: 'div-3' }),
                h('div', { className: 'bpc_heading', key: 'sessions-head' }, t('sessions', '会话消耗')),
                h('div', { className: 'bpc_list', key: 'sessions-list' }, sessionNodes),
                h('div', { className: 'bpc_div', key: 'div-4' }),
                h('div', { className: 'bpc_heading', key: 'tasks-head' }, t('tasks', '最近任务')),
                h('div', { className: 'bpc_list', key: 'tasks-list' }, runNodes),
              ]

      return h(
        'div',
        {
          className: 'bpc_panel',
          role: 'dialog',
          'aria-label': t('detail', '余额与消耗'),
          // A missing anchor measurement still lands bottom-left, near the row,
          // instead of the viewport's static origin.
          style: props.position || { left: '12px', bottom: '12px', width: '288px', maxHeight: '70vh' },
        },
        head,
        content,
        h(
          'div',
          { className: 'bpc_foot' },
          h('span', {}, state.at > 0 ? t('updated', '更新于') + ' ' + clockText(state.at) : ''),
          state.phase === 'stale' ? h('span', {}, t('stale', '上次刷新失败')) : null,
        ),
      )
    }

    /**
     * The single sidebar row. Wide shows both balances plus today's spend; the
     * collapsed rail shows a currency glyph, with the figures in its tooltip.
     * Clicking opens the detail panel.
     * @param props - composed slot props (`wide` from the sidebar, plus this
     * plugin's injected store and refresh) and the root standard hooks.
     * @returns the row, or null while the account is signed out.
     */
    function BalanceChip(props) {
      var store = props.store
      var state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
      var sessions = useSessionsSnapshot(props.useSessions)
      var hostT = typeof props.t === 'function' ? props.t : null

      var openState = React.useState(false)
      var open = openState[0]
      var setOpen = openState[1]
      var positionState = React.useState(null)
      var position = positionState[0]
      var setPosition = positionState[1]
      var viewState = React.useState('main')
      var view = viewState[0]
      var setView = viewState[1]
      var anchorRef = React.useRef(null)
      var panelRef = React.useRef(null)

      React.useEffect(function () {
        props.refresh(false)
      }, [])

      React.useEffect(
        function () {
          if (!open) return undefined
          var onPointerDown = function (event) {
            var target = event.target
            var anchor = anchorRef.current
            var panel = panelRef.current
            if (anchor && typeof anchor.contains === 'function' && anchor.contains(target)) return
            if (panel && typeof panel.contains === 'function' && panel.contains(target)) return
            setOpen(false)
            setView('main')
          }
          var onKeyDown = function (event) {
            if (event.key === 'Escape') {
              setOpen(false)
              setView('main')
            }
          }
          document.addEventListener('pointerdown', onPointerDown, true)
          document.addEventListener('keydown', onKeyDown, true)
          return function () {
            document.removeEventListener('pointerdown', onPointerDown, true)
            document.removeEventListener('keydown', onKeyDown, true)
          }
        },
        [open],
      )

      React.useLayoutEffect(
        function () {
          if (!open) return undefined
          function place() {
            var node = anchorRef.current
            if (!node || typeof node.getBoundingClientRect !== 'function') return
            var rect = node.getBoundingClientRect()
            var width = Math.min(300, Math.max(240, window.innerWidth - 24))
            var left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8))
            var bottom = Math.max(8, window.innerHeight - rect.top + 8)
            setPosition({ left: left + 'px', bottom: bottom + 'px', width: width + 'px', maxHeight: Math.max(200, rect.top - 16) + 'px' })
          }
          place()
          window.addEventListener('resize', place)
          return function () {
            window.removeEventListener('resize', place)
          }
        },
        [open],
      )

      /** Localized copy: an explicit plugin language wins, then the host dictionary. */
      function tr(key, fallback) {
        var preferred = state.settings && typeof state.settings.locale === 'string' ? state.settings.locale : null
        var dict = preferred !== null ? DICTS[preferred] : null
        if (dict && typeof dict[key] === 'string') return dict[key]
        if (hostT === null) return fallback
        var value
        try {
          value = hostT(key)
        } catch (error) {
          return fallback
        }
        return typeof value === 'string' && value.length > 0 && value !== key ? value : fallback
      }

      if (state.phase === 'signed-out') return null

      var wallets = Array.isArray(state.wallets) ? state.wallets : []
      var bonus = positiveWallets(Array.isArray(state.bonus) ? state.bonus : [])
      var currency = displayCurrency(state)
      var fx = isPlainObject(state.fx) ? state.fx : emptyFx()
      var hasValue = wallets.length > 0
      var balanceText = hasValue ? walletsDisplayText(wallets, currency, fx) : '—'
      var bonusText = formatMoney(sumConverted(sumWallets(bonus), currency, fx), currency)
      var todayAmount = sumConverted(state.stats.days[dayKey(Date.now())], currency, fx)
      var todayText = formatMoney(todayAmount, currency)
      var activeId = currentSessionId(sessions)
      var label = tr('label', '余额')
      var tip = label + ' ' + balanceText + ' · ' + tr('bonus', '赠送') + ' ' + bonusText + ' · ' + tr('today', '今日') + ' ' + todayText
      var settings = isPlainObject(state.settings) ? state.settings : emptySettings()
      var dailyBudget = budgetAmount(settings, 'daily', currency)
      var todayOver = dailyBudget !== null && todayAmount > dailyBudget

      var toggle = function () {
        if (open) {
          setOpen(false)
          setView('main')
          return
        }
        setOpen(true)
      }

      var panel = null
      if (open) {
        var node = h(StatsPanel, {
          state: state,
          sessions: sessions,
          currentSessionId: activeId,
          t: tr,
          settings: settings,
          view: view,
          actions: props.actions,
          onView: function (next) {
            setView(next === 'settings' || next === 'detail' ? next : 'main')
          },
          onRefresh: function () {
            props.refresh(true)
          },
          position: position,
        })
        if (ReactDOM !== null && typeof ReactDOM.createPortal === 'function' && typeof document !== 'undefined') {
          panel = ReactDOM.createPortal(
            h('div', { ref: panelRef, style: { display: 'contents' }, 'data-balance-chip': 'panel' }, node),
            document.body,
            'balance-chip-panel',
          )
        } else {
          panel = h('div', { ref: panelRef, key: 'panel' }, node)
        }
      }

      if (props.wide === false) {
        var rail = h(
          'button',
          {
            type: 'button',
            ref: anchorRef,
            className: 'bc_button bc_railButton',
            'data-phase': state.phase,
            'aria-label': tip,
            'aria-haspopup': 'dialog',
            'aria-expanded': open ? 'true' : 'false',
            title: Tooltip === null ? tip : undefined,
            onClick: toggle,
          },
          h('span', { className: 'bc_railGlyph' }, hasValue ? symbolOf(currency) : '¥'),
        )
        var railChild = Tooltip === null ? rail : h(Tooltip, { label: tip, side: 'right', delayMs: 400, disabled: open }, rail)
        return h('div', { className: 'bc_row', 'data-rail': 'true' }, railChild, panel)
      }

      var button = h(
        'button',
        {
          type: 'button',
          ref: anchorRef,
          className: 'bc_button',
          'data-phase': state.phase,
          'aria-label': tip,
          'aria-haspopup': 'dialog',
          'aria-expanded': open ? 'true' : 'false',
          onClick: toggle,
        },
        h(
          'span',
          { className: 'bc_rows' },
          h(
            'span',
            { className: 'bc_line', 'data-dim': hasValue ? 'false' : 'true' },
            h('span', { className: 'bc_key' }, label),
            h('span', { className: 'bc_val' }, balanceText),
          ),
          h(
            'span',
            { className: 'bc_meta' },
            h('span', { className: 'bc_group' }, h('span', { className: 'bc_key' }, tr('bonus', '赠送')), h('span', { className: 'bc_val' }, bonusText)),
            h(
              'span',
              { className: 'bc_group', 'data-over': todayOver ? 'true' : undefined },
              h('span', { className: 'bc_key' }, tr('today', '今日')),
              h('span', { className: 'bc_val' }, todayText),
            ),
          ),
        ),
      )

      return h('div', { className: 'bc_row' }, button, panel)
    }

    /**
     * Register the row, keep balances fresh, and charge observed decreases to
     * the ledger.
     * @param ctx - client plugin context.
     */
    function apply(ctx) {
      if (h === null || typeof ctx.slots === 'undefined') return

      injectCss()

      var stats = loadStats()
      var settings = loadSettings()
      var fx = loadFx()
      var store = createStore({ phase: 'idle', wallets: [], bonus: [], stats: stats, settings: settings, fx: fx, at: 0 })
      var inFlight = null
      var fxInFlight = null
      var fxTimer = 0
      var pendingTimer = 0
      var saveTimer = 0
      var settleTimers = []
      var lastReadAt = 0
      var pollTimer = 0
      var disposed = false
      /** The run that owns observed spend: `{ sessionId, startedAt, endedAt }`. */
      var run = null

      /** Persist at most once per burst; the ledger is small and write-light. */
      function persist() {
        if (saveTimer !== 0) return
        saveTimer = window.setTimeout(function () {
          saveTimer = 0
          saveStats(stats)
        }, 800)
      }

      /** Publish a new snapshot so `useSyncExternalStore` re-renders. */
      function publish(phase, wallets, bonus, at) {
        store.set({ phase: phase, wallets: wallets, bonus: bonus, stats: stats, settings: settings, fx: fx, at: at })
      }

      /** Republish the current values after a settings or ledger change. */
      function republish() {
        var current = store.getSnapshot()
        store.set({
          phase: current.phase,
          wallets: current.wallets,
          bonus: current.bonus,
          stats: stats,
          settings: settings,
          fx: fx,
          at: current.at,
        })
      }

      /** The run a decrease belongs to, or null when it is unattributable. */
      function attribution(now) {
        if (run === null) return null
        if (run.endedAt === 0) {
          // A run left open across a suspended app must not swallow later spend.
          return now - run.startedAt <= 6 * 3_600_000 ? run : null
        }
        return now - run.endedAt <= SETTLE_WINDOW_MS ? run : null
      }

      /**
       * A session the Host reports as running, for spend observed without a run
       * event — a plugin loaded mid-task never saw that task start.
       * @returns the session id, or null.
       */
      function runningSession() {
        var service = typeof ctx.get === 'function' ? ctx.get('sessions') : undefined
        var list = service && service.list && typeof service.list.getSnapshot === 'function' ? service.list.getSnapshot() : null
        if (list === null || list === undefined || !isPlainObject(list.byId)) return null
        for (var id in list.byId) {
          var row = list.byId[id]
          if (row && row.running === true) return id
        }
        return null
      }

      /** Compare this reading with the previous one and book the decrease. */
      function book(totals, now) {
        if (stats.last === null) {
          stats.last = totals
          stats.at = now
          persist()
          return
        }
        if (run === null) {
          var live = runningSession()
          if (live !== null) run = { sessionId: live, startedAt: now, endedAt: 0 }
        }
        var previous = stats.last
        var currencies = Object.keys(totals)
        var seen = Object.keys(previous)
        for (var index = 0; index < seen.length; index++) {
          if (currencies.indexOf(seen[index]) < 0) currencies.push(seen[index])
        }
        var target = attribution(now)
        var booked = false
        for (var position = 0; position < currencies.length; position++) {
          var currency = currencies[position]
          var before = typeof previous[currency] === 'number' ? previous[currency] : 0
          var after = typeof totals[currency] === 'number' ? totals[currency] : 0
          var decrease = round6(before - after)
          // A stale baseline (app closed for a while) must not book hours of
          // unknown movement into today's bucket.
          if (decrease > 0 && now - (stats.at || 0) <= 6 * 3_600_000) {
            recordSpend(stats, currency, decrease, now, target)
            booked = true
          }
        }
        stats.last = totals
        if (booked) pruneStats(stats)
        stats.at = now
        persist()
      }

      /** The requesting UI identity Platform headers are derived from. */
      function clientMetadata() {
        var active
        if (ctx.locale && typeof ctx.locale.getSnapshot === 'function') active = ctx.locale.getSnapshot().active
        return {
          version: CLIENT_VERSION,
          locale: typeof active === 'string' && active.length > 0 ? active : 'en',
          timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
        }
      }

      /** Read the balance once and publish the outcome. */
      async function read() {
        var before = store.getSnapshot()
        // Re-reading while signed out must not flash the hidden row back for the
        // length of the request.
        if (before.phase !== 'ready' && before.phase !== 'signed-out') {
          publish('loading', before.wallets, before.bonus, before.at)
        }
        try {
          if (!ctx.remote || !ctx.remote.account) throw new Error('account remote is unavailable')
          var result = await ctx.remote.account.getBalance(clientMetadata())
          var value = result && result.ok === true ? result.value : null
          if (result && result.ok !== true) throw (result && result.error) || new Error('account balance refused')
          if (value === null || value === undefined) {
            stats.last = null
            publish('signed-out', [], [], 0)
            return
          }
          if (value.status !== 'ready') {
            var kept = store.getSnapshot()
            publish(kept.wallets.length > 0 ? 'stale' : 'failed', kept.wallets, kept.bonus, kept.at)
            return
          }
          var wallets = Array.isArray(value.value) ? value.value : []
          var bonus = Array.isArray(value.bonusWallets) ? value.bonusWallets : []
          var now = Date.now()
          book(totalsOf(wallets, bonus), now)
          publish('ready', wallets, bonus, now)
        } catch (error) {
          var current = store.getSnapshot()
          publish(current.wallets.length > 0 ? 'stale' : 'failed', current.wallets, current.bonus, current.at)
          console.warn('[balance-chip] balance read failed', error)
        }
      }

      /**
       * @param force - bypass the minimum gap (a click, or a deferred call).
       * @returns the in-flight read, or undefined when one was skipped.
       */
      function requestRefresh(force) {
        if (inFlight !== null) return inFlight
        var now = Date.now()
        var wait = force === true ? 0 : Math.max(0, MIN_REFRESH_GAP_MS - (now - lastReadAt))
        if (wait > 0) {
          if (pendingTimer === 0) {
            pendingTimer = window.setTimeout(function () {
              pendingTimer = 0
              requestRefresh(true)
            }, wait)
          }
          return
        }
        lastReadAt = now
        inFlight = read().finally(function () {
          inFlight = null
        })
        return inFlight
      }

      /** (Re)schedule the automatic poll from the current preference. */
      function schedulePoll() {
        if (pollTimer !== 0) {
          window.clearTimeout(pollTimer)
          pollTimer = 0
        }
        if (disposed) return
        var interval = settings.refreshMs
        if (!(interval > 0)) return
        pollTimer = window.setTimeout(function () {
          pollTimer = 0
          requestRefresh(false)
          schedulePoll()
        }, interval)
      }

      /** Budgets are advisory; writing one only updates local preferences. */
      function setBudget(period, currency, amount) {
        if (period !== 'daily' && period !== 'monthly') return
        if (!isPlainObject(settings.budgets)) settings.budgets = { daily: {}, monthly: {} }
        var map = settings.budgets[period]
        if (!isPlainObject(map)) map = settings.budgets[period] = {}
        if (amount === null || amount === undefined) {
          delete map[currency]
        } else {
          var value = Number(amount)
          if (!(isFinite(value) && value > 0)) return
          map[currency] = round6(Math.min(value, 1e9))
        }
        saveSettings(settings)
        republish()
      }

      function setRefresh(ms) {
        var value = Number(ms)
        if (REFRESH_CHOICES.indexOf(value) < 0) return
        settings.refreshMs = value
        saveSettings(settings)
        republish()
        schedulePoll()
      }

      /** An explicit display currency; null returns to the first wallet. */
      function setCurrency(code) {
        settings.currency = typeof code === 'string' && /^[A-Z]{3}$/.test(code) ? code : null
        saveSettings(settings)
        republish()
      }

      /** Plugin-local UI language; null follows the host locale. */
      function setLocale(code) {
        settings.locale = LOCALE_CODES.indexOf(code) >= 0 ? code : null
        saveSettings(settings)
        republish()
      }

      /**
       * Fetch the CNY→USD reference rate. A plain public HTTPS GET from the
       * renderer: no Platform call and no model tokens.
       */
      function refreshFx() {
        if (fxInFlight !== null) return fxInFlight
        if (typeof fetch !== 'function') return undefined
        var controller = typeof AbortController === 'function' ? new AbortController() : null
        var timer = window.setTimeout(function () {
          if (controller !== null) controller.abort()
        }, 10_000)
        var request = controller === null ? {} : { signal: controller.signal }
        fxInFlight = fetch(FX_URL, request)
          .then(function (response) {
            if (!response || response.ok !== true) throw new Error('fx http failure')
            return response.json()
          })
          .then(function (body) {
            var rate = body && body.rates ? Number(body.rates.USD) : NaN
            if (!(isFinite(rate) && rate > 0)) throw new Error('fx invalid rate')
            fx = {
              v: 1,
              base: 'CNY',
              quote: 'USD',
              rate: round6(rate),
              date: typeof body.date === 'string' ? body.date : '',
              fetchedAt: Date.now(),
              attemptedAt: Date.now(),
              source: 'frankfurter',
            }
            saveFx(fx)
            republish()
          })
          .catch(function (error) {
            fx.attemptedAt = Date.now()
            saveFx(fx)
            console.warn('[balance-chip] exchange rate refresh failed', error)
          })
          .then(function () {
            window.clearTimeout(timer)
            fxInFlight = null
          })
        return fxInFlight
      }

      /** Re-check the weekly TTL every six hours while the app stays open. */
      function scheduleFx() {
        if (fxTimer !== 0) window.clearTimeout(fxTimer)
        if (disposed) return
        fxTimer = window.setTimeout(function () {
          fxTimer = 0
          if (fxNeedsRefresh(fx, Date.now())) refreshFx()
          scheduleFx()
        }, 6 * 3_600_000)
      }

      function clearStats() {
        stats = emptyStats()
        saveStats(stats)
        republish()
      }

      function exportJson() {
        downloadText('dsh-balance-chip-' + dayKey(Date.now()) + '.json', buildBackup(stats, settings), 'application/json;charset=utf-8')
      }

      function exportCsv() {
        downloadText('dsh-balance-chip-' + dayKey(Date.now()) + '.csv', buildCsv(stats), 'text/csv;charset=utf-8')
      }

      /** Replace the ledger from a backup file; a bad file changes nothing. */
      function importJson(text) {
        var parsed
        try {
          parsed = parseBackup(text)
        } catch (error) {
          return { ok: false, message: error && error.message ? error.message : 'invalid file' }
        }
        stats = parsed.stats
        // A baseline from another machine would book the balance difference as
        // spend on the next read; re-seed it instead.
        stats.last = null
        stats.at = 0
        if (parsed.settings !== null) settings = parsed.settings
        saveStats(stats)
        saveSettings(settings)
        republish()
        schedulePoll()
        return { ok: true, days: Object.keys(stats.days).length }
      }

      /**
       * Start or end a run from the session status stream. A run's charges keep
       * landing after it reports idle, so an ended run stays the attribution
       * target for the settlement window.
       * @param sessionId - the session that changed state.
       * @param running - whether an agent run is in flight.
       */
      function onSessionStatus(sessionId, running) {
        if (typeof sessionId !== 'string' || sessionId.length === 0) return
        if (running === true) {
          if (run !== null && run.sessionId === sessionId && run.endedAt === 0) return
          run = { sessionId: sessionId, startedAt: Date.now(), endedAt: 0 }
          return
        }
        if (run === null || run.sessionId !== sessionId || run.endedAt !== 0) return
        run.endedAt = Date.now()
        // Charges are booked just after the request completes: re-read on a
        // short schedule so the end of a task is attributed to it, not to the
        // next one.
        for (var index = 0; index < SETTLE_READS.length; index++) {
          settleTimers.push(
            window.setTimeout(function () {
              requestRefresh(true)
            }, SETTLE_READS[index]),
          )
        }
      }

      if (ctx.locale && typeof ctx.locale.register === 'function') {
        ctx.effect(
          function () {
            return ctx.locale.register(NS, { zh: zh, en: en, it: it })
          },
          'balance-chip: dictionaries',
        )
      }

      function mount() {
        return ctx.slots.inject('sidebar.footer.action', function () {
          return ctx.slots.register(
            {
              name: 'sidebar.footer.action',
              id: 'balance-chip',
              order: -100,
              locale: NS,
              inject: function () {
                return {
                  store: store,
                  refresh: requestRefresh,
                  actions: {
                    setBudget: setBudget,
                    setRefresh: setRefresh,
                    setCurrency: setCurrency,
                    setLocale: setLocale,
                    refreshFx: refreshFx,
                    clearStats: clearStats,
                    exportJson: exportJson,
                    exportCsv: exportCsv,
                    importJson: importJson,
                  },
                }
              },
            },
            BalanceChip,
          )
        })
      }

      // The owner page always reads allowed; a non-owner page without the
      // account grant renders nothing rather than a permanently empty row.
      if (ctx.remoteAccess && typeof ctx.remoteAccess.whenAccess === 'function') {
        ctx.remoteAccess.whenAccess('account/watch', mount)
      } else {
        mount()
      }

      ctx.effect(function () {
        schedulePoll()
        if (fxNeedsRefresh(fx, Date.now())) refreshFx()
        scheduleFx()
        var disposeStatus = null
        var disposeCredentials = null
        if (ctx.remote && typeof ctx.remote.$on === 'function') {
          try {
            disposeStatus = ctx.remote.$on('api-session/status', onSessionStatus)
          } catch (error) {
            disposeStatus = null
          }
          try {
            disposeCredentials = ctx.remote.$on('credentials/reference-updated', function () {
              requestRefresh(true)
            })
          } catch (error) {
            disposeCredentials = null
          }
        }
        var onVisibility = function () {
          if (document.visibilityState === 'visible' && settings.refreshMs > 0) requestRefresh(false)
        }
        var onPageHide = function () {
          if (saveTimer !== 0) {
            window.clearTimeout(saveTimer)
            saveTimer = 0
          }
          saveStats(stats)
        }
        document.addEventListener('visibilitychange', onVisibility)
        window.addEventListener('pagehide', onPageHide)
        requestRefresh(true)
        return function () {
          disposed = true
          if (pollTimer !== 0) {
            window.clearTimeout(pollTimer)
            pollTimer = 0
          }
          if (fxTimer !== 0) {
            window.clearTimeout(fxTimer)
            fxTimer = 0
          }
          if (typeof disposeStatus === 'function') disposeStatus()
          if (typeof disposeCredentials === 'function') disposeCredentials()
          document.removeEventListener('visibilitychange', onVisibility)
          window.removeEventListener('pagehide', onPageHide)
          if (pendingTimer !== 0) {
            window.clearTimeout(pendingTimer)
            pendingTimer = 0
          }
          for (var index = 0; index < settleTimers.length; index++) window.clearTimeout(settleTimers[index])
          settleTimers.length = 0
          if (saveTimer !== 0) {
            window.clearTimeout(saveTimer)
            saveTimer = 0
          }
          saveStats(stats)
        }
      }, 'balance-chip: refresh loop')
    }

    exports.apply = apply
    exports.inject = ['slots', 'locale', 'remote', 'remote.account', 'remoteAccess']
    // Exposed for this package's offline check; not part of the plugin contract.
    exports.__test = {
      BalanceChip: BalanceChip,
      StatsPanel: StatsPanel,
      SettingsView: SettingsView,
      DetailView: DetailView,
      buildStats: sanitizeStats,
      buildSettings: sanitizeSettings,
      emptySettings: emptySettings,
      dayKey: dayKey,
      formatMoney: formatMoney,
      recordSpend: recordSpend,
      emptyStats: emptyStats,
      sessionRows: sessionRows,
      runRows: runRows,
      weekSessionTotals: weekSessionTotals,
      sessionDayRows: sessionDayRows,
      daySeries: daySeries,
      displayCurrency: displayCurrency,
      availableCurrencies: availableCurrencies,
      walletsDisplayText: walletsDisplayText,
      fxRate: fxRate,
      convertAmount: convertAmount,
      sumConverted: sumConverted,
      emptyFx: emptyFx,
      buildFx: sanitizeFx,
      fxNeedsRefresh: fxNeedsRefresh,
      totalsOf: totalsOf,
      monthSpend: monthSpend,
      averageDailySpend: averageDailySpend,
      runwayDays: runwayDays,
      runwayTextOf: runwayTextOf,
      buildCsv: buildCsv,
      buildBackup: buildBackup,
      parseBackup: parseBackup,
      budgetAmount: budgetAmount,
    }
    return module.exports
  },
})
