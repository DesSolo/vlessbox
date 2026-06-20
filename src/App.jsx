import { useMemo, useState } from 'react'
import { parseSubscription } from './lib/vless.js'
import { buildConfig, DEFAULTS } from './lib/singbox.js'

const networkBadge = {
  tcp: 'bg-slate-600',
  ws: 'bg-sky-600',
  grpc: 'bg-violet-600',
  http: 'bg-emerald-600',
  h2: 'bg-emerald-600',
  httpupgrade: 'bg-teal-600',
  quic: 'bg-amber-600',
}

export default function App() {
  const [raw, setRaw] = useState('')
  const [options, setOptions] = useState(DEFAULTS)
  const [copied, setCopied] = useState(false)

  const { nodes, errors } = useMemo(
    () => (raw ? parseSubscription(raw) : { nodes: [], errors: [] }),
    [raw],
  )

  const config = useMemo(
    () => (nodes.length ? buildConfig(nodes, options) : null),
    [nodes, options],
  )
  const configText = useMemo(
    () => (config ? JSON.stringify(config, null, 2) : ''),
    [config],
  )

  function handleCopy() {
    navigator.clipboard.writeText(configText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleDownload() {
    const blob = new Blob([configText], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'config.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            VLESS&nbsp;→&nbsp;<span className="text-sky-400">sing-box</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Конвертация vless:// ссылок в готовый конфиг sing-box (схема 1.11+).
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ЛЕВАЯ КОЛОНКА — ввод */}
          <section className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                vless:// ссылки
              </label>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="vless://...&#10;vless://..."
                rows={6}
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-xs outline-none focus:border-sky-500"
              />
            </div>

            <OptionsPanel options={options} setOptions={setOptions} />

            {/* список узлов */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">
                  Узлы: {nodes.length}
                </h2>
                {errors.length > 0 && (
                  <span className="text-xs text-amber-400">
                    пропущено битых: {errors.length}
                  </span>
                )}
              </div>
              {nodes.length === 0 ? (
                <p className="text-sm text-slate-500">Узлы не найдены.</p>
              ) : (
                <ul className="max-h-64 space-y-1 overflow-auto">
                  {nodes.map((n, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-md bg-slate-800/60 px-2 py-1.5 text-xs"
                    >
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                          networkBadge[n.network] || 'bg-slate-600'
                        }`}
                      >
                        {n.network}
                      </span>
                      {n.security !== 'none' && (
                        <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] uppercase">
                          {n.security}
                        </span>
                      )}
                      <span className="truncate text-slate-200">{n.name}</span>
                      <span className="ml-auto shrink-0 font-mono text-slate-500">
                        {n.server}:{n.port}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ПРАВАЯ КОЛОНКА — вывод */}
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300">config.json</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  disabled={!configText}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800 disabled:opacity-40"
                >
                  {copied ? 'Скопировано ✓' : 'Копировать'}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!configText}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500 disabled:opacity-40"
                >
                  Скачать
                </button>
              </div>
            </div>
            <pre className="max-h-[70vh] overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300">
              {configText || '// сгенерированный конфиг появится здесь'}
            </pre>
          </section>
        </div>

        <footer className="mt-8 text-center text-xs text-slate-600">
          Всё работает в браузере. Ссылки никуда не отправляются.
        </footer>
      </div>
    </div>
  )
}

// Иконка-подсказка: при наведении показывает нативный tooltip с описанием параметра.
function Hint({ text }) {
  return (
    <span
      title={text}
      className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-slate-600 text-[9px] font-bold text-slate-400 hover:border-sky-500 hover:text-sky-400"
      aria-label={text}
    >
      ?
    </span>
  )
}

function FieldLabel({ children, hint }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-400">
      {children}
      <Hint text={hint} />
    </span>
  )
}

function OptionsPanel({ options, setOptions }) {
  const set = (k, v) => setOptions((o) => ({ ...o, [k]: v }))
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-300">Параметры конфига</h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <FieldLabel hint="Локальный порт mixed-инбаунда: на нём sing-box принимает SOCKS5- и HTTP-прокси одновременно. Этот порт указывают в настройках браузера или системного прокси.">
            Порт mixed (SOCKS/HTTP)
          </FieldLabel>
          <input
            type="number"
            value={options.mixedPort}
            onChange={(e) => set('mixedPort', Number(e.target.value) || 2080)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 outline-none focus:border-sky-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel hint="Адрес (listen), на котором слушает mixed-инбаунд. 127.0.0.1 — доступ только с этого компьютера. 0.0.0.0 — доступ из локальной сети: другие устройства смогут ходить через прокси (откройте порт в фаерволе и помните о безопасности).">
            Адрес прослушивания
          </FieldLabel>
          <input
            type="text"
            value={options.listenAddress}
            onChange={(e) => set('listenAddress', e.target.value)}
            placeholder="127.0.0.1"
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 font-mono text-xs outline-none focus:border-sky-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel hint="DNS-сервер для доменов, которые резолвятся через прокси (detour: proxy). Защищает от утечки и подмены DNS на стороне провайдера. Напр. tls://1.1.1.1 или https://dns.google/dns-query.">
            Remote DNS
          </FieldLabel>
          <input
            type="text"
            value={options.remoteDns}
            onChange={(e) => set('remoteDns', e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 font-mono text-xs outline-none focus:border-sky-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel hint="DNS-сервер для прямых соединений в обход прокси (detour: direct) — например для локальных и национальных доменов. Обычно быстрый ближайший резолвер.">
            Local DNS
          </FieldLabel>
          <input
            type="text"
            value={options.localDns}
            onChange={(e) => set('localDns', e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 font-mono text-xs outline-none focus:border-sky-500"
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          <FieldLabel hint="URL для проверки задержки в группе auto (urltest). sing-box периодически запрашивает его через каждый узел и выбирает самый быстрый. Должен отдавать ответ без тела, обычно HTTP 204.">
            URL проверки задержки (urltest)
          </FieldLabel>
          <input
            type="text"
            value={options.testUrl}
            onChange={(e) => set('testUrl', e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 font-mono text-xs outline-none focus:border-sky-500"
          />
        </label>
        <label className="col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.enableTun}
            onChange={(e) => set('enableTun', e.target.checked)}
            className="h-4 w-4 accent-sky-500"
          />
          <span className="flex items-center gap-1.5 text-xs text-slate-300">
            TUN inbound (системный VPN)
            <Hint text="Создаёт виртуальный сетевой интерфейс и заворачивает в прокси весь системный трафик (режим VPN), а не только приложения, настроенные на прокси-порт. Требует прав администратора/root." />
          </span>
        </label>
      </div>
    </div>
  )
}
