# Mouger NFC Manager
1. Supabase (gratis): crea proyecto, ejecuta `supabase/migration.sql`, crea tu usuario en Auth (desactiva registro público) y ejecuta el `insert into admins` del final.
2. `cp .env.example .env`, completa y `npm i && npm run dev`.
3. Deploy en Cloudflare Workers: build `npm run build`, deploy `npx wrangler deploy`. La configuración está en `wrangler.jsonc`; su `name` debe coincidir con el Worker del panel.
   - En **Build → Variables and secrets**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_PUBLIC_BASE_URL` (la URL pública del Worker, sin barra final).
   - En **Settings → Variables and secrets**: `SUPABASE_URL` y `SUPABASE_ANON_KEY`, para resolver las redirecciones `/r/CODIGO`.
   - Usa la clave pública anon de Supabase, nunca la clave service_role en variables `VITE_*`.
   - Después de cambiar variables de compilación, vuelve a ejecutar el build.
   - `functions/` conserva la implementación anterior de Pages; Workers usa `worker/index.ts`.
4. Supabase gratis se pausa tras ~7 días sin uso: programa un ping o pasa a Pro antes de vender.
5. Sin dominio propio: la URL `*.workers.dev` queda impresa en cada QR/NFC. No la cambies después.
