# Mouger NFC Manager
1. Supabase (gratis): crea proyecto, ejecuta `supabase/migration.sql`, crea tu usuario en Auth (desactiva registro público) y ejecuta el `insert into admins` del final.
2. `cp .env.example .env`, completa y `npm i && npm run dev`.
3. Deploy en Cloudflare Pages (gratis, uso comercial permitido): build `npm run build`, salida `dist`. Variables: `VITE_*` y, para la función `functions/r/[code].ts`, `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Pon en `VITE_PUBLIC_BASE_URL` tu URL `*.pages.dev`.
4. Supabase gratis se pausa tras ~7 días sin uso: programa un ping o pasa a Pro antes de vender.
5. Sin dominio propio: la URL `*.pages.dev` queda impresa en cada QR/NFC. No la cambies después.
