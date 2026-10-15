import { isGoogleUrl } from '../shared/google'
interface Env { SUPABASE_URL: string; SUPABASE_ANON_KEY: string; ASSETS: { fetch: (request: Request) => Promise<Response> } }
const page = (msg: string, status = 200) => new Response(
  `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Mouger</title><body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#f1f5f9;color:#0b1f3a"><h1 style="font-size:20px;text-align:center;padding:24px">${msg}</h1>`,
  { status, headers: { 'content-type': 'text/html;charset=utf-8', 'cache-control': 'no-store' } })
export default {
 async fetch(req: Request, env: Env): Promise<Response> {
  const match = new URL(req.url).pathname.match(/^\/r\/([^/]+)\/?$/)
  if (!match) return env.ASSETS.fetch(req)
  const code = match[1].toUpperCase()
  if (!/^[A-Z0-9]{10}$/.test(code)) return page('Enlace no disponible', 404)
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return page('Servicio no disponible temporalmente', 503)
  try {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/resolve_redirect`, { method: 'POST',
headers: { apikey: env.SUPABASE_ANON_KEY, 'content-type': 'application/json' },    body: JSON.stringify({ p_code: code }) })
  if (!r.ok) return page('Servicio no disponible temporalmente', 503)
  const [row] = (await r.json()) as { status: string; url: string | null }[]
  if (!row) return page('Enlace no disponible', 404)
  if (row.status === 'disponible' || !row.url) return page('Este dispositivo aún no ha sido configurado')
  if ((row.status === 'asignado' || row.status === 'vendido') && isGoogleUrl(row.url))
    return new Response(null, { status: 302, headers: { location: row.url, 'cache-control': 'no-store' } })
  return page('Enlace no disponible', 404)
}
 catch { return page('Servicio no disponible temporalmente', 503) }
 }
}
