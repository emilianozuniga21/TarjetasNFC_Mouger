import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
export { isGoogleUrl } from '../shared/google'
export const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
export const BASE = ((import.meta.env.VITE_PUBLIC_BASE_URL as string) || location.origin).replace(/\/$/, '')
export const tagUrl = (c: string) => `${BASE}/r/${c}`
export type Tag = { id: string; folio: string; public_code: string; status: string; business_id: string | null; destination_url: string | null; notes: string | null; manufactured_at: string; businesses?: { trade_name: string } | null; models?: { name: string } | null }
export type Business = { id: string; trade_name: string; contact_name: string | null; phone: string | null; email: string | null; address: string | null; google_review_url: string | null; notes: string | null; tags?: { folio: string }[] }
export const qrSvg = (c: string) => QRCode.toString(tagUrl(c), { type: 'svg', errorCorrectionLevel: 'Q', margin: 2 })
export const qrPng = (c: string, w = 1024) => QRCode.toDataURL(tagUrl(c), { errorCorrectionLevel: 'Q', margin: 2, width: w })
export function save(name: string, href: string) { const a = document.createElement('a'); a.href = href; a.download = name; a.click() }
export async function batchPdf(tags: Tag[], o: { size: number; margin: number; gap: number }) {
  const { jsPDF } = await import('jspdf'); const d = new jsPDF({ unit: 'mm', format: 'a4' })
  const cell = o.size + o.gap, lh = 6
  const cols = Math.max(1, Math.floor((210 - 2 * o.margin + o.gap) / cell)), rows = Math.max(1, Math.floor((297 - 2 * o.margin + o.gap) / (cell + lh)))
  for (let i = 0; i < tags.length; i++) {
    const k = i % (cols * rows); if (i && k === 0) d.addPage()
    const x = o.margin + (k % cols) * cell, y = o.margin + Math.floor(k / cols) * (cell + lh)
    d.addImage(await qrPng(tags[i].public_code, 600), 'PNG', x, y, o.size, o.size)
    d.setFontSize(8); d.text(`${tags[i].folio}  ${tags[i].public_code}`, x, y + o.size + 4)
  }
  d.save('lote-qr.pdf')
}
