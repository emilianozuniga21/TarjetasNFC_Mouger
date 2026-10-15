import { useEffect, useRef, useState } from 'react'

export function qrCodeFromText(value: string): string | null {
  const text = value.trim()
  if (/^[A-HJ-NP-Z2-9]{10}$/i.test(text)) return text.toUpperCase()
  try {
    const url = new URL(text)
    if (!['https:', 'http:'].includes(url.protocol)) return null
    const match = url.pathname.match(/^\/r\/([A-HJ-NP-Z2-9]{10})\/?$/i)
    return match ? match[1].toUpperCase() : null
  } catch { return null }
}

export default function QrScanner({ onClose, onDetected }: { onClose: () => void; onDetected: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [value, setValue] = useState('')
  const detected = useRef(onDetected)
  detected.current = onDetected

  useEffect(() => {
    let cancelled = false
    let finished = false
    let stop: (() => void) | undefined
    const start = async () => {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        if (cancelled || !video.current) return
        const controls = await new BrowserQRCodeReader().decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          video.current,
          (result, _error, controls) => {
            if (cancelled || finished || !result) return
            const code = qrCodeFromText(result.getText())
            if (!code) { setError('Este QR no contiene un código de cartel válido.'); return }
            finished = true
            controls.stop()
            detected.current(code)
          },
        )
        stop = () => controls.stop()
        if (cancelled || finished) stop()
      } catch {
        if (!cancelled) setError('No se pudo abrir la cámara. Permite el acceso en tu navegador o pega el enlace del QR abajo.')
      }
    }
    start()
    return () => { cancelled = true; stop?.() }
  }, [])

  return <div className="mobile-dialog fixed inset-0 bg-black/50 grid place-items-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
    <div className="rounded-2xl bg-white p-5 w-full max-w-lg max-h-[90dvh] overflow-y-auto space-y-3">
      <div className="flex justify-between items-center"><h2 id="scanner-title" className="font-bold">Escanear QR del cartel</h2><button type="button" onClick={onClose} className="px-3 py-2">Cerrar</button></div>
      <p className="text-sm text-slate-600">Apunta al QR impreso para abrir su ficha y asignarle un negocio.</p>
      <video ref={video} muted playsInline className="w-full max-h-72 rounded-lg bg-black" />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <form className="space-y-2" onSubmit={event => {
        event.preventDefault()
        const code = qrCodeFromText(value)
        if (!code) { setError('Pega el enlace completo del QR o su código de 10 caracteres.'); return }
        detected.current(code)
      }}>
        <label htmlFor="qr-link" className="text-sm">También puedes pegar el enlace o código del QR</label>
        <input id="qr-link" className="w-full rounded-lg border px-3 py-2 text-sm" value={value} onChange={event => setValue(event.target.value)} placeholder="https://…/r/XXXXXXXXXX" />
        <button className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm">Buscar cartel</button>
      </form>
    </div>
  </div>
}
