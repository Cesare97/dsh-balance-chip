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

console.log('')
if (failures > 0) {
  console.error(`${failures} check(s) failed`)
  process.exitCode = 1
} else {
  console.log('all checks passed')
}
