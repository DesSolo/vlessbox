// Сборка конфига sing-box (схема 1.11+) из распарсенных VLESS-узлов.

/** Транспорт sing-box из нормализованного узла. tcp -> undefined (без секции transport). */
function buildTransport(node) {
  const { network } = node
  // путь может содержать early-data: /path?ed=2048
  let path = node.path || ''
  let earlyData = 0
  const edMatch = path.match(/[?&]ed=(\d+)/)
  if (edMatch) {
    earlyData = Number(edMatch[1])
    path = path.replace(/[?&]ed=\d+/, '')
  }

  switch (network) {
    case 'ws': {
      const t = { type: 'ws', path: path || '/' }
      if (node.host) t.headers = { Host: node.host }
      if (earlyData) {
        t.max_early_data = earlyData
        t.early_data_header_name = 'Sec-WebSocket-Protocol'
      }
      return t
    }
    case 'grpc':
      return { type: 'grpc', service_name: node.serviceName || path.replace(/^\//, '') }
    case 'http':
    case 'h2': {
      const t = { type: 'http', path: path || '/' }
      if (node.host) t.host = node.host.split(',').map((s) => s.trim())
      return t
    }
    case 'httpupgrade': {
      const t = { type: 'httpupgrade', path: path || '/' }
      if (node.host) t.host = node.host
      return t
    }
    case 'quic':
      return { type: 'quic' }
    case 'tcp':
    case 'raw':
    default:
      return undefined
  }
}

/** TLS-секция sing-box. Возвращает undefined, если шифрование транспорта не используется. */
function buildTLS(node) {
  if (!['tls', 'reality', 'xtls'].includes(node.security)) return undefined

  const tls = {
    enabled: true,
    server_name: node.sni || node.host || node.server,
  }
  if (node.allowInsecure) tls.insecure = true
  if (node.alpn) tls.alpn = node.alpn.split(',').map((s) => s.trim()).filter(Boolean)
  if (node.fp) tls.utls = { enabled: true, fingerprint: node.fp }

  if (node.security === 'reality' && node.pbk) {
    tls.reality = {
      enabled: true,
      public_key: node.pbk,
      short_id: node.sid || '',
    }
    // для reality utls обязателен
    if (!tls.utls) tls.utls = { enabled: true, fingerprint: 'chrome' }
  }
  return tls
}

/** Один outbound типа vless. */
export function buildOutbound(node) {
  const out = {
    type: 'vless',
    tag: node.name,
    server: node.server,
    server_port: node.port,
    uuid: node.uuid,
  }
  if (node.flow) out.flow = node.flow

  const tls = buildTLS(node)
  if (tls) out.tls = tls

  const transport = buildTransport(node)
  if (transport) out.transport = transport

  return out
}

const DEFAULTS = {
  mixedPort: 2080,
  listenAddress: '127.0.0.1',
  enableTun: true,
  remoteDns: 'tls://1.1.1.1',
  localDns: 'h3://223.5.5.5/dns-query',
  testUrl: 'https://www.gstatic.com/generate_204',
}

/**
 * Полный конфиг sing-box.
 * nodes — массив нормализованных узлов, options — переопределения DEFAULTS.
 */
export function buildConfig(nodes, options = {}) {
  const opt = { ...DEFAULTS, ...options }
  const outbounds = nodes.map(buildOutbound)
  const tags = outbounds.map((o) => o.tag)

  const inbounds = []
  if (opt.enableTun) {
    inbounds.push({
      type: 'tun',
      tag: 'tun-in',
      address: ['172.18.0.1/30', 'fdfe:dcba:9876::1/126'],
      auto_route: true,
      strict_route: true,
      stack: 'mixed',
    })
  }
  inbounds.push({
    type: 'mixed',
    tag: 'mixed-in',
    listen: opt.listenAddress,
    listen_port: opt.mixedPort,
  })

  const proxyOutbounds = tags.length ? ['auto', ...tags] : ['direct']

  return {
    log: { level: 'info', timestamp: true },
    dns: {
      servers: [
        { tag: 'remote', address: opt.remoteDns, detour: 'proxy' },
        { tag: 'local', address: opt.localDns, detour: 'direct' },
      ],
      rules: [],
      final: 'remote',
      strategy: 'prefer_ipv4',
    },
    inbounds,
    outbounds: [
      { type: 'selector', tag: 'proxy', outbounds: proxyOutbounds, default: proxyOutbounds[0] },
      {
        type: 'urltest',
        tag: 'auto',
        outbounds: tags.length ? tags : ['direct'],
        url: opt.testUrl,
        interval: '5m',
        tolerance: 50,
      },
      ...outbounds,
      { type: 'direct', tag: 'direct' },
    ],
    route: {
      rules: [
        { action: 'sniff' },
        { protocol: 'dns', action: 'hijack-dns' },
        { ip_is_private: true, outbound: 'direct' },
      ],
      final: 'proxy',
      auto_detect_interface: true,
    },
  }
}

export { DEFAULTS }
