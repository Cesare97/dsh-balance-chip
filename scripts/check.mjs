// Offline check for the browser half of dsh-balance-chip.
//
// The plugin bundle is a lazy-CJS module factory: it needs `window`, `document`,
// and the shell's shared module table, none of which exist in Node. This script
// supplies the same-shaped stubs and drives `apply`, the row component, the
// detail panel, and the spend ledger directly, so the registration contract,
// the formatting rules, and the attribution paths are checked without a browser.
//
// Run with the harness runtime, e.g.:
//   ELECTRON_RUN_AS_NODE=1 "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness" scripts/check.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const SOURCE = fileURLToPath(new URL('../lib/client.js', import.meta.url))

let failures = 0
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok   ${name}`)
    return
  }
  failures += 1
  console.log(`  FAIL ${name}${detail === undefined ? '' : ` — ${detail}`}`)
}

/** Minimal React element model: enough to walk the returned tree. */
function createElement(type, props, ...children) {
  return { type, props: { ...(props ?? {}), children: children.flat(Infinity) } }
}

/** Fake React: hooks read straight through the store and never schedule work. */
const react = {
  createElement,
  useEffect() {},
  useLayoutEffect() {},
  useRef(value) {
    return { current: value }
  },
  useState(initial) {
    return [typeof initial === 'function' ? initial() : initial, () => {}]
  },
  useSyncExternalStore(_subscribe, getSnapshot) {
    return getSnapshot()
  },
}

function textOf(node) {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return textOf(node.props?.children)
}

/** Every element in the tree, depth first. */
function elementsOf(node, out = []) {
  if (node === null || node === undefined || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const item of node) elementsOf(item, out)
    return out
  }
  out.push(node)
  elementsOf(node.props?.children, out)
  return out
}

function classed(tree, className) {
  return elementsOf(tree).find((node) => typeof node.props?.className === 'string' && node.props.className.split(' ').includes(className))
}

function allClassed(tree, className) {
  return elementsOf(tree).filter((node) => typeof node.props?.className === 'string' && node.props.className.split(' ').includes(className))
}

/** Timer queue so the ledger's debounced save can be flushed on demand. */
function createTimers() {
  const pending = new Map()
  let next = 1
  return {
    setTimeout(fn) {
      const id = next++
      pending.set(id, { fn, cancelled: false })
      return id
    },
    clearTimeout(id) {
      const entry = pending.get(id)
      if (entry !== undefined) entry.cancelled = true
      pending.delete(id)
    },
    run() {
      const entries = [...pending.values()]
      pending.clear()
      for (const entry of entries) if (!entry.cancelled) entry.fn()
    },
    get size() {
      return pending.size
    },
  }
}

/**
 * Load the bundle once and return its cordis-plugin exports.
 * @param moduleTable - what the shell's shared table answers for this bundle.
 */
function loadBundle(moduleTable) {
  const loaded = []
  const styleTags = []
  const timers = createTimers()
  const stored = new Map()
  const documentStub = {
    visibilityState: 'visible',
    querySelector: () => null,
    createElement: (tag) => ({ tag, dataset: {}, textContent: '' }),
    head: {
      appendChild(node) {
        styleTags.push(node)
      },
    },
    addEventListener() {},
    removeEventListener() {},
  }
  const windowStub = {
    __ModuleLoader__: {
      load(definition) {
        loaded.push(definition)
      },
    },
    localStorage: {
      getItem: (key) => (stored.has(key) ? stored.get(key) : null),
      setItem: (key, value) => stored.set(key, value),
    },
    innerWidth: 1280,
    innerHeight: 800,
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: (fn) => timers.setTimeout(fn),
    clearTimeout: (id) => timers.clearTimeout(id),
    addEventListener() {},
    removeEventListener() {},
  }

  const sandbox = {
    window: windowStub,
    document: documentStub,
    console,
    Date,
    Math,
    Number,
    String,
    Object,
    Array,
    Set,
    JSON,
    isFinite,
  }
  vm.createContext(sandbox)
  vm.runInContext(readFileSync(SOURCE, 'utf8'), sandbox, { filename: 'client.js' })

  const definition = loaded[0]
  const requireStub = (name) => {
    if (name in moduleTable) return moduleTable[name]
    throw new Error(`module "${name}" is not in the shared table`)
  }
  const exports = definition.factory(requireStub)
  return { definition, exports, styleTags, timers, stored }
}

/** Build a client context that records slot work and session status handlers. */
function createContext({ getBalance, dictionaries, sessions }) {
  const effectDisposers = []
  const registrations = []
  const injectCalls = []
  const handlers = {}
  const ctx = {
    get(name) {
      if (name === 'sessions' && sessions !== undefined) return { list: { getSnapshot: () => sessions } }
      return undefined
    },
    effect(factory) {
      effectDisposers.push(factory())
    },
    locale: {
      register(namespace, dicts) {
        if (dictionaries !== undefined) dictionaries.namespace = namespace
        return () => {}
      },
      getSnapshot: () => ({ active: 'zh' }),
    },
    remote: {
      account: { getBalance },
      $on(name, handler) {
        handlers[name] = handler
        return () => {
          delete handlers[name]
        }
      },
    },
    remoteAccess: {
      whenAccess(_action, register) {
        register()
      },
    },
    slots: {
      inject(name, register) {
        injectCalls.push(name)
        return register()
      },
      register(options, component) {
        registrations.push({ options, component })
        return () => {}
      },
    },
  }
  return { ctx, registrations, injectCalls, handlers }
}

/** Let the plugin's async read settle. */
async function settle() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const zhCopy = {
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
  dailyBudget: '每日预算',
  monthlyBudget: '每月预算',
  budgetUnset: '不限',
  budgetInvalid: '预算需为正数',
  refreshInterval: '刷新间隔',
  currency: '显示币种',
  auto: '自动',
  exchangeRate: '汇率',
  refreshRate: '刷新汇率',
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

function t(key) {
  return zhCopy[key] ?? key
}

/** A Platform wallet response body. */
function ready(value, bonus = []) {
  return { ok: true, value: { status: 'ready', value, bonusWallets: bonus } }
}

/**
 * Boot one plugin instance.
 * @param getBalance - the Remote body to answer with.
 * @param sessions - optional sessions-list snapshot the Host would serve.
 */
function boot(getBalance, sessions) {
  const dictionaries = {}
  const bundle = loadBundle({
    react,
    '@deepseek-ai/dsh-client-ui-primitives': {
      Tooltip: (props) => createElement('tooltip-stub', props, props.children),
    },
  })
  const context = createContext({ getBalance, dictionaries, sessions })
  bundle.exports.apply(context.ctx)
  return { ...bundle, ...context, dictionaries }
}

/** Render the registered row. */
function renderRow(registration, wide, sessions) {
  const inject = registration.options.inject ?? (() => ({}))
  return registration.component({ wide, ...inject(), t, useSessions: sessions === undefined ? undefined : () => sessions })
}

function lineText(tree, className) {
  return textOf(classed(tree, className))
}

console.log('registration contract')
{
  const { definition, exports, styleTags } = loadBundle({
    react,
    '@deepseek-ai/dsh-client-ui-primitives': { Tooltip: (props) => createElement('tooltip-stub', props, props.children) },
  })
  check('bundle registers under the package id', definition.id === 'dsh-balance-chip', definition.id)
  const { ctx, registrations, injectCalls } = createContext({ getBalance: async () => ready([{ currency: 'CNY', balance: '1' }]) })
  exports.apply(ctx)
  await settle()
  check('declares the client services it uses', Array.isArray(exports.inject) && exports.inject.includes('slots'), JSON.stringify(exports.inject))
  check('waits for the sidebar foot slot', injectCalls.includes('sidebar.footer.action'), JSON.stringify(injectCalls))
  check('registers exactly one row', registrations.length === 1, String(registrations.length))
  const registration = registrations[0]
  check('row targets sidebar.footer.action', registration?.options.name === 'sidebar.footer.action', registration?.options.name)
  check('row id is stable', registration?.options.id === 'balance-chip', registration?.options.id)
  check('row sorts above other foot actions', registration?.options.order === -100, String(registration?.options.order))
  check('dictionaries use the row namespace', registration?.options.locale === 'balance-chip', registration?.options.locale)
  check('styles are installed once', styleTags.length === 1 && styleTags[0].dataset.plugin === 'dsh-balance-chip', String(styleTags.length))
}

console.log('\nbalance display')
{
  const { registrations } = boot(async () =>
    ready([{ currency: 'CNY', balance: '1234.5' }], [{ currency: 'CNY', balance: '2' }, { currency: 'CNY', balance: '0' }]),
  )
  await settle()
  const registration = registrations[0]
  const tree = renderRow(registration, true)

  check('wide row is a button', classed(tree, 'bc_button')?.type === 'button', classed(tree, 'bc_button')?.type)
  check('row offers a dialog', classed(tree, 'bc_button')?.props['aria-haspopup'] === 'dialog', classed(tree, 'bc_button')?.props['aria-haspopup'])
  check('formats the topped-up balance', lineText(tree, 'bc_line') === '余额¥1,234.50', lineText(tree, 'bc_line'))
  check('shows the granted balance', lineText(tree, 'bc_meta').includes('赠送¥2.00'), lineText(tree, 'bc_meta'))
  check('shows today spend', lineText(tree, 'bc_meta').includes('今日¥0.00'), lineText(tree, 'bc_meta'))
  check('aria label carries both balances', String(classed(tree, 'bc_button')?.props['aria-label']).includes('赠送 ¥2.00'), String(classed(tree, 'bc_button')?.props['aria-label']))

  const rail = renderRow(registration, false)
  check('rail renders the currency glyph', textOf(classed(rail, 'bc_railGlyph')) === '¥', textOf(classed(rail, 'bc_railGlyph')))
  check('rail marks itself', rail.props['data-rail'] === 'true', String(rail.props['data-rail']))
}

console.log('\nmoney formatting')
{
  const { exports } = loadBundle({ react, '@deepseek-ai/dsh-client-ui-primitives': {} })
  const format = exports.__test.formatMoney
  check('sub-cent keeps the less-than form', format('0.004', 'CNY') === '<¥0.01', format('0.004', 'CNY'))
  check('does not lose a cent to binary float', format('0.29', 'CNY') === '¥0.29', format('0.29', 'CNY'))
  check('zero stays a real zero', format('0', 'CNY') === '¥0.00', format('0', 'CNY'))
  check('groups thousands', format('1234567.891', 'CNY') === '¥1,234,567.89', format('1234567.891', 'CNY'))
  check('negative balances keep the sign', format('-0.005', 'CNY') === '-¥0.01', format('-0.005', 'CNY'))
}

console.log('\nsigned out')
{
  const { registrations } = boot(async () => ({ ok: true, value: null }))
  await settle()
  const registration = registrations[0]
  check('renders nothing while signed out', renderRow(registration, true) === null, String(renderRow(registration, true)))
  check('rail renders nothing while signed out', renderRow(registration, false) === null, String(renderRow(registration, false)))
  const { store, refresh } = registration.options.inject()
  check('store settles on the signed-out phase', store.getSnapshot().phase === 'signed-out', store.getSnapshot().phase)
  const pending = refresh(true)
  check('a re-read keeps the row hidden mid-flight', store.getSnapshot().phase === 'signed-out', store.getSnapshot().phase)
  await pending
  check('still signed out after the re-read', store.getSnapshot().phase === 'signed-out', store.getSnapshot().phase)
}

console.log('\nread failure with no cached value')
{
  const { registrations } = boot(async () => ({ ok: false, error: { code: 'gateway/internal', message: 'down' } }))
  await settle()
  const registration = registrations[0]
  const tree = renderRow(registration, true)
  check('falls back to an em dash', lineText(tree, 'bc_line') === '余额—', lineText(tree, 'bc_line'))
  check('marks the balance as unavailable', classed(tree, 'bc_line')?.props['data-dim'] === 'true', String(classed(tree, 'bc_line')?.props['data-dim']))
}

console.log('\nspend ledger')
{
  let wallets = [{ currency: 'CNY', balance: '100' }]
  let bonus = []
  const { exports, registrations, handlers, timers, stored } = boot(async () => ready(wallets, bonus))
  await settle()
  const registration = registrations[0]
  const { store, refresh } = registration.options.inject()
  const stats = () => store.getSnapshot().stats
  const today = exports.__test.dayKey(Date.now())

  check('first read only seeds the baseline', (stats().days[today] ?? { CNY: 0 }).CNY === 0, JSON.stringify(stats().days))

  handlers['api-session/status']('session-A', true)
  wallets = [{ currency: 'CNY', balance: '99.5' }]
  await refresh(true)
  check('books a decrease to the day', (stats().days[today] ?? {}).CNY === 0.5, JSON.stringify(stats().days[today]))
  check('books it to the open session', stats().sessions['session-A']?.c?.CNY === 0.5, JSON.stringify(stats().sessions))
  check('books it to the open task', stats().runs.at(-1)?.c?.CNY === 0.5, JSON.stringify(stats().runs))

  handlers['api-session/status']('session-A', false)
  wallets = [{ currency: 'CNY', balance: '99' }]
  await refresh(true)
  check('keeps charging a settling task', stats().sessions['session-A']?.c?.CNY === 1, JSON.stringify(stats().sessions['session-A']))

  wallets = [{ currency: 'CNY', balance: '101' }]
  await refresh(true)
  check('a top-up is not negative spend', (stats().days[today] ?? {}).CNY === 1, JSON.stringify(stats().days[today]))

  handlers['api-session/status']('session-B', true)
  wallets = [{ currency: 'CNY', balance: '100.25' }]
  await refresh(true)
  check('attributes the next task to its own session', stats().sessions['session-B']?.c?.CNY === 0.75, JSON.stringify(stats().sessions['session-B']))
  check('accumulates the day total', (stats().days[today] ?? {}).CNY === 1.75, JSON.stringify(stats().days[today]))

  check('row reports today to date', lineText(renderRow(registration, true), 'bc_meta').includes('今日¥1.75'), lineText(renderRow(registration, true), 'bc_meta'))

  // Persistence: the debounced write lands once the timer queue is flushed.
  timers.run()
  const saved = JSON.parse(stored.get('dsh-balance-chip/stats/v1') ?? '{}')
  check('writes the ledger to localStorage', saved.days?.[today]?.CNY === 1.75, JSON.stringify(saved.days))

  // Panel: render it directly with the live ledger and a session title lookup.
  const panel = exports.__test.StatsPanel({
    state: store.getSnapshot(),
    sessions: { byId: { 'session-A': { title: '重构插件' }, 'session-B': { title: '余额统计' } } },
    currentSessionId: 'session-B',
    t,
    onRefresh: () => {},
    position: null,
  })
  const panelText = textOf(panel)
  check('panel lists the live balances', panelText.includes('余额¥100.25') && panelText.includes('赠送余额¥0.00'), panelText)
  check('panel reports today spend', panelText.includes('今日消耗¥1.75'), panelText)
  check('panel reports this session', panelText.includes('本次会话¥0.75'), panelText)
  check('panel names the sessions', panelText.includes('重构插件') && panelText.includes('余额统计'), panelText)
  check('panel draws seven day bars', allClassed(panel, 'bpc_bar').length === 7, String(allClassed(panel, 'bpc_bar').length))
  check('panel marks the current day bar', allClassed(panel, 'bpc_barFill').some((bar) => bar.props['data-today'] === 'true'), 'no today bar')
  check('panel lists recent tasks', allClassed(panel, 'bpc_item').length >= 2, String(allClassed(panel, 'bpc_item').length))
}

console.log('\nspend without a run event')
{
  let wallets = [{ currency: 'CNY', balance: '50' }]
  const { registrations } = boot(async () => ready(wallets), {
    byId: { 'session-C': { id: 'session-C', title: '没有开跑事件', running: true } },
  })
  await settle()
  const { store, refresh } = registrations[0].options.inject()
  wallets = [{ currency: 'CNY', balance: '49.5' }]
  await refresh(true)
  const stats = store.getSnapshot().stats
  check('falls back to the session the Host reports as running', stats.sessions['session-C']?.c?.CNY === 0.5, JSON.stringify(stats.sessions))
  check('still books the day total', (stats.days[Object.keys(stats.days)[0]] ?? {}).CNY === 0.5, JSON.stringify(stats.days))
  check('no longer needs the unattributed bucket', (stats.unattributed.CNY ?? 0) === 0, JSON.stringify(stats.unattributed))
}

console.log('\nsettings storage')
{
  const { exports } = loadBundle({ react, '@deepseek-ai/dsh-client-ui-primitives': {} })
  const build = exports.__test.buildSettings
  check('defaults without data', build(null).refreshMs === 30000, JSON.stringify(build(null)))
  check('rejects an unknown interval', build({ v: 1, refreshMs: 12345 }).refreshMs === 30000, String(build({ v: 1, refreshMs: 12345 }).refreshMs))
  check('accepts paused', build({ v: 1, refreshMs: 0 }).refreshMs === 0, String(build({ v: 1, refreshMs: 0 }).refreshMs))
  const kept = build({ v: 1, budgets: { daily: { CNY: 5, usd: 3 }, monthly: { CNY: 100 } }, refreshMs: 60000 })
  check('keeps valid budgets', kept.budgets.daily.CNY === 5 && kept.budgets.monthly.CNY === 100, JSON.stringify(kept.budgets))
  check('drops malformed budgets', kept.budgets.daily.usd === undefined && kept.budgets.daily.CNY === 5, JSON.stringify(kept.budgets.daily))
}

console.log('\nbudgets')
{
  const { exports, registrations } = boot(async () => ready([{ currency: 'CNY', balance: '100' }]))
  await settle()
  const registration = registrations[0]
  const { store, actions } = registration.options.inject()
  const stats = store.getSnapshot().stats
  const today = exports.__test.dayKey(Date.now())
  const prefix = today.slice(0, 7)
  const otherDay = prefix + (today.endsWith('-01') ? '-02' : '-01')
  stats.days[today] = { CNY: 6 }
  stats.days[otherDay] = { CNY: 4 }
  actions.setBudget('daily', 'CNY', 5)
  actions.setBudget('monthly', 'CNY', 20)
  const state = store.getSnapshot()
  const panel = exports.__test.StatsPanel({
    state,
    sessions: { byId: {} },
    currentSessionId: null,
    t,
    onRefresh: () => {},
    position: null,
    settings: state.settings,
    actions,
  })
  const text = textOf(panel)
  check('panel shows the month total', text.includes('本月消耗¥10.00'), text)
  check('panel shows the daily ratio', text.includes('120%'), text)
  check('panel shows the monthly ratio', text.includes('50%'), text)
  check('panel marks the over-budget bar', allClassed(panel, 'bpc_progressFill').some((node) => node.props['data-over'] === 'true'), 'no over bar')
  const row = renderRow(registration, true)
  check('row flags today over budget', allClassed(row, 'bc_group').some((node) => node.props['data-over'] === 'true'), 'no over group')
  actions.setBudget('daily', 'CNY', null)
  check('clearing a budget removes it', exports.__test.budgetAmount(store.getSnapshot().settings, 'daily', 'CNY') === null)
}

console.log('\nrunway')
{
  const { exports } = loadBundle({ react, '@deepseek-ai/dsh-client-ui-primitives': {} })
  const test = exports.__test
  const ledger = test.emptyStats()
  for (let offset = 1; offset <= 7; offset += 1) {
    ledger.days[test.dayKey(Date.now() - offset * 86400000)] = { CNY: 1 }
  }
  check('averages the last seven complete days', test.averageDailySpend(ledger, 'CNY') === 1, String(test.averageDailySpend(ledger, 'CNY')))
  check('projects days of balance', test.runwayDays(10, 1) === 10, String(test.runwayDays(10, 1)))
  check('needs a positive burn rate', test.runwayDays(10, 0) === null, String(test.runwayDays(10, 0)))
  check('renders whole days', test.runwayTextOf(10, t) === '约 10 天', test.runwayTextOf(10, t))
  check('renders less than a day', test.runwayTextOf(0.4, t) === '<1 天', test.runwayTextOf(0.4, t))
  const state = { phase: 'ready', wallets: [{ currency: 'CNY', balance: '10' }], bonus: [], stats: ledger, settings: test.emptySettings(), at: Date.now() }
  const panel = test.StatsPanel({ state, sessions: { byId: {} }, currentSessionId: null, t, onRefresh: () => {}, position: null })
  check('panel shows the runway', textOf(panel).includes('可用天数约 10 天'), textOf(panel))
}

console.log('\nexport and restore')
{
  const { exports } = loadBundle({ react, '@deepseek-ai/dsh-client-ui-primitives': {} })
  const test = exports.__test
  const ledger = test.emptyStats()
  ledger.days['2026-11-05'] = { CNY: 2, USD: 0.2 }
  ledger.days['2026-11-06'] = { CNY: 1.5 }
  const csv = test.buildCsv(ledger)
  check('csv starts with a UTF-8 BOM', csv.charCodeAt(0) === 0xfeff, String(csv.charCodeAt(0)))
  check('csv header is stable', csv.includes('date,currency,spend'), csv)
  check(
    'csv sorts dates and currencies',
    csv.indexOf('2026-11-05,CNY,2') < csv.indexOf('2026-11-05,USD,0.2') && csv.indexOf('2026-11-05') < csv.indexOf('2026-11-06'),
    csv,
  )
  const settings = test.emptySettings()
  settings.budgets.daily.CNY = 5
  const restored = test.parseBackup(test.buildBackup(ledger, settings))
  check('restores the ledger', restored.stats.days['2026-11-05'].CNY === 2, JSON.stringify(restored.stats.days))
  check('restores the budget', restored.settings.budgets.daily.CNY === 5, JSON.stringify(restored.settings.budgets))
  let rejected = false
  try {
    test.parseBackup('{"v":2}')
  } catch (error) {
    rejected = true
  }
  check('rejects an unknown ledger version', rejected)
  rejected = false
  try {
    test.parseBackup('not json')
  } catch (error) {
    rejected = true
  }
  check('rejects malformed json', rejected)
}

console.log('\nsettings actions')
{
  let reads = 0
  const { exports, registrations, timers } = boot(async () => {
    reads += 1
    return ready([{ currency: 'CNY', balance: '5' }])
  })
  await settle()
  const { store, actions } = registrations[0].options.inject()
  actions.setBudget('daily', 'CNY', 5)
  actions.clearStats()
  const cleared = store.getSnapshot()
  check('clears the ledger', Object.keys(cleared.stats.days).length === 0, JSON.stringify(cleared.stats.days))
  check('keeps the budget after clearing', exports.__test.budgetAmount(cleared.settings, 'daily', 'CNY') === 5)
  const backupLedger = exports.__test.emptyStats()
  backupLedger.days['2026-11-06'] = { CNY: 3 }
  const imported = actions.importJson(exports.__test.buildBackup(backupLedger, cleared.settings))
  check('imports a backup', imported.ok === true && store.getSnapshot().stats.days['2026-11-06'].CNY === 3, JSON.stringify(imported))
  check('re-seeds the baseline after import', store.getSnapshot().stats.last === null, JSON.stringify(store.getSnapshot().stats.last))
  const badImport = actions.importJson('{"v":9}')
  check(
    'a bad import keeps the ledger',
    badImport.ok === false && store.getSnapshot().stats.days['2026-11-06'].CNY === 3,
    JSON.stringify(badImport),
  )
  const before = reads
  actions.setRefresh(0)
  timers.run()
  timers.run()
  await settle()
  check('paused stops the poll', reads === before, String(reads - before))
  actions.setRefresh(15000)
  timers.run()
  timers.run()
  await settle()
  check('resuming schedules a read', reads === before + 1, String(reads - before))
}

console.log('\nsettings view')
{
  const { exports } = loadBundle({ react, '@deepseek-ai/dsh-client-ui-primitives': {} })
  const view = exports.__test.SettingsView({
    settings: { v: 1, budgets: { daily: { CNY: 5 }, monthly: {} }, refreshMs: 15000 },
    currency: 'CNY',
    t,
    actions: {},
  })
  const text = textOf(view)
  check('renders both budget fields', text.includes('每日预算') && text.includes('每月预算'), text)
  check('renders the interval', text.includes('刷新间隔'), text)
  check('renders the backup actions', text.includes('导出 JSON') && text.includes('导出 CSV') && text.includes('导入 JSON'), text)
  const numbers = elementsOf(view).filter((node) => node.type === 'input' && node.props.type === 'number')
  check('prefills the daily budget', numbers.length === 2 && numbers[0].props.value === '5', JSON.stringify(numbers.map((node) => node.props.value)))
}

console.log('\ncurrency selection')
{
  const { exports } = loadBundle({ react, '@deepseek-ai/dsh-client-ui-primitives': {} })
  const test = exports.__test
  const state = {
    wallets: [
      { currency: 'CNY', balance: '1' },
      { currency: 'USD', balance: '2' },
    ],
    bonus: [],
    settings: test.emptySettings(),
  }
  check('defaults to the first wallet currency', test.displayCurrency(state) === 'CNY', test.displayCurrency(state))
  state.settings.currency = 'USD'
  check('honours the explicit currency', test.displayCurrency(state) === 'USD', test.displayCurrency(state))
  state.settings.currency = 'EUR'
  check('falls back when the chosen currency is absent', test.displayCurrency(state) === 'CNY', test.displayCurrency(state))
  check('lists the held currencies', test.availableCurrencies(state).join(',') === 'CNY,USD', test.availableCurrencies(state).join(','))

  const { registrations } = boot(async () => ready([{ currency: 'CNY', balance: '5' }, { currency: 'USD', balance: '2' }]))
  await settle()
  const registration = registrations[0]
  const { store, actions } = registration.options.inject()
  actions.setCurrency('USD')
  check('stores the chosen currency', store.getSnapshot().settings.currency === 'USD', String(store.getSnapshot().settings.currency))
  check('row switches to the chosen currency', textOf(renderRow(registration, true)).includes('今日$0.00'), textOf(renderRow(registration, true)))

  const view = exports.__test.SettingsView({
    settings: { v: 1, budgets: { daily: {}, monthly: {} }, refreshMs: 30000, currency: 'USD' },
    currency: 'USD',
    currencies: ['CNY', 'USD'],
    t,
    actions: {},
  })
  check('settings render the currency picker', textOf(view).includes('显示币种'), textOf(view))
  const selects = elementsOf(view).filter((node) => node.type === 'select')
  check('currency picker preselects the stored value', selects[0].props.value === 'USD', String(selects[0].props.value))
}

console.log('\nrunway over spending days')
{
  const { exports } = loadBundle({ react, '@deepseek-ai/dsh-client-ui-primitives': {} })
  const test = exports.__test
  const ledger = test.emptyStats()
  const spends = [1, 1, 0.5, 1, 0.5]
  for (let index = 0; index < spends.length; index += 1) {
    ledger.days[test.dayKey(Date.now() - (index + 1) * 86400000)] = { CNY: spends[index] }
  }
  const average = test.averageDailySpend(ledger, 'CNY')
  check('divides by spending days, not seven', average === 0.8, String(average))
  check('projects from the spending-day average', test.runwayDays(10, average) === 12.5, String(test.runwayDays(10, average)))
  const state = { phase: 'ready', wallets: [{ currency: 'CNY', balance: '10' }], bonus: [], stats: ledger, settings: test.emptySettings(), at: Date.now() }
  const panel = test.StatsPanel({ state, sessions: { byId: {} }, currentSessionId: null, t, onRefresh: () => {}, position: null })
  check('panel floors the runway', textOf(panel).includes('可用天数约 12 天'), textOf(panel))
}

console.log('\nexchange rate')
{
  const { exports } = loadBundle({ react, '@deepseek-ai/dsh-client-ui-primitives': {} })
  const test = exports.__test
  const fx = { v: 1, base: 'CNY', quote: 'USD', rate: 0.15, date: '2026-11-06', fetchedAt: Date.now(), attemptedAt: Date.now(), source: 'frankfurter' }

  check('converts CNY to USD', test.convertAmount(10, 'CNY', 'USD', fx) === 1.5, String(test.convertAmount(10, 'CNY', 'USD', fx)))
  check('keeps the same currency untouched', test.convertAmount(10, 'CNY', 'CNY', fx) === 10, String(test.convertAmount(10, 'CNY', 'CNY', fx)))
  check('converts USD back to CNY', test.convertAmount(3, 'USD', 'CNY', fx) === 20, String(test.convertAmount(3, 'USD', 'CNY', fx)))
  check('refuses unsupported pairs', test.convertAmount(3, 'EUR', 'USD', fx) === null, String(test.convertAmount(3, 'EUR', 'USD', fx)))
  check('sums a mixed map into one currency', test.sumConverted({ CNY: 10, USD: 2 }, 'USD', fx) === 3.5, String(test.sumConverted({ CNY: 10, USD: 2 }, 'USD', fx)))
  check('renders a converted wallet total', test.walletsDisplayText([{ currency: 'CNY', balance: '10' }], 'USD', fx) === '$1.50', test.walletsDisplayText([{ currency: 'CNY', balance: '10' }], 'USD', fx))
  check('USD is always offered', test.availableCurrencies({ wallets: [{ currency: 'CNY', balance: '1' }], bonus: [] }).join(',') === 'CNY,USD', test.availableCurrencies({ wallets: [{ currency: 'CNY', balance: '1' }], bonus: [] }).join(','))

  const now = Date.now()
  check('a fresh rate needs no refresh', test.fxNeedsRefresh({ ...test.emptyFx(), fetchedAt: now - 86400000 }, now) === false)
  check('a rate older than a week refreshes', test.fxNeedsRefresh({ ...test.emptyFx(), fetchedAt: now - 8 * 86400000 }, now) === true)
  check('the default rate retries after a day', test.fxNeedsRefresh({ ...test.emptyFx(), attemptedAt: now - 2 * 86400000 }, now) === true)
  check('a recent failure is not retried', test.fxNeedsRefresh({ ...test.emptyFx(), attemptedAt: now - 3600000 }, now) === false)
  check('sanitizes a bad rate back to the default', test.buildFx({ v: 1, rate: -1 }).rate === 0.15, String(test.buildFx({ v: 1, rate: -1 }).rate))
  check('keeps a valid rate', test.buildFx({ v: 1, rate: 0.1499, fetchedAt: now }).rate === 0.1499, String(test.buildFx({ v: 1, rate: 0.1499 }).rate))

  const ledger = test.emptyStats()
  const today = test.dayKey(Date.now())
  ledger.days[today] = { CNY: 10 }
  const state = {
    phase: 'ready',
    wallets: [{ currency: 'CNY', balance: '100' }],
    bonus: [],
    stats: ledger,
    settings: { ...test.emptySettings(), currency: 'USD' },
    fx,
    at: now,
  }
  const panel = test.StatsPanel({ state, sessions: { byId: {} }, currentSessionId: null, t, onRefresh: () => {}, position: null })
  const text = textOf(panel)
  check('panel shows the converted balance', text.includes('余额$15.00'), text)
  check('panel shows the converted day total', text.includes('今日消耗$1.50'), text)

  const view = test.SettingsView({ settings: state.settings, currency: 'USD', currencies: ['CNY', 'USD'], fx, t, actions: {} })
  check('settings show the live rate', textOf(view).includes('1 CNY = 0.15 USD'), textOf(view))
  check('settings offer a rate refresh', textOf(view).includes('刷新汇率'), textOf(view))
}

console.log('')
if (failures > 0) {
  console.error(`${failures} check(s) failed`)
  process.exitCode = 1
} else {
  console.log('all checks passed')
}
