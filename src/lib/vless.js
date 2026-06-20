// Парсинг VLESS-подписок и отдельных vless:// ссылок.

/** Декодирует base64 (в т.ч. url-safe, без паддинга). Возвращает null, если не похоже на base64. */
export function tryDecodeBase64(text) {
  const trimmed = text.trim().replace(/\s+/g, '')
  if (!trimmed || !/^[A-Za-z0-9+/\-_=]+$/.test(trimmed)) return null
  try {
    let b64 = trimmed.replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4) b64 += '='
    const binary = atob(b64)
    // atob даёт latin1; декодируем как UTF-8
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return null
  }
}

/**
 * Извлекает список vless:// ссылок из содержимого подписки.
 * Контент может быть: plain-текст со ссылками, либо base64 от такого текста.
 */
export function extractLinks(raw) {
  let text = raw
  if (!/vless:\/\//i.test(text)) {
    const decoded = tryDecodeBase64(text)
    if (decoded && /vless:\/\//i.test(decoded)) text = decoded
  }
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^vless:\/\//i.test(l))
}

/** Безопасно получить значение параметра в нижнем регистре. */
function param(sp, ...keys) {
  for (const k of keys) {
    const v = sp.get(k)
    if (v != null && v !== '') return v
  }
  return ''
}

/**
 * Разбирает одну vless:// ссылку в нормализованный узел.
 * Бросает Error при некорректном формате.
 */
export function parseVless(uri) {
  const url = new URL(uri.trim())
  if (url.protocol !== 'vless:') throw new Error('не vless ссылка')

  const uuid = decodeURIComponent(url.username)
  if (!uuid) throw new Error('отсутствует UUID')

  // hostname у IPv6 приходит в скобках — убираем их
  const server = url.hostname.replace(/^\[|\]$/g, '')
  const port = Number(url.port) || 443
  if (!server) throw new Error('отсутствует адрес сервера')

  const sp = url.searchParams
  const name =
    (url.hash ? decodeURIComponent(url.hash.slice(1)) : '') ||
    `${server}:${port}`

  const network = (param(sp, 'type', 'network') || 'tcp').toLowerCase()
  const security = (param(sp, 'security') || 'none').toLowerCase()

  return {
    name,
    uuid,
    server,
    port,
    network,
    security,
    flow: param(sp, 'flow'),
    sni: param(sp, 'sni', 'peer'),
    alpn: param(sp, 'alpn'),
    fp: param(sp, 'fp'),
    pbk: param(sp, 'pbk', 'publicKey'),
    sid: param(sp, 'sid', 'shortId'),
    spx: param(sp, 'spx', 'spiderX'),
    allowInsecure:
      param(sp, 'allowInsecure', 'allowinsecure', 'insecure') === '1' ||
      param(sp, 'allowInsecure', 'allowinsecure', 'insecure') === 'true',
    path: param(sp, 'path'),
    host: param(sp, 'host'),
    serviceName: param(sp, 'serviceName', 'servicename'),
    headerType: param(sp, 'headerType', 'headertype'),
    raw: uri.trim(),
  }
}

/**
 * Парсит весь контент подписки. Возвращает { nodes, errors }.
 * errors — массив { line, message } по битым ссылкам.
 */
export function parseSubscription(raw) {
  const links = extractLinks(raw)
  const nodes = []
  const errors = []
  const seenNames = new Map()

  for (const link of links) {
    try {
      const node = parseVless(link)
      // гарантируем уникальность имён (теги в sing-box должны быть уникальны)
      let name = node.name
      if (seenNames.has(name)) {
        const n = seenNames.get(name) + 1
        seenNames.set(name, n)
        name = `${name} (${n})`
      } else {
        seenNames.set(name, 1)
      }
      nodes.push({ ...node, name })
    } catch (e) {
      errors.push({ line: link.slice(0, 60), message: e.message })
    }
  }
  return { nodes, errors }
}
