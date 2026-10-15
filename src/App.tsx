import { useEffect, useState } from 'react'
import QrScanner from './components/QrScanner'
import type { Session } from '@supabase/supabase-js'
import { LayoutDashboard, Nfc, Layers, Building2, LogOut, Copy, Download, X } from 'lucide-react'
import { sb, tagUrl, qrSvg, qrPng, save, batchPdf, isGoogleUrl, type Tag, type Business } from './lib'

const ST = ['disponible', 'asignado', 'vendido', 'suspendido', 'defectuoso']
const card = 'rounded-2xl bg-white border border-slate-200 p-5 shadow-sm'
const inp = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
const btn = 'rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50'
const btn2 = 'rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50'

export default function App() {
  const [s, setS] = useState<Session | null>(null), [ok, setOk] = useState<boolean | null>(null), [tab, setTab] = useState('dash')
  useEffect(() => { sb.auth.getSession().then(({ data }) => setS(data.session)); const { data } = sb.auth.onAuthStateChange((_, x) => setS(x)); return () => data.subscription.unsubscribe() }, [])
  useEffect(() => { if (!s) { setOk(null); return } sb.from('admins').select('user_id').maybeSingle().then(({ data }) => setOk(!!data)) }, [s])
  if (!s) return <Login />
  if (ok === null) return null
  if (!ok) return <div className="p-10">Sin acceso. <button className={btn2} onClick={() => sb.auth.signOut()}>Salir</button></div>
  const nav = [['dash', 'Dashboard', LayoutDashboard], ['inv', 'Inventario NFC', Nfc], ['batch', 'Generar lote', Layers], ['biz', 'Clientes / Negocios', Building2]] as const
  return <div className="min-h-screen md:flex bg-slate-100 text-slate-800">
    <aside className="md:w-60 md:shrink-0 bg-[#0b1f3a] text-white p-4 flex flex-col gap-1">
      <div className="font-bold text-lg px-3 py-2">Mouger NFC</div>
      <nav aria-label="Menú principal" className="grid grid-cols-2 gap-2 md:flex md:flex-col">
      {nav.map(([k, l, I]) => <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined} className={`flex items-center gap-2 px-3 py-3 rounded-lg text-sm text-left min-w-0 ${tab === k ? 'bg-blue-600' : 'hover:bg-white/10'}`}><I size={18} className="shrink-0" />{l}</button>)}
      </nav>
      <button onClick={() => sb.auth.signOut()} className="flex items-center gap-2 px-3 py-2 text-sm md:mt-auto hover:bg-white/10 rounded-lg"><LogOut size={16} />Salir</button>
    </aside>
    <main className="flex-1 min-w-0 w-full p-4 md:p-8 max-w-6xl">{tab === 'dash' ? <Dash /> : tab === 'inv' ? <Inv /> : tab === 'batch' ? <Batch /> : <Businesses />}</main>
  </div>
}

function Login() {
  const [e, setE] = useState(''), [p, setP] = useState(''), [err, setErr] = useState('')
  const go = async () => { const { error } = await sb.auth.signInWithPassword({ email: e, password: p }); if (error) setErr('Credenciales inválidas') }
  return <div className="min-h-screen grid place-items-center bg-[#0b1f3a] p-4"><div className={`${card} w-full max-w-sm space-y-3`}>
    <h1 className="text-xl font-bold text-[#0b1f3a]">Mouger NFC</h1>
    <input className={inp} placeholder="Correo" value={e} onChange={x => setE(x.target.value)} />
    <input className={inp} type="password" placeholder="Contraseña" value={p} onChange={x => setP(x.target.value)} onKeyDown={x => x.key === 'Enter' && go()} />
    {err && <p className="text-sm text-red-600">{err}</p>}<button className={`${btn} w-full`} onClick={go}>Entrar</button></div></div>
}

function Dash() {
  const [c, setC] = useState<Record<string, number>>({}), [nb, setNb] = useState(0), [log, setLog] = useState<any[]>([]), [bt, setBt] = useState<any[]>([])
  useEffect(() => { (async () => {
    const r: Record<string, number> = {}
    await Promise.all(ST.map(async s => { r[s] = (await sb.from('tags').select('*', { count: 'exact', head: true }).eq('status', s)).count || 0 })); setC(r)
    setNb((await sb.from('businesses').select('*', { count: 'exact', head: true })).count || 0)
    setLog((await sb.from('audit_log').select('*, tags(folio)').order('at', { ascending: false }).limit(8)).data || [])
    setBt((await sb.from('batches').select('*, models(name)').order('created_at', { ascending: false }).limit(5)).data || []) })() }, [])
  const total = Object.values(c).reduce((a, b) => a + b, 0)
  return <div className="space-y-5"><h2 className="text-2xl font-bold text-[#0b1f3a]">Dashboard</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['Fabricados', total], ...ST.map(s => [s, c[s] || 0]), ['Negocios', nb]].map(([l, v]) => <div key={l as string} className={card}><div className="text-xs uppercase text-slate-500">{l}</div><div className="text-3xl font-bold text-[#0b1f3a]">{v}</div></div>)}</div>
    <div className={card}>{ST.map(s => <div key={s} className="flex items-center gap-3 text-sm my-1"><span className="w-24">{s}</span><div className="flex-1 bg-slate-100 rounded h-3"><div className="bg-blue-600 h-3 rounded" style={{ width: `${total ? ((c[s] || 0) / total) * 100 : 0}%` }} /></div></div>)}</div>
    <div className="grid md:grid-cols-2 gap-3">
      <div className={card}><b>Últimas operaciones</b>{log.map(l => <div key={l.id} className="text-sm py-1 border-b border-slate-100">{l.action} {l.tags?.folio || ''} <span className="text-slate-400">{new Date(l.at).toLocaleString()}</span></div>)}</div>
      <div className={card}><b>Últimos lotes</b>{bt.map(l => <div key={l.id} className="text-sm py-1 border-b border-slate-100">#{l.batch_number} · {l.quantity} · {l.models?.name}</div>)}</div></div></div>
}

function Inv() {
  const [scanning, setScanning] = useState(false), [scanError, setScanError] = useState('')
  const findScanned = async (code: string) => {
    setScanning(false)
    setScanError('Buscando cartel…')
    try {
      const { data, error } = await sb.from('tags').select('*, businesses(trade_name), models(name)').eq('public_code', code).maybeSingle()
      if (error) { setScanError('No se pudo consultar el cartel. Intenta de nuevo.'); return }
      if (!data) { setScanError('Este QR no está registrado en tu inventario.'); return }
      setScanError('')
      setSel(data as Tag)
    } catch { setScanError('No se pudo conectar. Intenta de nuevo.') }
  }
  const [q, setQ] = useState(''), [st, setSt] = useState(''), [pg, setPg] = useState(0), [rows, setRows] = useState<Tag[]>([]), [n, setN] = useState(0), [sel, setSel] = useState<Tag | null>(null)
  const load = async () => {
    let y = sb.from('tags').select('*, businesses(trade_name), models(name)', { count: 'exact' }).order('folio').range(pg * 20, pg * 20 + 19)
    if (st) y = y.eq('status', st); const k = q.replace(/[^\w-]/g, ''); if (k) y = y.or(`folio.ilike.%${k}%,public_code.ilike.%${k}%`)
    const { data, count } = await y; setRows((data as Tag[]) || []); setN(count || 0) }
  useEffect(() => { load() }, [pg, st, q])
  return <div className="space-y-4"><h2 className="text-2xl font-bold text-[#0b1f3a]">Inventario NFC</h2>
    <button className={btn + ' w-full sm:w-auto min-h-12'} onClick={() => { setScanError(''); setScanning(true) }}>Escanear QR</button>
    <p className="text-sm text-slate-600">Escanea el cartel impreso para encontrarlo y configurar su negocio.</p>
    {scanError && <p role="status" className="text-sm text-slate-600">{scanError}</p>}
    {scanning && <QrScanner onClose={() => setScanning(false)} onDetected={findScanned} />}
    <div className="flex flex-col sm:flex-row gap-2"><input className={inp} aria-label="Buscar folio o código" placeholder="Buscar folio o código" value={q} onChange={e => { setPg(0); setQ(e.target.value) }} />
      <select className={inp + ' sm:max-w-48'} aria-label="Filtrar por estado" value={st} onChange={e => { setPg(0); setSt(e.target.value) }}><option value="">Todos</option>{ST.map(s => <option key={s}>{s}</option>)}</select></div>
    <div className="grid gap-3 md:hidden">{rows.map(t => <button key={t.id} onClick={() => setSel(t)} className={card + ' text-left space-y-2 min-w-0'}><div className="flex flex-wrap justify-between gap-2"><b>{t.folio}</b><span className="text-sm text-blue-700">{t.status}</span></div><div className="font-mono text-sm break-all">{t.public_code}</div><div className="text-sm text-slate-600 break-words">{t.models?.name} · {t.businesses?.trade_name || 'Sin negocio asignado'}</div><div className="text-sm text-blue-700">Configurar cartel →</div></button>)}</div>
    <div className={card + ' hidden md:block overflow-x-auto p-0'}><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr>{['Folio', 'Código', 'Modelo', 'Estado', 'Negocio'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
      <tbody>{rows.map(t => <tr key={t.id} onClick={() => setSel(t)} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"><td className="p-3 font-medium">{t.folio}</td><td className="p-3">{t.public_code}</td><td className="p-3">{t.models?.name}</td><td className="p-3">{t.status}</td><td className="p-3">{t.businesses?.trade_name || '—'}</td></tr>)}</tbody></table></div>
    <div className="flex items-center gap-3 text-sm"><button className={btn2} disabled={!pg} onClick={() => setPg(pg - 1)}>←</button>{pg + 1} / {Math.max(1, Math.ceil(n / 20))} ({n})<button className={btn2} disabled={(pg + 1) * 20 >= n} onClick={() => setPg(pg + 1)}>→</button></div>
    {sel && <Detail t={sel} onClose={() => setSel(null)} onSaved={() => { setSel(null); load() }} />}</div>
}

function Detail({ t, onClose, onSaved }: { t: Tag; onClose: () => void; onSaved: () => void }) {
  const [svg, setSvg] = useState(''), [bs, setBs] = useState<Business[]>([]), [biz, setBiz] = useState(t.business_id || ''), [nb, setNb] = useState(''), [url, setUrl] = useState(t.destination_url || ''), [status, setStatus] = useState(t.status), [notes, setNotes] = useState(t.notes || ''), [err, setErr] = useState('')
  useEffect(() => { qrSvg(t.public_code).then(setSvg); sb.from('businesses').select('*').order('trade_name').then(({ data }) => setBs((data as Business[]) || [])) }, [])
  const onBiz = (id: string) => { setBiz(id); const b = bs.find(x => x.id === id); if (b?.google_review_url && !url) setUrl(b.google_review_url) }
  const go = async () => {
    setErr(''); if (url && !isGoogleUrl(url)) return setErr('Solo enlaces HTTPS de Google (Maps / reseñas).')
    let bid = biz; if (!bid && nb.trim()) { const { data, error } = await sb.from('businesses').insert({ trade_name: nb.trim(), google_review_url: url || null }).select().single(); if (error) return setErr(error.message); bid = data.id }
    const { error } = await sb.from('tags').update({ business_id: bid || null, destination_url: url || null, notes, status: bid && url && status === 'disponible' ? 'asignado' : status, ...(bid && url && t.status === 'disponible' ? { assigned_at: new Date().toISOString() } : {}) }).eq('id', t.id)
    if (error) return setErr(error.message); onSaved() }
  return <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-10"><div className={`${card} w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-3`}>
    <div className="flex justify-between"><b>{t.folio}</b><button onClick={onClose}><X size={18} /></button></div>
    <div className="text-xs text-slate-500">URL para NFC / QR</div>
    <div className="flex gap-2"><input readOnly className={inp} value={tagUrl(t.public_code)} /><button className={btn2} onClick={() => navigator.clipboard.writeText(tagUrl(t.public_code))}><Copy size={16} /></button></div>
    <div className="w-40 mx-auto" dangerouslySetInnerHTML={{ __html: svg }} />
    <div className="flex gap-2 justify-center"><button className={btn2} onClick={() => save(`${t.folio}.svg`, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))}><Download size={14} className="inline" /> SVG</button><button className={btn2} onClick={async () => save(`${t.folio}.png`, await qrPng(t.public_code))}><Download size={14} className="inline" /> PNG</button><a className={btn2} target="_blank" href={tagUrl(t.public_code)}>Probar</a></div>
    <select className={inp} value={biz} onChange={e => onBiz(e.target.value)}><option value="">— Negocio —</option>{bs.map(b => <option key={b.id} value={b.id}>{b.trade_name}</option>)}</select>
    {!biz && <input className={inp} placeholder="…o nuevo negocio (nombre comercial)" value={nb} onChange={e => setNb(e.target.value)} />}
    <input className={inp} placeholder="Enlace de reseñas de Google (https://…)" value={url} onChange={e => setUrl(e.target.value)} />
    <select className={inp} value={status} onChange={e => setStatus(e.target.value)}>{ST.map(s => <option key={s}>{s}</option>)}</select>
    <textarea className={inp} placeholder="Observaciones" value={notes} onChange={e => setNotes(e.target.value)} />
    {err && <p className="text-sm text-red-600">{err}</p>}<button className={btn} onClick={go}>Guardar</button></div></div>
}

function Batch() {
  const [ms, setMs] = useState<{ id: string; name: string }[]>([]), [m, setM] = useState(''), [qty, setQty] = useState(50), [notes, setNotes] = useState(''), [bs, setBs] = useState<any[]>([]), [o, setO] = useState({ size: 30, margin: 10, gap: 6 }), [msg, setMsg] = useState(''), [nm, setNm] = useState('')
  const load = async () => { const a = (await sb.from('models').select('*')).data || []; setMs(a); if (!m && a[0]) setM(a[0].id); setBs((await sb.from('batches').select('*, models(name)').order('created_at', { ascending: false }).limit(20)).data || []) }
  useEffect(() => { load() }, [])
  const pdf = async (id: string) => { const { data } = await sb.from('tags').select('*').eq('batch_id', id).order('folio').limit(1000); await batchPdf((data as Tag[]) || [], o) }
  const mk = async () => { setMsg('Generando…'); const { data, error } = await sb.rpc('create_batch', { p_model: m, p_qty: qty, p_notes: notes || null }); if (error) return setMsg(error.message); setMsg('Lote creado'); await load(); pdf(data) }
  const mm = async () => { if (nm.trim()) { await sb.from('models').insert({ name: nm.trim() }); setNm(''); load() } }
  return <div className="space-y-4"><h2 className="text-2xl font-bold text-[#0b1f3a]">Generar lote</h2>
    <div className={card + ' grid md:grid-cols-2 gap-3'}>
      <select className={inp} value={m} onChange={e => setM(e.target.value)}>{ms.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <input className={inp} type="number" min={1} max={1000} value={qty} onChange={e => setQty(+e.target.value)} />
      <input className={inp} placeholder="Notas del lote" value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="flex gap-2"><input className={inp} placeholder="Nuevo modelo" value={nm} onChange={e => setNm(e.target.value)} /><button className={btn2} onClick={mm}>+</button></div>
      {(['size', 'margin', 'gap'] as const).map(k => <label key={k} className="text-xs text-slate-500">{{ size: 'Tamaño QR (mm)', margin: 'Margen (mm)', gap: 'Separación (mm)' }[k]}<input className={inp} type="number" value={o[k]} onChange={e => setO({ ...o, [k]: +e.target.value })} /></label>)}
      <button className={btn} onClick={mk} disabled={!m}>Generar lote y descargar PDF</button><span className="text-sm self-center">{msg}</span></div>
    <div className={card}>{bs.map(b => <div key={b.id} className="flex justify-between text-sm py-1 border-b border-slate-100"><span>#{b.batch_number} · {b.quantity} · {b.models?.name} · {new Date(b.created_at).toLocaleDateString()}</span><button className={btn2} onClick={() => pdf(b.id)}>PDF</button></div>)}</div></div>
}

function Businesses() {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [l, setL] = useState<Business[]>([]), [f, setF] = useState<Partial<Business>>({}), [err, setErr] = useState('')
  const load = async () => setL(((await sb.from('businesses').select('*, tags(folio)').order('trade_name')).data as Business[]) || [])
  useEffect(() => { load() }, [])
  const remove = async (b: Business) => {
    setErr('')
    if (b.tags?.length) return setErr('Este negocio tiene carteles vinculados. Reasígnalos o desvincúlalos desde Inventario NFC antes de eliminarlo.')
    if (!window.confirm(`¿Eliminar el negocio "${b.trade_name}"? Esta acción no se puede deshacer.`)) return
    setDeleting(b.id)
    try {
      const { data, error } = await sb.from('businesses').delete().eq('id', b.id).select('id')
      if (error) return setErr(error.code === '23503' ? 'El negocio tiene carteles vinculados. Desvincúlalos desde Inventario NFC antes de eliminarlo.' : error.message)
      if (!data?.length) return setErr('No se pudo eliminar el negocio. Comprueba que tengas permisos de administrador y actualiza la página.')
      if (f.id === b.id) setF({})
      await load()
    } catch {
      setErr('No se pudo conectar. Intenta eliminar el negocio de nuevo.')
    } finally {
      setDeleting(null)
    }
  }
  const go = async () => {
    setErr(''); if (!f.trade_name) return setErr('Nombre comercial requerido'); if (f.google_review_url && !isGoogleUrl(f.google_review_url)) return setErr('Enlace de Google no válido')
    const { tags, ...v } = f as Business; const r = f.id ? await sb.from('businesses').update(v).eq('id', f.id) : await sb.from('businesses').insert(v)
    if (r.error) return setErr(r.error.message); setF({}); load() }
  const F = [['trade_name', 'Nombre comercial'], ['contact_name', 'Contacto'], ['phone', 'Teléfono'], ['email', 'Correo'], ['address', 'Dirección (opcional)'], ['google_review_url', 'Enlace de reseñas de Google'], ['notes', 'Observaciones']] as const
  return <div className="space-y-4"><h2 className="text-2xl font-bold text-[#0b1f3a]">Clientes / Negocios</h2>
    <div className={card + ' grid md:grid-cols-2 gap-3'}>{F.map(([k, p]) => <input key={k} className={inp} placeholder={p} value={(f as any)[k] || ''} onChange={e => setF({ ...f, [k]: e.target.value })} />)}
      {err && <p className="text-sm text-red-600">{err}</p>}<button className={btn} onClick={go}>{f.id ? 'Actualizar' : 'Registrar'}</button></div>
    <div className={card}>{l.map(b => <div key={b.id} className="py-2 border-b border-slate-100 text-sm flex items-center gap-3"><button type="button" onClick={() => { setF(b); setErr('') }} className="flex-1 text-left"><b>{b.trade_name}</b> · {b.contact_name} · {b.phone}<div className="text-slate-500">Carteles: {b.tags?.map(t => t.folio).join(', ') || '—'}</div></button><button type="button" className={btn2 + ' text-red-600'} disabled={deleting !== null} onClick={() => remove(b)}>{deleting === b.id ? 'Eliminando…' : 'Eliminar'}</button></div>)}</div></div>
}
