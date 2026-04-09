@AGENTS.md

# PetStock — App interna de gestión de ventas

App interna para una empresa que vende comida para perros y gatos (marca Maxiene). Gestiona clientes, predice cuándo se termina cada bolsa y envía alertas via Telegram.

**Stack:** Next.js 16 (App Router) + Supabase + Vercel + Telegram Bot API + Claude API + Google Sheets API

---

## Estado actual

**Subsistema 1 completo** (login + dashboard + CRM + bot Telegram + cron alertas).

### Rutas implementadas
- `/` — Landing page (existente, no tocar)
- `/login` — Login equipo interno (Supabase Auth)
- `/dashboard` — Dashboard principal: PieChart meta de ventas + lista alertas + tabla CRM
- `/dashboard/clientes/new` — Formulario nueva venta
- `/dashboard/clientes/[id]` — Ver historial de un cliente
- `/ideas` — Placeholder subsistema 2
- `/agente-meta` — Placeholder subsistema 3
- `/creacion-contenido` — Placeholder subsistema 4
- `/api/auth/signout` — Logout
- `/api/ventas/sheets` — Sincroniza venta a Google Sheets
- `/api/telegram-webhook` — Recibe mensajes del bot (POST)
- `/api/cron/alertas` — Cron job diario 09:00 Uruguay (GET, protegido con CRON_SECRET)

### Archivos clave
- `src/proxy.ts` — Protección de rutas (Next.js 16: se llama proxy, NO middleware)
- `src/lib/supabase/client.ts` — Cliente browser
- `src/lib/supabase/server.ts` — Cliente server (usa cookies)
- `src/lib/calculations.ts` — Lógica fecha_estimada_fin (perros y gatos)
- `src/lib/claude-parser.ts` — Parsea mensajes Telegram con Claude API
- `src/lib/telegram.ts` — Envía mensajes via Telegram HTTP API
- `src/lib/google-sheets.ts` — Append filas a Google Sheets (Service Account)
- `src/components/dashboard/sidebar.tsx` — Sidebar con PieChart + alertas
- `src/components/dashboard/crm-table.tsx` — Tabla CRM con búsqueda y filtro especie
- `src/components/forms/nueva-venta-form.tsx` — Formulario nueva venta (lookup-or-create)

---

## Base de datos (Supabase)

Tablas: `clientes`, `perros`, `ventas`, `tabla_gramos`

- `tabla_gramos` — Solo perros. Datos de referencia Maxiene para sugerir gramos/día.
- `perros.intervalo_compra_dias` — Solo gatos. Se calcula en la 2da compra.
- `ventas.alerta_enviada` — Se marca `true` cuando se envía la alerta de Telegram. Cada venta nueva arranca en `false`.
- `ventas.fecha_estimada_fin` — Puede ser null (gatos primera compra sin fecha).

Schema en: `../supabase/migrations/001_initial_schema.sql`
Seed en: `../supabase/seed.sql` (datos tabla_gramos — reemplazar con tabla real Maxiene)

---

## Lógica de negocio importante

**Perros:** `gramos_por_dia = gramos_por_comida × veces_al_dia` → `dias = floor((kg×1000) / g_por_dia)` → `fecha_fin = fecha_venta + dias`

**Gatos primera compra:** `fecha_estimada_fin` es opcional. Sin fecha = sin alerta.

**Gatos compras siguientes:** `intervalo = fecha_nueva - fecha_anterior`. El sistema pre-rellena la fecha y guarda el intervalo en `perros.intervalo_compra_dias`.

**Meta de ventas:** `SUM(ventas.precio)` de TODAS las ventas históricas. Meta fija: $102.000 UYU. No se reinicia por mes.

**Bot Telegram:** Single-turn. Si faltan datos, el bot pide TODO lo que falta en un solo mensaje y espera que el usuario lo reenvíe completo.

---

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_IDS=          # Comma-separated, ej: 123456789,987654321 (también acepta TELEGRAM_CHAT_ID para un solo ID)
ANTHROPIC_API_KEY=
GOOGLE_SHEETS_CREDENTIALS=   # JSON del Service Account (string escapado)
GOOGLE_SHEETS_ID=
CRON_SECRET=
```

---

## Convenciones Next.js 16

- `proxy.ts` en lugar de `middleware.ts` (renombrado en v16)
- `params` en Server Components es `Promise<{ id: string }>` → requiere `await params`
- Turbopack es el bundler por defecto (incluso en `next build`)
- Google Fonts via `next/font/google` requiere red durante build — si buildás sin red, usar fuentes locales o eliminar el import

---

## Subsistemas pendientes

- **Subsistema 2 `/ideas`:** Lista de notas + grabación de audio → transcripción con Whisper API
- **Subsistema 3 `/agente-meta`:** Integración Meta Ads (solo front por ahora)
- **Subsistema 4 `/creacion-contenido`:** Chat con Claude, system prompt editable, especializado en contenido para redes
